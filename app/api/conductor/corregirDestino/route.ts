import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import RutaDespacho from "@/models/rutaDespacho";
import { USER_ROLE, TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request: NextRequest) {
    try {
        console.log("[corregirDestino] Connecting to MongoDB...");
        await connectMongoDB();

        // Get rutaId from request
        const { rutaId } = await request.json();
        console.log("[corregirDestino] Received rutaId:", rutaId);

        // Validate rutaId
        if (!rutaId) {
            console.warn("[corregirDestino] rutaId is missing in request");
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        console.log("[corregirDestino] Session:", session);

        if (!session || !session.user) {
            console.warn("[corregirDestino] Unauthorized access attempt");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log("[corregirDestino] User ID from session:", userId);

        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        console.log("[corregirDestino] User found:", user);

        if (!user) {
            console.warn("[corregirDestino] User not found:", userId);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        // Verify user has the conductor role
        if (user.role !== USER_ROLE.conductor) {
            console.warn("[corregirDestino] User does not have conductor role:", user.role);
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
        console.log("[corregirDestino] Cargo found:", cargo);

        if (!cargo) {
            console.warn("[corregirDestino] User is not an active conductor:", userId);
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findById(rutaId);
        console.log("[corregirDestino] RutaDespacho found:", rutaDespacho);

        if (!rutaDespacho) {
            console.warn("[corregirDestino] RutaDespacho not found:", rutaId);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            console.warn("[corregirDestino] User is not the assigned driver for this route:", userId);
            return NextResponse.json({ 
                ok: false, 
                error: "User is not the assigned driver for this route" 
            }, { status: 403 });
        }

        // Get current date
        const now = new Date();
        console.log("[corregirDestino] Current date:", now);

        // Find the last ruta element with fechaArribo null and set it to null
        const lastRouteIndex = rutaDespacho.ruta.findLastIndex((ruta: any) => ruta.fechaArribo === null);
        
        if (lastRouteIndex === -1) {
            console.warn("[corregirDestino] No route with null fechaArribo found");
            return NextResponse.json({ 
                ok: false, 
                error: "No pending destination found to correct" 
            }, { status: 400 });
        }

        console.log("[corregirDestino] Found route to correct at index:", lastRouteIndex);

        // Update the route: set estado to seleccion_destino, add to historial, and set fechaArribo to null
        const update = {
            estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
            $push: { 
                historialEstado: { 
                    estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino, 
                    fecha: now 
                }
            },
            $set: {
                [`ruta.${lastRouteIndex}.fechaArribo`]: null
            }
        };

        await RutaDespacho.findByIdAndUpdate(rutaId, update);

        console.log("[corregirDestino] Destination corrected successfully for rutaId:", rutaId);

        return NextResponse.json({
            ok: true,
            message: "Destination corrected successfully" 
        });
        
    } catch (error) {
        console.error("Error in POST /corregirDestino:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}