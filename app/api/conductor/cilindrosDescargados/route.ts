import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import { ICilindroView } from "@/components/prefabs/types";
import { IRutaDespacho } from "@/types/rutaDespacho";

export async function GET(request: NextRequest) {
    try {
        console.log("GET request received for cilindros descargados.");
        
        // Obtener rutaId de query parameters
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        // Registrar modelos si no están registrados
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }        
        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
        }

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId).lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id) {
            console.warn("User doesn't have access to this ruta");
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Obtener los IDs de cilindros descargados del historial más reciente
        const historialDescarga = rutaDespacho.historialCarga || [];
        const ultimaDescarga = historialDescarga
            .filter(item => item.esCarga === false)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

        const cilindrosDescargadosIds = ultimaDescarga?.itemMovidoIds || [];

        if (cilindrosDescargadosIds.length === 0) {
            console.log("No hay cilindros descargados");
            return NextResponse.json({ 
                ok: true, 
                cilindrosDescargados: [],
                total: 0
            });
        }

        // Obtener los cilindros descargados con populate
        const cilindrosDescargados = await ItemCatalogo.find({
            _id: { $in: cilindrosDescargadosIds }
        })
        .populate({
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "_id cantidad unidad nombreGas sinSifon",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "_id elemento esIndustrial esMedicinal"
            }
        })
        .lean();

        // Transformar a ICilindroView
        const cilindrosDescargadosView: ICilindroView[] = cilindrosDescargados.map((item: any) => {
            const subcategoria = item.subcategoriaCatalogoId;
            const categoria = subcategoria?.categoriaCatalogoId;
            
            return {
                _id: item._id.toString(),
                subcategoriaCatalogoId: subcategoria?._id?.toString() || "",
                cantidad: subcategoria?.cantidad || 0,
                unidad: subcategoria?.unidad || "",
                nombreGas: subcategoria?.nombreGas || "",
                sinSifon: subcategoria?.sinSifon || false,
                elemento: categoria?.elemento || "",
                esIndustrial: categoria?.esIndustrial || false,
                esMedicinal: categoria?.esMedicinal || false,
                vencido: false
            } as ICilindroView;
        });

        console.log(`Returning ${cilindrosDescargadosView.length} cilindros descargados`);
        return NextResponse.json({ 
            ok: true, 
            cilindrosDescargados: cilindrosDescargadosView,
            total: cilindrosDescargadosView.length
        });

    } catch (error) {
        console.error("ERROR in cilindros descargados:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}