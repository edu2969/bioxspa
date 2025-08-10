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
        console.log("[confirmarArribo] Connecting to MongoDB...");
        await connectMongoDB();

        // Get rutaId from request
        const { rutaId } = await request.json();
        console.log("[confirmarArribo] Received rutaId:", rutaId);

        // Validate rutaId
        if (!rutaId) {
            console.warn("[confirmarArribo] rutaId is missing in request");
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        console.log("[confirmarArribo] Session:", session);

        if (!session || !session.user) {
            console.warn("[confirmarArribo] Unauthorized access attempt");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log("[confirmarArribo] User ID from session:", userId);

        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        console.log("[confirmarArribo] User found:", user);

        if (!user) {
            console.warn("[confirmarArribo] User not found:", userId);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        // Verify user has the conductor role
        if (user.role !== USER_ROLE.conductor) {
            console.warn("[confirmarArribo] User does not have conductor role:", user.role);
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
        console.log("[confirmarArribo] Cargo found:", cargo);

        if (!cargo) {
            console.warn("[confirmarArribo] User is not an active conductor:", userId);
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findById(rutaId);
        console.log("[confirmarArribo] RutaDespacho found:", rutaDespacho);

        if (!rutaDespacho) {
            console.warn("[confirmarArribo] RutaDespacho not found:", rutaId);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            console.warn("[confirmarArribo] User is not the assigned driver for this route:", userId);
            return NextResponse.json({ 
                ok: false, 
                error: "User is not the assigned driver for this route" 
            }, { status: 403 });
        }

        // Get current date
        const now = new Date();
        console.log("[confirmarArribo] Current date:", now);

        // Update the route: set estado to descarga and update fechaArribo for the first null element
        // Update estado and historialEstado
        console.log("[confirmarArribo] Updating estado and historialEstado for rutaDespacho:", rutaId);
        // Update estado, historialEstado, and fechaArribo of the last element in ruta array in one operation
        const update = {
            estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
            $push: { 
            historialEstado: { 
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga, 
                fecha: now 
            }
            },
            // Use $set to update the fechaArribo of the last element in ruta array
            $set: {}
        };

        // Get the last index of ruta array
        const lastIndex = rutaDespacho.ruta.length - 1;
        update.$set[`ruta.${lastIndex}.fechaArribo`] = now;

        await RutaDespacho.findByIdAndUpdate(rutaId, update);

        console.log("[confirmarArribo] Route arrival confirmed successfully for rutaId:", rutaId);

        return NextResponse.json({
            ok: true,
            message: "Route arrival confirmed successfully" 
        });
        
    } catch (error) {
        console.error("Error in POST /confirmarArribo:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
