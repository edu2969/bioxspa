import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase';

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) return NextResponse.json({ ok: false, error: 'rutaId is required' }, { status: 400 });

        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Fetch venta ids for the ruta
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('venta_id')
            .eq('ruta_despacho_id', rutaId);
        if (rvErr) {
            console.error('[ventasEnTransito] ruta_despacho_ventas error', rvErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta despacho ventas' }, { status: 500 });
        }

        const ventaIds = (rutaVentas || []).map((r) => r.venta_id).filter(Boolean);
        if (ventaIds.length === 0) return NextResponse.json({ ok: true, ventasEnTransito: [] });

        // Fetch ventas with cliente info
        const { data: ventasRows, error: ventasErr } = await supabase
            .from('ventas')
            .select('id, tipo, estado, fecha, comentario, cliente:clientes(id, nombre, telefono)')
            .in('id', ventaIds);
        if (ventasErr) {
            console.error('[ventasEnTransito] ventas error', ventasErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ventas' }, { status: 500 });
        }

        // Fetch detalle_ventas with nested subcategoria -> categoria
        const { data: detallesRows, error: detErr } = await supabase
            .from('detalle_ventas')
            .select('id, venta_id, cantidad, subcategoria:subcategorias_catalogo(id, cantidad, unidad, sin_sifon, categoria:categorias_catalogo(id, elemento, es_industrial, es_medicinal)))')
            .in('venta_id', ventaIds);
        if (detErr) {
            console.error('[ventasEnTransito] detalles error', detErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalles' }, { status: 500 });
        }

        // Group detalles by venta_id
        const detallesMap = {};
        for (const d of (detallesRows || [])) {
            if (!detallesMap[d.venta_id]) detallesMap[d.venta_id] = [];
            detallesMap[d.venta_id].push(d);
        }

        const ventasEnTransito = (ventasRows || []).map((v) => ({
            ventaId: v.id,
            tipo: v.tipo,
            estado: v.estado,
            fecha: v.fecha,
            nombreCliente: v.cliente?.nombre || '',
            telefonoCliente: v.cliente?.telefono || '',
            comentario: v.comentario,
            detalles: (detallesMap[v.id] || []).map((d) => ({
                multiplicador: d.cantidad,
                cantidad: d.subcategoria?.cantidad || 0,
                elemento: d.subcategoria?.categoria?.elemento || '',
                unidad: d.subcategoria?.unidad || '',
                esIndustrial: d.subcategoria?.categoria?.es_industrial || false,
                esMedicinal: d.subcategoria?.categoria?.es_medicinal || false,
                sinSifon: d.subcategoria?.sin_sifon || false,
            })),
        }));

        return NextResponse.json({ ok: true, ventasEnTransito });
    } catch (error) {
        console.error('ERROR in ventasEnTransito:', error);
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
    }
}