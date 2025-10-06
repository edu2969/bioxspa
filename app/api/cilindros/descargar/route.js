import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";

export async function POST(request) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaDespachoId, codigo } = body;

    if (!rutaDespachoId || !codigo) {
        return NextResponse.json({ ok: false, error: "Missing rutaDespachoId or codigo" }, { status: 400 });
    }

    // Busca el item por código
    const item = await ItemCatalogo.findOne({ codigo }).select("_id").lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    // Busca la ruta de despacho
    const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
    if (!rutaDespacho) {
        return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
    }

    // Verifica que el item pertenezca a la venta de la última dirección arribada
    const ultimaDireccion = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId;
    const venta = await Venta.findOne({ _id: { $in: rutaDespacho.ventaIds }, direccionDespachoId: ultimaDireccion }).select("_id").lean();
    const detalles = await DetalleVenta.find({ ventaId: venta._id }).select("itemCatalogoIds").lean();

    const perteneceAlCliente = detalles.some(detalle =>
        Array.isArray(detalle.itemCatalogoIds) &&
        detalle.itemCatalogoIds.some(id => String(id) === String(item._id))
    );

    if (!perteneceAlCliente) {
        toast.error(`${codigo} no pertenece a éste cliente!`);
        return;
    }

    // Agrega el item a cargaItemIds si no está
    if (!rutaDespacho.cargaItemIds.some(id => id.equals(item._id))) {
        rutaDespacho.cargaItemIds.push(item._id);
    }

    // Manejo del historial de carga/descarga
    const historial = rutaDespacho.historialCarga;
    const now = new Date();

    if (
        historial.length > 0 &&
        historial[historial.length - 1].esCarga === false
    ) {
        // Si el último es descarga, agrega el item al último movimiento
        const ultimo = historial[historial.length - 1];
        if (!ultimo.itemMovidoIds.some(id => id.equals(item._id))) {
            ultimo.itemMovidoIds.push(item._id);
            ultimo.fecha = now; // Opcional: actualiza la fecha
        }
    } else {
        // Si el último es carga o no hay historial, crea nuevo movimiento de descarga
        historial.push({
            esCarga: false,
            fecha: now,
            itemMovidoIds: [item._id]
        });
    }

    await rutaDespacho.save();

    return NextResponse.json({ ok: true, rutaDespachoId, itemId: item._id });
}