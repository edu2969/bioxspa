import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase/supabase-auth';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) return NextResponse.json({ ok: false, error: 'rutaId is required' }, { status: 400 });

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Fetch venta ids for the ruta
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_ventas')
            .select('venta_id')
            .eq('ruta_id', rutaId);
        if (rvErr) {
            console.error('[ventasEnTransito] ruta_ventas error', rvErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta ventas' }, { status: 500 });
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
            venta_id: v.id,
            tipo: v.tipo,
            estado: v.estado,
            fecha: v.fecha,
            nombre_cliente: v.cliente?.nombre || '',
            telefono_cliente: v.cliente?.telefono || '',
            comentario: v.comentario,
            detalles: (detallesMap[v.id] || []).map((d) => ({
                multiplicador: d.cantidad,
                cantidad: d.subcategoria?.cantidad || 0,
                elemento: d.subcategoria?.categoria?.elemento || '',
                unidad: d.subcategoria?.unidad || '',
                es_industrial: d.subcategoria?.categoria?.es_industrial || false,
                es_medicinal: d.subcategoria?.categoria?.es_medicinal || false,
                sin_sifon: d.subcategoria?.sin_sifon || false,
            })),
        }));

        return NextResponse.json({ ok: true, ventasEnTransito });
    } catch (error) {
        console.error('ERROR in ventasEnTransito:', error);
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
    }
}