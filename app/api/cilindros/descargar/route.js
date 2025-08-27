import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";

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

    // Agrega el item a cargaItemIds si no está
    if (!rutaDespacho.cargaItemIds.some(id => id.equals(item._id))) {
        rutaDespacho.cargaItemIds.push(item._id);
    }

    // Agrega al historial de carga como descarga
    rutaDespacho.historialCarga.push({
        esCarga: false,
        fecha: new Date(),
        itemMovidoIds: [item._id]
    });

    await rutaDespacho.save();

    return NextResponse.json({ ok: true, rutaDespachoId, itemId: item._id });
}