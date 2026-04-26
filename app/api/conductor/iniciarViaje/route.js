import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";

export async function POST(req) {
    try {
        console.log("POST request received for iniciarViaje (Supabase)");        
        const body = await req.json();
        const { rutaId, direccionId } = body || {};
        if (!rutaId || !direccionId) return NextResponse.json({ ok: false, error: "rutaId and direccionId are required" }, { status: 400 });

        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }

        const { user, userData } = authResult.data;
        const userId = user.id;
        const userCargoTypes = (userData.cargos || []).map((cargo) => cargo.tipo);
        const hasCargo = (allowedCargoTypes) =>
            userCargoTypes.some((cargoType) => allowedCargoTypes.includes(cargoType));

        if (!hasCargo([TIPO_CARGO.conductor])) {
            console.warn(`User ${userId} is not a conductor. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }
        
        const supabase = await getSupabaseServerClient();
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

        const allowedStates = [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada, 
            TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada, 
            TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino];
        if (!allowedStates.includes(rutaData.estado)) {
            console.log("[iniciarViaje] La ruta no está en un estado válido")
            return NextResponse.json({ ok: false, error: 'Ruta not in allowed state' }, { status: 400 });
        }

        if (String(rutaData.conductor_id) !== String(user.id)) {
            console.log("[iniciarViaje] Acceso denegado: Solo el conductor puede iniciar sus rutas")
            return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
        }

        // Find ventas for this ruta that match direccionId
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('venta_id')
            .eq('ruta_despacho_id', rutaId);
        
            if (rvErr) {
            console.error('[iniciarViaje] Error fetching ruta_despacho_ventas:', rvErr);
            return NextResponse.json({ ok: false, error: 'No se encuentran las ventas'});
        }

        const ventaIds = (rutaVentas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length > 0) {
            const { data: ventasMatch, error: ventasErr } = await supabase
                .from('ventas')
                .select('id')
                .in('id', ventaIds)
                .eq('direccion_despacho_id', direccionId);

            if (ventasErr) {
                console.error('[iniciarViaje] Error fetching ventas:', ventasErr);
                return NextResponse.json({ ok: false, error: "Error al obtener las ventas: " + ventasErr }, { status: 500 });
            } 
            
            if (ventasMatch && ventasMatch.length > 0) {
                const idsToUpdate = ventasMatch.map(v => v.id);
                const { error: updErr } = await supabase
                    .from('ventas')
                    .update({ estado: TIPO_ESTADO_VENTA.reparto })
                    .in('id', idsToUpdate);
                if (updErr) console.error('[iniciarViaje] Error updating ventas estado:', updErr);
            }
        }

        // Insert new destino (ruta_despacho_destinos)
        const { error: insDestinoErr } = await supabase
            .from('ruta_despacho_destinos')
            .insert({ 
                ruta_despacho_id: rutaId, 
                direccion_id: direccionId, 
                fecha_arribo: null 
            });
        if (insDestinoErr) {
            console.error('[iniciarViaje] Error inserting ruta_despacho_destinos:', insDestinoErr);
            return NextResponse.json({ ok: false, error: 'Error inserting destino: ' + insDestinoErr.message }, { status: 500 });
        }

        // Update ruta estado to en_ruta
        const { error: updRutaErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta })
            .eq('id', rutaId);
        if (updRutaErr) console.error('[iniciarViaje] Error updating rutas_despacho estado:', updRutaErr);

        // Insert historial estado
        const { error: histErr } = await supabase
            .from('ruta_despacho_historial_estados')
            .insert({ 
                ruta_despacho_id: rutaId, 
                estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta, 
                usuario_id: userId
            });
        if (histErr) console.error('[iniciarViaje] Error inserting ruta_despacho_historial_estados:', histErr);

        return NextResponse.json({ ok: true, message: 'Viaje iniciado correctamente' });
    } catch (error) {
        console.error('ERROR in iniciarViaje:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}