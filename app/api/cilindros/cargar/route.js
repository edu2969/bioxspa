import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";

// filepath: d:/git/bioxspa/app/api/cilindros/cargar/route.js

export async function POST(request) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaDespachoId, itemId } = body;

    if (!rutaDespachoId || !itemId) {
        console.log("Missing rutaDespachoId or itemId", { rutaDespachoId, itemId });
        return NextResponse.json({ ok: false, error: "Missing rutaDespachoId or itemId" }, { status: 400 });
    }

    // Verifica que el item exista
    const item = await ItemCatalogo.findById(itemId).select("_id").lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    // Busca la ruta de despacho
    const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
    if (!rutaDespacho) {
        return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
    }

    // Agrega el item a cargaItemIds si no está
    if (!rutaDespacho.cargaItemIds.some(id => id.equals(item._id))) {
        rutaDespacho.cargaItemIds.push(item._id);
    }

    // Obtiene el historial más reciente
    const lastHistorial = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1];

    if (lastHistorial && lastHistorial.esCarga) {
        // Si el item ya existe en itemMovidoIds, arroja error
        if (lastHistorial.itemMovidoIds.some(id => id.equals(item._id))) {
            return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
        }
        // Si no, agrega el item a itemMovidoIds
        lastHistorial.itemMovidoIds.push(item._id);
    } else {
        // Si no hay historial reciente de carga, agrega uno nuevo
        rutaDespacho.historialCarga.push({
            esCarga: true,
            fecha: new Date(),
            itemMovidoIds: [item._id]
        });
    }

    await rutaDespacho.save();

    return NextResponse.json({ ok: true, rutaDespachoId, itemId: item._id });
}