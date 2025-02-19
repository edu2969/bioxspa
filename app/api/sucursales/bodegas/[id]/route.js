import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Bodega from "@/models/bodega";
import Direccion from "@/models/direccion";

export async function GET(req, { params }) {
    console.log("BODEGA getById...", params);
    await connectMongoDB();
    const bodega = await Bodega.findById(params.id);
    if (!bodega) {
        return NextResponse.json({ error: "Bodega not found" }, { status: 400 });
    }
    return NextResponse.json(bodega);
}

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("BODEGA Update...", body, params);

    await connectMongoDB();

    // Check if the address exists
    let direccion = await Direccion.findOne({ apiId: body.place_id });
    if (!direccion) {
        // Create a new address if it doesn't exist
        direccion = new Direccion({
            _id: new mongoose.Types.ObjectId().toString(),
            nombre: body.direccion.nombre,
            apiId: body.place_id,
            latitud: body.direccion.latitud,
            longitud: body.direccion.longitud,
            categoria: body.direccion.categoria
        });
        await direccion.save();
    } else {
        // Update the address if it exists
        direccion.nombre = body.direccion.nombre;
        direccion.latitud = body.direccion.latitud;
        direccion.longitud = body.direccion.longitud;
        direccion.categoria = body.direccion.categoria;
        await direccion.save();
    }

    const bodegaData = {
        id: body.id,
        nombre: body.nombre,
        sucursalId: body.sucursalId,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccion._id,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };

    const bodegaUpdated = await Bodega.findByIdAndUpdate(params.id, bodegaData, { new: true, upsert: true });
    return bodegaUpdated ? NextResponse.json(bodegaUpdated) : NextResponse.json({ error: "Error updating bodega" }, { status: 404 });
}