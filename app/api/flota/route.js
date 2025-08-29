import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import User from "@/models/user";

export async function GET() {
    await connectMongoDB();
    // Obtener todos los vehículos
    const vehiculos = await Vehiculo.find().lean();

    // Para cada vehículo, buscar los conductores (User) y adornar el objeto
    for (const vehiculo of vehiculos) {
        // choferIds es un array de ObjectId
        if (vehiculo.choferIds && vehiculo.choferIds.length > 0) {
            const conductores = await User.find({ _id: { $in: vehiculo.choferIds } }).lean();
            vehiculo.conductores = conductores;
        } else {
            vehiculo.conductores = [];
        }
    }

    return NextResponse.json({ vehiculos });
}