import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request) {
    try {
        console.log("[confirmarArribo] POST request received for confirmarArribo (Supabase)");
        const { rutaId, rut, nombre } = await request.json() || {};
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const userId = authResult.userData.id;
        const supabase = await getSupabaseServerClient();
        const { data: cargo, error: cargoErr } = await supabase
            .from('cargos')
            .select('id, hasta')
            .eq('usuario_id', userId)
            .eq('tipo', TIPO_CARGO.conductor)
            .limit(1)
            .maybeSingle();

        if (cargoErr) {
            console.error('[confirmarArribo] Error fetching cargo:', cargoErr);
            return NextResponse.json({ ok: false, error: 'Error fetching cargo' }, { status: 500 });
        }
        const now = new Date();
        if (!cargo || (cargo.hasta && new Date(cargo.hasta) < now)) {
            return NextResponse.json({ ok: false, error: 'User is not an active conductor' }, { status: 403 });
        }

        console.log(`[confirmarArribo] User ${userId} is an active conductor. Proceeding with confirming arrival for rutaId: ${rutaId}`);

        // Fetch ruta and verify ownership
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, conductor_id')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[confirmarArribo] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }
        if (!rutaData) {
            console.log("Ruta not found for id:", rutaId);
            return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });
        }

        if (String(rutaData.conductor_id) !== String(authResult.userData.id)) {
            console.log("User is not the assigned driver for this route. User ID:", authResult.userData.id, "Ruta Conductor ID:", rutaData.conductor_id);
            return NextResponse.json({ ok: false, error: 'User is not the assigned driver for this route' }, { status: 403 });
        }

        console.log("[confirmarArribo] Ruta found and user is the assigned driver. Proceeding with confirming arrival.");

        // Find the latest ruta_despacho_destinos without fecha_arribo
        const { data: destino, error: destErr } = await supabase
            .from('ruta_despacho_destinos')
            .select('id')
            .eq('ruta_despacho_id', rutaId)
            .is('fecha_arribo', null)
            .single();

        if (destErr) {
            console.error('[confirmarArribo] Error fetching ruta_despacho_destinos:', destErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta destinos' }, { status: 500 });
        }

        if (!destino) {
            console.log("No pending destino found for rutaId:", rutaId);
            return NextResponse.json({ ok: false, error: 'No pending destino to confirm' }, { status: 400 });
        } 

        console.log("[confirmarArribo] Pending destino found. Updating with arrival info. Destino ID:", destino)

        // Update destino with fecha_arribo and receiver info (if columns exist)
        const updatePayload = { fecha_arribo: now.toISOString() };
        if (rut) updatePayload.rut_quien_recibe = rut;
        if (nombre) updatePayload.nombre_quien_recibe = nombre;

        console.log("[confirmarArribo] Update payload for destino:", updatePayload);

        const { error: updDestErr } = await supabase
            .from('ruta_despacho_destinos')
            .update(updatePayload)
            .eq('id', destino.id);

        if (updDestErr) {
            console.error('[confirmarArribo] Error updating destino:', updDestErr);
            return NextResponse.json({ ok: false, error: 'Error updating destino' }, { status: 500 });
        }

        console.log("[confirmarArribo] Destino updated with arrival info. Now checking for remaining destinos and updating ruta estado accordingly.");

        // Update ruta estado to descarga
        const { error: updRutaErr } = await supabase
            .from('rutas_despacho')
            .update({ 
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga 
            })
            .eq('id', rutaId);

        if (updRutaErr) {
            console.error('[confirmarArribo] Error updating ruta estado:', updRutaErr);
            return NextResponse.json({ ok: false, error: 'Error updating ruta estado' }, { status: 500 });
        }

        // Insert historial estado
        const { error: histErr } = await supabase
            .from('ruta_despacho_historial_estados')
            .insert({ 
                ruta_despacho_id: rutaId,
                usuario_id: userId, 
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga 
            });

        if (histErr) {
            console.error('[confirmarArribo] Error inserting historial estado:', histErr);
            return NextResponse.json({ ok: false, error: 'Error inserting historial estado' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: 'Route arrival confirmed successfully' });
    } catch (error) {
        console.error('Error in POST /confirmarArribo:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
