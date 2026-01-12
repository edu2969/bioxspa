import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { USER_ROLE } from "@/app/utils/constants";
import { ICilindroView } from "@/types/types";

export async function GET(request: NextRequest) {
    try {
        console.log("GET request received for cilindros cargados.");
        
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

        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId)
            .populate({
                path: "cargaItemIds",
                model: "ItemCatalogo",
                select: "_id codigo subcategoriaCatalogoId",
                populate: {
                    path: "subcategoriaCatalogoId",
                    model: "SubcategoriaCatalogo",
                    select: "_id cantidad unidad nombreGas sinSifon",
                    populate: {
                        path: "categoriaCatalogoId",
                        model: "CategoriaCatalogo",
                        select: "_id elemento esIndustrial esMedicinal"
                    }
                }
            })
            .lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id &&
            ![USER_ROLE.cobranza, 
                USER_ROLE.encargado, 
                USER_ROLE.responsable].includes(session.user.role)) {
            console.warn("User doesn't have access to this ruta", session.user.role);
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Transformar cargaItemIds a ICilindroView
        const cilindrosCargados: ICilindroView[] = (rutaDespacho.cargaItemIds || []).map((item: any) => {
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
                vencido: false // Aquí podrías implementar lógica para determinar si está vencido
            } as ICilindroView;
        });

        console.log(`Returning ${cilindrosCargados.length} cilindros cargados`);
        return NextResponse.json({ 
            ok: true, 
            cilindrosCargados,
            total: cilindrosCargados.length
        });

    } catch (error) {
        console.error("ERROR in cilindros cargados:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}