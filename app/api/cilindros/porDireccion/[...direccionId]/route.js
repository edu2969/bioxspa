import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Cliente from "@/models/cliente";

export async function GET(request, { params }) {
    await connectMongoDB();

    const direccionId = params.direccionId?.[0];
    if (!direccionId) {
        return NextResponse.json({ ok: false, error: "direccionId is required" }, { status: 400 });
    }

    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }

    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }

    if (!mongoose.models.Cliente) {
        mongoose.model("Cliente", Cliente.schema);
    }

    // Buscar todos los cilindros (ItemCatalogo) con esa dirección
    const items = await ItemCatalogo.find({ direccionId: direccionId })
        .populate({
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "nombre cantidad unidad sinSifon nombreGas categoriaCatalogoId ownerId",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "nombre elemento esIndustrial esMedicinal"
            }
        })
        .populate({
            path: "ownerId",
            model: "Cliente",
            select: "nombre"
        })
        .lean();

    // Adornar los resultados para legibilidad
    const cilindros = items.map(item => {
        const sub = item.subcategoriaCatalogoId;
        const cat = sub?.categoriaCatalogoId;
        return {
            _id: item._id,
            codigo: item.codigo,
            nombre: item.nombre,
            descripcion: item.descripcion,
            stockActual: item.stockActual,
            visible: item.visible,
            subcategoria: sub ? {
                _id: sub._id,
                nombre: sub.nombre,
                cantidad: sub.cantidad,
                unidad: sub.unidad,
                sinSifon: sub.sinSifon,
                nombreGas: sub.nombreGas,
            } : null,
            categoria: cat ? {
                _id: cat._id,
                nombre: cat.nombre,
                elemento: cat.elemento,
                esIndustrial: cat.esIndustrial,
                esMedicinal: cat.esMedicinal,
            } : null
        };
    });

    return NextResponse.json({ ok: true, cilindros });
}