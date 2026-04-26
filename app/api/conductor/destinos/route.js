import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ORDEN, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

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
            .select('id, estado, conductor_id, dependencia_id, ruta_despacho_destinos(id, direccion_id, fecha_arribo), ruta_despacho_ventas(venta_id)')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[destinos] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }
        if (!rutaData) return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });

        // Access control: allow conductor or cargos of the dependencia
        if (String(rutaData.conductor_id) !== String(user.id)) {
            const { data: cargos, error: cargosErr } = await supabase
                .from('cargos')
                .select('id')
                .eq('usuario_id', user.id)
                .eq('dependencia_id', rutaData.dependencia_id)
                .limit(1);
            if (cargosErr) console.error('[destinos] Error checking cargos:', cargosErr);
            if (!cargos || cargos.length === 0) return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
        }

        // Ventas asociadas a la ruta
        const ventaIds = (rutaData.ruta_despacho_ventas || []).map(r => r.venta_id);
        if (ventaIds.length === 0) {
            console.error(`[destinos] No ventas found for rutaId ${rutaId}`);
            return NextResponse.json({ ok: false, error: 'No hay ventas asociadas a la ruta' }, { status: 404 });
        }

        const { data: ventas, error: ventasErr } = await supabase
            .from('ventas')
            .select('id, cliente_id, direccion_despacho_id, cliente:clientes(id, nombre)')
            .in('id', ventaIds)
            .lt("estado", TIPO_ESTADO_VENTA.entregado);

        if (ventasErr) {
            console.error('[destinos] Error fetching ventas:', ventasErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ventas' }, { status: 500 });
        }

        if(ventas.length === 0) {
            console.warn(`[destinos] No ventas found for rutaId ${rutaId} after filtering by estado`);
            return NextResponse.json({ ok: true, destinos: [] });            
        }

        const direccionIds = ventas.map(v => v.direccion_despacho_id);
        if (direccionIds.length === 0) return NextResponse.json({ ok: true, destinos: [] });

        const { data: direcciones, error: dirErr } = await supabase
            .from('direcciones')
            .select('id, direccion_cliente, latitud, longitud')
            .in('id', direccionIds);

        if (dirErr) {
            console.error('[destinos] Error fetching direcciones:', dirErr);
            return NextResponse.json({ ok: false, error: 'Error fetching direcciones' }, { status: 500 });
        }

        // Map cliente_id -> nombre from ventas
        const clienteNombreMap = {};
        for (const v of (ventas || [])) {
            if (v.cliente && v.cliente.nombre) clienteNombreMap[v.cliente_id] = v.cliente.nombre;
        }

        const destinos = (direcciones || []).map(d => ({
            tipo: TIPO_ORDEN.venta,
            fechaArribo: null,
            direccion: {
                id: d.id,
                direccionCliente: d.direccion_cliente || '',
                latitud: d.latitud || 0,
                longitud: d.longitud || 0,
            },
            comentario: d.comentario || '',            
            nombreCliente: clienteNombreMap[ventas.find(v => v.direccion_despacho_id === d.id)?.cliente_id] || ''
        }));

        console.log("Destinos finales:", destinos);

        return NextResponse.json({ ok: true, destinos });
    } catch (error) {
        console.error('ERROR in destinos:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}