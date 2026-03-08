import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request) {
    try {
        console.log("[corregirDestino] Starting request processing...");
        
        // Get rutaId from request
        const { rutaId } = await request.json();
        console.log("[corregirDestino] Received rutaId:", rutaId);

        // Validate rutaId
        if (!rutaId) {
            console.warn("[corregirDestino] rutaId is missing in request");
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Get authenticated user from Supabase
        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) {
            console.warn("[corregirDestino] Unauthorized access attempt");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log("[corregirDestino] User authenticated:", authResult.userData.id);

        // Verify the user has an active conductor cargo
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("id, tipo, usuario_id")
            .eq("usuario_id", user.id)
            .eq("tipo", TIPO_CARGO.conductor)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo) {
            console.warn("[corregirDestino] User is not an active conductor:", user.id);
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        console.log("[corregirDestino] Cargo verified:", cargo);

        // Find the rutaDespacho and verify user is assigned as driver
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select("id, chofer_id, estado")
            .eq("id", rutaId)
            .single();

        if (rutaError || !rutaDespacho) {
            console.warn("[corregirDestino] RutaDespacho not found:", rutaId);
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.chofer_id !== user.id) {
            console.warn("[corregirDestino] User is not the assigned driver for this route:", user.id);
            return NextResponse.json({ 
                ok: false, 
                error: "User is not the assigned driver for this route" 
            }, { status: 403 });
        }

        console.log("[corregirDestino] RutaDespacho verified:", rutaDespacho);

        // Find the last ruta destination with null fechaArribo
        const { data: rutaDestinos, error: destinosError } = await supabase
            .from("ruta_destinos")
            .select("id, direccion_destino_id, fecha_arribo")
            .eq("ruta_id", rutaId)
            .order("created_at", { ascending: true });

        if (destinosError) {
            console.error("[corregirDestino] Error fetching route destinations:", destinosError);
            return NextResponse.json({ ok: false, error: "Error fetching route destinations" }, { status: 500 });
        }

        // Find the last destination with null fecha_arribo
        const lastPendingDestino = rutaDestinos
            .filter(destino => destino.fecha_arribo === null)
            .pop();

        if (!lastPendingDestino) {
            console.warn("[corregirDestino] No route with null fecha_arribo found");
            return NextResponse.json({ 
                ok: false, 
                error: "No pending destination found to correct" 
            }, { status: 400 });
        }

        console.log("[corregirDestino] Found destination to correct:", lastPendingDestino.id);

        // Get current date
        const now = new Date().toISOString();
        console.log("[corregirDestino] Current timestamp:", now);

        // Start transaction-like operations
        // 1. Update route estado to seleccion_destino
        const { error: updateRutaError } = await supabase
            .from("rutas_despacho")
            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino })
            .eq("id", rutaId);

        if (updateRutaError) {
            console.error("[corregirDestino] Error updating ruta estado:", updateRutaError);
            return NextResponse.json({ ok: false, error: "Error updating route status" }, { status: 500 });
        }

        // 2. Add to historial de estados
        const { error: historialError } = await supabase
            .from("ruta_historial_estados")
            .insert({
                ruta_id: rutaId,
                estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
                fecha: now,
                usuario_id: user.id
            });

        if (historialError) {
            console.error("[corregirDestino] Error adding historial estado:", historialError);
            return NextResponse.json({ ok: false, error: "Error adding status history" }, { status: 500 });
        }

        // 3. Reset the fecha_arribo to null for the last destination
        const { error: resetDestinoError } = await supabase
            .from("ruta_destinos")
            .update({ fecha_arribo: null })
            .eq("id", lastPendingDestino.id);

        if (resetDestinoError) {
            console.error("[corregirDestino] Error resetting destination fecha_arribo:", resetDestinoError);
            return NextResponse.json({ ok: false, error: "Error resetting destination arrival time" }, { status: 500 });
        }

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