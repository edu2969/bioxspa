import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import RutaDespacho from "@/models/rutaDespacho";
import { USER_ROLE, TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request) {
    try {
        await connectMongoDB();

        // Get rutaId from request
        const { rutaId } = await request.json();
        
        // Validate rutaId
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        
        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        // Verify user has the conductor role
        if (user.role !== USER_ROLE.conductor) {
            return NextResponse.json({ 
                ok: false, 
                error: "Insufficient permissions - requires conductor role" 
            }, { status: 403 });
        }

        // Verify the user has a conductor cargo assigned
        const cargo = await Cargo.findOne({ 
            userId: userId,
            tipo: TIPO_CARGO.conductor,
            hasta: null // Active cargo (not ended)
        });
        
        if (!cargo) {
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findById(rutaId);

        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            return NextResponse.json({ 
                ok: false, 
                error: "User is not the assigned driver for this route" 
            }, { status: 403 });
        }

        // Get current date
        const now = new Date();

        // Update the route: set estado to descarga and update fechaArribo for the first null element
        await RutaDespacho.findByIdAndUpdate(
            rutaId,
            {
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
                $push: { 
                    historialEstado: { 
                        estado: TIPO_ESTADO_RUTA_DESPACHO.descarga, 
                        fecha: now 
                    }
                }
            }
        );

        // Find the index of the first element in ruta array where fechaArribo is null
        const rutaIndex = rutaDespacho.ruta.findIndex(r => r.fechaArribo === null);
        
        if (rutaIndex >= 0) {
            // Update the fechaArribo of that specific element
            rutaDespacho.ruta[rutaIndex].fechaArribo = now;
            await rutaDespacho.save();
        }

        return NextResponse.json({ 
            ok: true, 
            message: "Route arrival confirmed successfully" 
        });
        
    } catch (error) {
        console.error("Error in POST /confirmarArribo:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
