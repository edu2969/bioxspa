import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(request) {
    try {
        const { rutaId, rut, nombre } = await request.json() || {};
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        // Verify the user has an active conductor cargo
        const { data: cargo, error: cargoErr } = await supabase
            .from('cargos')
            .select('id, hasta')
            .eq('usuario_id', user.id)
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
        if (!rutaData) return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });

        if (String(rutaData.conductor_id) !== String(user.id)) {
            return NextResponse.json({ ok: false, error: 'User is not the assigned driver for this route' }, { status: 403 });
        }

        // Find the latest ruta_destinos without fecha_arribo
        const { data: destino, error: destErr } = await supabase
            .from('ruta_destinos')
            .select('id')
            .eq('ruta_id', rutaId)
            .is('fecha_arribo', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (destErr) {
            console.error('[confirmarArribo] Error fetching ruta_destinos:', destErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta destinos' }, { status: 500 });
        }

        if (!destino) return NextResponse.json({ ok: false, error: 'No pending destino to confirm' }, { status: 400 });

        // Update destino with fecha_arribo and receiver info (if columns exist)
        const updatePayload = { fecha_arribo: now.toISOString() };
        if (rut) updatePayload.rut_quien_recibe = rut;
        if (nombre) updatePayload.nombre_quien_recibe = nombre;

        const { error: updDestErr } = await supabase
            .from('ruta_destinos')
            .update(updatePayload)
            .eq('id', destino.id);

        if (updDestErr) {
            console.error('[confirmarArribo] Error updating destino:', updDestErr);
            return NextResponse.json({ ok: false, error: 'Error updating destino' }, { status: 500 });
        }

        // Update ruta estado to descarga
        const { error: updRutaErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.descarga })
            .eq('id', rutaId);
        if (updRutaErr) console.error('[confirmarArribo] Error updating ruta estado:', updRutaErr);

        // Insert historial estado
        const { error: histErr } = await supabase
            .from('ruta_historial_estados')
            .insert({ ruta_id: rutaId, estado: TIPO_ESTADO_RUTA_DESPACHO.descarga, created_at: now.toISOString() });
        if (histErr) console.error('[confirmarArribo] Error inserting historial estado:', histErr);

        return NextResponse.json({ ok: true, message: 'Route arrival confirmed successfully' });
    } catch (error) {
        console.error('Error in POST /confirmarArribo:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
