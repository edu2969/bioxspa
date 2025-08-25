import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente"; // Asumiendo que existe el modelo Cliente
import Direccion from "@/models/direccion";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET(request) {
    await connectMongoDB();

    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    // Busca el cliente
    const cliente = await Cliente.findById(clienteId).lean();
    if (!cliente) {
        return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
    }   

    // Obtiene los IDs de direcciones de despacho del cliente
    const despachoIds = cliente.direccionesDespacho?.map(d => d.direccionId) || [];

    // Busca items del catálogo cuya direccionId coincida con alguna dirección de despacho
    const items = await (
        despachoIds.length > 0
            ? ItemCatalogo.find({ direccionId: { $in: despachoIds } })
                .populate({
                    path: "subcategoriaCatalogoId",
                    select: "cantidad unidad sinSifon categoriaCatalogoId",
                    populate: {
                        path: "categoriaCatalogoId",
                        select: "esIndustrial codigo elemento"
                    }
                })
                .lean()
            : []
    );

    // Adorna los items con los datos requeridos
    const cilindros = items.map(item => ({
        _id: item._id,
        codigo: item.codigo,
        elemento: item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || null,
        cantidad: item.subcategoriaCatalogoId?.cantidad || null,
        unidad: item.subcategoriaCatalogoId?.unidad || null,
        sinSifon: item.subcategoriaCatalogoId?.sinSifon || false,
        esIndustrial: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false        
    }));

    // Respuesta
    return NextResponse.json({
        ok: true,
        cilindros
    });
}