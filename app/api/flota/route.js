import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import User from "@/models/user";

// Obtener todos los vehículos
export async function GET() {
    await connectMongoDB();

    console.log("TODOS los vehiculos");

    if (!mongoose.models.User) {
       mongoose.model("User", User.schema);
    }
    const vehiculos = await Vehiculo.find().populate('choferIds').lean();

    return NextResponse.json({ vehiculos });
}

// Actualiza o crea un vehículo
export async function POST(request) {
    await connectMongoDB();

    const data = await request.json();
    const { _id, ...vehiculoData } = data;

    try {
        let vehiculo;
        if (_id) {
            vehiculo = await Vehiculo.findByIdAndUpdate(
                _id,
                { $set: vehiculoData },
                { new: true, upsert: true }
            );
        } else {
            vehiculo = await Vehiculo.create(vehiculoData);
        }
        return NextResponse.json({ ok: true, vehiculo });
    } catch (error) {
        console.error("Error al guardar el vehículo:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}