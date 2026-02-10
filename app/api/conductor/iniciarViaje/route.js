import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(req) {
    try {
        console.log("POST request received for iniciarViaje (Supabase)");

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { rutaId, direccionId } = body || {};
        if (!rutaId || !direccionId) return NextResponse.json({ ok: false, error: "rutaId and direccionId are required" }, { status: 400 });

        // Fetch ruta and verify state and ownership
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, estado, conductor_id')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[iniciarViaje] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });

        const allowedStates = [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada, TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada, TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino];
        if (!allowedStates.includes(rutaData.estado)) return NextResponse.json({ ok: false, error: 'Ruta not in allowed state' }, { status: 400 });

        if (String(rutaData.conductor_id) !== String(user.id)) return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });

        // Find ventas for this ruta that match direccionId
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_ventas')
            .select('venta_id')
            .eq('ruta_id', rutaId);
        if (rvErr) console.error('[iniciarViaje] Error fetching ruta_ventas:', rvErr);

        const ventaIds = (rutaVentas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length > 0) {
            const { data: ventasMatch, error: ventasErr } = await supabase
                .from('ventas')
                .select('id')
                .in('id', ventaIds)
                .eq('direccion_despacho_id', direccionId);

            if (ventasErr) {
                console.error('[iniciarViaje] Error fetching ventas:', ventasErr);
            } else if (ventasMatch && ventasMatch.length > 0) {
                const idsToUpdate = ventasMatch.map(v => v.id);
                const { error: updErr } = await supabase
                    .from('ventas')
                    .update({ estado: TIPO_ESTADO_VENTA.reparto })
                    .in('id', idsToUpdate);
                if (updErr) console.error('[iniciarViaje] Error updating ventas estado:', updErr);
            }
        }

        // Insert new destino (ruta_destinos)
        const { error: insDestinoErr } = await supabase
            .from('ruta_destinos')
            .insert({ ruta_id: rutaId, direccion_id: direccionId, fecha_arribo: null, created_at: new Date().toISOString() });
        if (insDestinoErr) console.error('[iniciarViaje] Error inserting ruta_destinos:', insDestinoErr);

        // Update ruta estado to en_ruta
        const { error: updRutaErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta })
            .eq('id', rutaId);
        if (updRutaErr) console.error('[iniciarViaje] Error updating rutas_despacho estado:', updRutaErr);

        // Insert historial estado
        const { error: histErr } = await supabase
            .from('ruta_historial_estados')
            .insert({ ruta_id: rutaId, estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta, created_at: new Date().toISOString() });
        if (histErr) console.error('[iniciarViaje] Error inserting ruta_historial_estados:', histErr);

        return NextResponse.json({ ok: true, message: 'Viaje iniciado correctamente' });
    } catch (error) {
        console.error('ERROR in iniciarViaje:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}