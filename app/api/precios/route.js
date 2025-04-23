import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Precio from "@/models/precio";
import { USER_ROLE } from "@/app/utils/constants";
import Cliente from "@/models/cliente";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching clients...");
    const clients = await Cliente.find().lean();
    console.log(`Fetched ${clients.length} clients`);

    console.log("Mapping clients with precios...");
    const clientsWithPrecios = await Promise.all(clients.map(async client => {
        const precios = await Precio.find({ clienteId: client._id }).sort({ fechaDesde: -1 }).lean();

        const preciosWithDetails = precios.map(precio => ({
            valor: precio.valor,
            moneda: precio.moneda,
            fechaDesde: precio.fechaDesde,
            fechaHasta: precio.fechaHasta,
            valorBruto: precio.valorBruto,
            impuesto: precio.impuesto,
            historial: precio.historial,
            subcategoriaCatalogoId: precio.subcategoriaCatalogoId,
            dependenciaId: precio.dependenciaId,
            sucursalId: precio.sucursalId
        }));

        return { 
            cliente: { 
                nombre: client.nombre, 
                _id: client._id, 
                rut: client.rut 
            },
            precios: preciosWithDetails 
        };
    }));

    console.log("Returning clients with precios");
    return NextResponse.json(clientsWithPrecios);
}

export async function POST(req) {
    const body = await req.json();
    await connectMongoDB();

    const precioData = {
        itemCatalogoId: body.itemCatalogoId,
        usuarioId: body.usuarioId,
        dependenciaId: body.dependenciaId || null,
        sucursalId: body.sucursalId || null,
        valorBruto: body.valorBruto,
        impuesto: body.impuesto,
        moneda: body.moneda,
        valor: body.valor,
        fechaDesde: new Date(body.fechaDesde),
        fechaHasta: body.fechaHasta ? new Date(body.fechaHasta) : null,
        historial: body.historial || []
    };

    const precioUpdated = await Precio.findOneAndUpdate(
        { usuarioId: body.usuarioId, itemCatalogoId: body.itemCatalogoId },
        precioData,
        { new: true, upsert: true }
    );

    if (!precioUpdated) {
        return NextResponse.json({ error: "Error updating precio" }, { status: 404 });
    }

    return NextResponse.json(precioUpdated);
}