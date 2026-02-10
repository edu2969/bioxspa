import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO, USER_ROLE, TIPO_ORDEN } from "@/app/utils/constants";

export async function POST(req: Request) {
    try {
        console.log("POST request received for finalizarRuta (Supabase)");

        const { user, userData } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { rutaId } = body || {};
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

        // Fetch ruta and ensure it's in 'regreso' state
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, estado, conductor_id')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[finalizarRuta] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });

        if (rutaData.estado !== TIPO_ESTADO_RUTA_DESPACHO.regreso) {
            return NextResponse.json({ ok: false, error: 'Ruta not in regreso state' }, { status: 400 });
        }

        // Verify assigned driver
        if (String(rutaData.conductor_id) !== String(user.id)) {
            return NextResponse.json({ ok: false, error: 'You are not authorized to complete this route' }, { status: 403 });
        }

        // Verify user has conductor role (use userData.role if available)
        const userRole = userData?.role ?? null;
        if (!userRole || !(userRole & USER_ROLE.conductor)) {
            return NextResponse.json({ ok: false, error: 'You do not have permission to complete routes' }, { status: 403 });
        }

        // Verify active cargo assignment
        const { data: cargoRow, error: cargoErr } = await supabase
            .from('cargos')
            .select('id, hasta')
            .eq('usuario_id', user.id)
            .eq('tipo', TIPO_CARGO.conductor)
            .limit(1)
            .maybeSingle();
        if (cargoErr) {
            console.error('[finalizarRuta] Error fetching cargo:', cargoErr);
            return NextResponse.json({ ok: false, error: 'Error checking cargo' }, { status: 500 });
        }

        const now = new Date();
        if (!cargoRow || (cargoRow.hasta && new Date(cargoRow.hasta) < now)) {
            return NextResponse.json({ ok: false, error: 'User does not have an active conductor position' }, { status: 403 });
        }

        // Get ventas linked to ruta via ruta_ventas
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_ventas')
            .select('venta_id')
            .eq('ruta_id', rutaId);
        if (rvErr) console.error('[finalizarRuta] Error fetching ruta_ventas:', rvErr);

        const ventaIds = (rutaVentas || []).map((r: any) => r.venta_id).filter(Boolean);

        let ventasTrasladoCount = 0;
        if (ventaIds.length > 0) {
            const { data: ventasRows, error: ventasErr } = await supabase
                .from('ventas')
                .select('id, tipo')
                .in('id', ventaIds);
            if (ventasErr) console.error('[finalizarRuta] Error fetching ventas:', ventasErr);
            ventasTrasladoCount = (ventasRows || []).filter((v: any) => v.tipo === TIPO_ORDEN.traslado).length;
        }

        const nuevoEstado = ventasTrasladoCount > 0 ? TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado : TIPO_ESTADO_RUTA_DESPACHO.terminado;

        // Update ruta estado
        const { error: updErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: nuevoEstado })
            .eq('id', rutaId);
        if (updErr) console.error('[finalizarRuta] Error updating ruta estado:', updErr);

        // Insert into ruta_historial_estados
        const nowIso = new Date().toISOString();
        const { error: histErr } = await supabase
            .from('ruta_historial_estados')
            .insert({ ruta_id: rutaId, estado: nuevoEstado, created_at: nowIso });
        if (histErr) console.error('[finalizarRuta] Error inserting ruta_historial_estados:', histErr);

        return NextResponse.json({ ok: true, message: 'Ruta completada correctamente', estado: nuevoEstado });

    } catch (error) {
        console.error('ERROR in finalizarRuta:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}