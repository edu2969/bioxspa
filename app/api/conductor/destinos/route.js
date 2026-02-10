import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, estado, conductor_id, dependencia_id, ruta_destinos(id, direccion_id, fecha_arribo), ruta_ventas(venta_id)')
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

        // Direcciones ya asignadas sin fecha de arribo
        const asignadas = (rutaData.ruta_destinos || []).filter(d => d.fecha_arribo === null).map(d => String(d.direccion_id));

        // Ventas asociadas a la ruta
        const ventaIds = (rutaData.ruta_ventas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length === 0) return NextResponse.json({ ok: false, error: 'No hay ventas asociadas a la ruta' }, { status: 404 });

        const { data: ventas, error: ventasErr } = await supabase
            .from('ventas')
            .select('id, cliente_id, direccion_despacho_id, cliente:clientes(id, nombre)')
            .in('id', ventaIds);

        if (ventasErr) {
            console.error('[destinos] Error fetching ventas:', ventasErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ventas' }, { status: 500 });
        }

        // Recopilar direcciones candidatas: direccion_despacho_id de ventas no asignadas
        const candidatos = new Set();
        const clienteIdsToLookup = new Set();

        for (const v of (ventas || [])) {
            const dirId = v.direccion_despacho_id;
            if (dirId && !asignadas.includes(String(dirId))) {
                candidatos.add(String(dirId));
                continue;
            }
            if (v.cliente_id) clienteIdsToLookup.add(v.cliente_id);
        }

        // Buscar direcciones de clientes cuando la venta no tiene direccion_despacho
        if (clienteIdsToLookup.size > 0) {
            const clienteIds = Array.from(clienteIdsToLookup);
            const { data: cliDirs, error: cliDirsErr } = await supabase
                .from('cliente_direcciones_despacho')
                .select('cliente_id, direccion_id')
                .in('cliente_id', clienteIds);
            if (cliDirsErr) console.error('[destinos] Error fetching cliente direcciones:', cliDirsErr);
            for (const cd of (cliDirs || [])) {
                if (!asignadas.includes(String(cd.direccion_id))) candidatos.add(String(cd.direccion_id));
            }
        }

        const direccionIds = Array.from(candidatos);
        if (direccionIds.length === 0) return NextResponse.json({ ok: true, destinos: [] });

        const { data: direcciones, error: dirErr } = await supabase
            .from('direcciones')
            .select('id, nombre')
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

        // Also map direccion_id -> cliente_id from cliente_direcciones_despacho
        const { data: cliDirsAll } = await supabase
            .from('cliente_direcciones_despacho')
            .select('cliente_id, direccion_id')
            .in('direccion_id', direccionIds);

        const direccionToCliente = {};
        for (const cd of (cliDirsAll || [])) direccionToCliente[cd.direccion_id] = cd.cliente_id;

        const destinos = (direcciones || []).map(d => ({
            direccionId: d.id,
            glosaDireccion: d.nombre || '',
            nombreCliente: clienteNombreMap[direccionToCliente[d.id]] || ''
        }));

        return NextResponse.json({ ok: true, destinos });
    } catch (error) {
        console.error('ERROR in destinos:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}