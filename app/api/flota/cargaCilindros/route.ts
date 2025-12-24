import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { IItemCatalogo } from "@/types/itemCatalogo";

export async function GET(req: Request) {
    try {
        await connectMongoDB();

        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
        }
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }
        const { searchParams } = new URL(req.url);
        const vehiculoId = searchParams.get("vehiculoId");

        console.log("Received vehiculoId:", vehiculoId);

        if (vehiculoId == null) {
            return NextResponse.json({ error: "Missing vehiculoId parameter" }, { status: 400 });
        }

        // Verificar que el vehículo existe y tiene conductores asignados
        const vehiculo = await Vehiculo.findById(vehiculoId).select("choferIds");
        
        if (!vehiculo) {
            return NextResponse.json({ error: "Vehiculo not found" }, { status: 404 });
        }

        if (!vehiculo.choferIds || vehiculo.choferIds.length === 0) {
            return NextResponse.json({ error: "No conductores asignados al vehiculo" }, { status: 400 });
        }

        // Buscar la ruta de despacho activa para el vehículo
        const rutaDespacho = await RutaDespacho.findOne({ 
            vehiculoId: vehiculoId,
            estado: { $nin: [
                TIPO_ESTADO_RUTA_DESPACHO.a_reasignar, 
                TIPO_ESTADO_RUTA_DESPACHO.cancelado, TIPO_ESTADO_RUTA_DESPACHO.anulado,
                TIPO_ESTADO_RUTA_DESPACHO.terminado
            ]} 
        }).populate({
            path: "cargaItemIds",
            model: "ItemCatalogo",
            populate: {
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo"
                }
            }
        });

        if (!rutaDespacho) {
            return NextResponse.json({ ok: true, cilindros: [] });
        }

        // Mapear los items a cilindros
        const cilindros = rutaDespacho.cargaItemIds.map((item: IItemCatalogo) => ({
            elementos: item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || "",
            peso: item.subcategoriaCatalogoId?.cantidad || 0,
            altura: 0, // No disponible en el modelo actual
            radio: 0,  // No disponible en el modelo actual
            sinSifon: item.subcategoriaCatalogoId?.sinSifon || false,
            esIndustrial: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false,
            esMedicinal: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esMedicinal || false,
            estado: item.estado || 0
        }));

        return NextResponse.json({ ok: true, cilindros });

    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}