import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { IVehiculoView } from "@/types/types";

export async function GET(request: NextRequest) {
    try {
        console.log("GET request received for vehiculo asignado.");
        
        // Obtener rutaId de query parameters
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        // Registrar modelo si no está registrado
        if (!mongoose.models.Vehiculo) {
            mongoose.model("Vehiculo", Vehiculo.schema);
        }

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId)
            .populate({
                path: "vehiculoId",
                model: "Vehiculo",
                select: "_id marca modelo patente"
            })
            .lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id) {
            console.warn("User doesn't have access to this ruta");
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Verificar que hay un vehículo asignado
        if (!rutaDespacho.vehiculoId) {
            console.warn("No vehicle assigned to this ruta");
            return NextResponse.json({ ok: false, error: "No vehicle assigned" }, { status: 400 });
        }

        // Transformar vehiculo a IVehicleView
        const vehiculo = rutaDespacho.vehiculoId as any;
        const vehicleView: IVehiculoView = {
            vehiculoId: vehiculo._id.toString(),
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo
        };

        console.log(`Returning vehicle: ${vehicleView.patente}`);
        return NextResponse.json({ 
            ok: true, 
            vehiculo: vehicleView
        });

    } catch (error) {
        console.error("ERROR in vehiculo asignado:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}