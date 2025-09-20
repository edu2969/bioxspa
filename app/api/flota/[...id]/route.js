import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import User from "@/models/user";

// Se obtiene el vehículo por ID y sus choferes asociados
export async function GET(request, { params }) {
    console.log("params:", params);
    await connectMongoDB();

    if (!mongoose.models.User) {
        mongoose.model("User", User.schema);
    }
    
    const { id } = params; // id es un array por [...id]
    const vehiculoId = Array.isArray(id) ? id[0] : id;

    if (!vehiculoId) {
        return NextResponse.json({ error: "ID de vehículo no proporcionado" }, { status: 400 });
    }

    // Buscar el vehículo por ID
    const vehiculo = await Vehiculo.findById(vehiculoId).populate("choferIds").lean();
    if (!vehiculo) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    // Buscar choferes asociados al vehículo
    let choferes = [];
    if (vehiculo.choferes && vehiculo.choferes.length > 0) {
        choferes = await User.find({ _id: { $in: vehiculo.choferes } }).lean();
    }

    const choferesAdornados = choferes.map(chofer => ({
        _id: chofer._id,
        name: chofer.name,
        email: chofer.email,
        role: chofer.role,
        active: chofer.active,
        personaId: chofer.personaId,
        createdAt: chofer.createdAt,
        updatedAt: chofer.updatedAt,
    }));

    return NextResponse.json({
        vehiculo,
        choferes: choferesAdornados,
    });
}

// Se eliminar el vehículo por ID
export async function DELETE(request, { params }) {
    await connectMongoDB();

    const { id } = params;
    const vehiculoId = Array.isArray(id) ? id[0] : id;

    if (!vehiculoId) {
        return NextResponse.json({ error: "ID de vehículo no proporcionado" }, { status: 400 });
    }

    const vehiculo = await Vehiculo.findByIdAndDelete(vehiculoId);

    if (!vehiculo) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehículo eliminado correctamente" });
}