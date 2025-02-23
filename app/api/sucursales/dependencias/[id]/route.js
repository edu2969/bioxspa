import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Dependencia from "@/models/Dependencia";
import Direccion from "@/models/direccion";

export async function GET(req, { params }) {
    console.log("Dependencia getById...", params);
    await connectMongoDB();
    const dependencia = await Dependencia.findById(params.id);
    if (!dependencia) {
        return NextResponse.json({ error: "Dependencia not found" }, { status: 400 });
    }
    return NextResponse.json(dependencia);
}

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("DEPENDENCIA Update...", body, params);

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

    const dependenciaData = {
        id: body.id,
        nombre: body.nombre,
        sucursalId: body.sucursalId,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccion._id,
        clienteId: body.clientId,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };

    const dependenciaUpdated = await Dependencia.findByIdAndUpdate(params.id, dependenciaData, { new: true, upsert: true });
    return dependenciaUpdated ? NextResponse.json(dependenciaUpdated) : NextResponse.json({ error: "Error updating dependencia" }, { status: 404 });
}