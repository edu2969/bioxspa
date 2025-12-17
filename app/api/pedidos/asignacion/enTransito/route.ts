import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Direccion from "@/models/direccion";
import ItemCatalogo from "@/models/itemCatalogo";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.ItemCatalogo) {
        mongoose.model("ItemCatalogo", ItemCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.Vehiculo) {
        mongoose.model("Vehiculo", Vehiculo.schema);
    }

    const enTransito = await RutaDespacho.find({
        estado: {
            $gte: TIPO_ESTADO_RUTA_DESPACHO.en_ruta,
            $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado }
    })
    .select("ruta vehiculoId choferId cargaItemIds estado ventaIds historialCarga")
    // Poblar cada dirección de cada ruta
    .populate({
        path: "ruta.direccionDestinoId",
        model: "Direccion",
        select: "nombre"
    })
    // Poblar el vehículo asignado
    .populate({
        path: "vehiculoId",
        model: "Vehiculo",
        select: "patente marca modelo"
    })
    // Poblar el chofer asignado
    .populate({
        path: "choferId",
        model: "User",
        select: "name"
    })
    // Poblar los items de carga y su jerarquía de catálogo
    .populate({
        path: "cargaItemIds",
        model: "ItemCatalogo",
        select: "subcategoriaCatalogoId codigo nombre",
        populate: {
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "cantidad unidad sinSifon nombreGas",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "elemento esIndustrial esMedicinal"
            }
        }
    })
    .populate({
        path: "ventaIds",
        model: "Venta",
        select: "clienteId comentario direccionDespachoId estado tipo",
        populate: {
            path: "clienteId",
            model: "Cliente",
            select: "nombre"
        }
    })
    .lean();

    // Para cada ruta, poblar los detalles de venta con subcategoriaCatalogoId y cantidad
    for (const ruta of enTransito) {
        if (ruta.ventaIds && Array.isArray(ruta.ventaIds)) {
            for (const venta of ruta.ventaIds) {
                // Buscar los detalles de venta para esta venta
                const detalles = await DetalleVenta.find({ ventaId: venta._id })
                    .select("subcategoriaCatalogoId cantidad")
                    .lean();
                // Agregar los detalles al objeto venta
                venta.detalles = detalles;
            }
        }
    }

    return NextResponse.json({ enTransito });
}