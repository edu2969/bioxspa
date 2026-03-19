import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";
import { syncBIDeudasFromVentas } from "@/lib/arriendos/syncBIDeudasFromVentas";

export async function POST(req) {
    try {
        console.log("POST request received for confirmarDescarga (Supabase)");
        const body = await req.json();
        const { rutaId } = body || {};
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });

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
            .from("rutas_despacho")
            .select("id, estado, conductor_id")
            .eq("id", rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[confirmarDescarga] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'Ruta no encontrada' }, { status: 404 });

        if (rutaData.estado !== TIPO_ESTADO_RUTA_DESPACHO.descarga) {
            return NextResponse.json({ ok: false, error: 'La ruta no está en estado de descarga' }, { status: 400 });
        }

        if (rutaData.conductor_id !== userId) {
            return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
        }

        const nuevoEstado = TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
        const nowIso = new Date().toISOString();

        // Update ruta estado
        const { error: updRutaErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: nuevoEstado })
            .eq('id', rutaId);
        if (updRutaErr) console.error('[confirmarDescarga] Error updating ruta estado:', updRutaErr);

        // Insert ruta_despacho_historial_estados
        const { error: histErr } = await supabase
            .from('ruta_despacho_historial_estados')
            .insert({ 
                ruta_despacho_id: rutaId, 
                estado: nuevoEstado,
                usuario_id: userId
            });
        if (histErr) console.error('[confirmarDescarga] Error inserting ruta_despacho_historial_estados:', histErr);

        // Get ventas for this ruta via ruta_despacho_ventas
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('venta_id')
            .eq('ruta_despacho_id', rutaId);
        if (rvErr) console.error('[confirmarDescarga] Error fetching ruta_despacho_ventas:', rvErr);

        const ventaIds = (rutaVentas || []).map((r) => r.venta_id).filter(Boolean);

        if (ventaIds.length > 0) {
            // Update ventas estado and por_cobrar
            const { error: updVentasErr } = await supabase
                .from('ventas')
                .update({ 
                    estado: TIPO_ESTADO_VENTA.entregado, 
                    por_cobrar: true 
                })
                .in('id', ventaIds);
            if (updVentasErr) console.error('[confirmarDescarga] Error updating ventas:', updVentasErr);

            // Insert venta_historial_estados for all ventas
            const histRows = ventaIds.map((id) => ({ venta_id: id, estado: TIPO_ESTADO_VENTA.entregado, created_at: nowIso }));
            const { error: vhErr } = await supabase
                .from('venta_historial_estados')
                .insert(histRows);
            if (vhErr) console.error('[confirmarDescarga] Error inserting venta_historial_estados:', vhErr);

            // Fetch ventas to process direccion updates and BI generation
            const { data: ventasRows, error: ventasFetchErr } = await supabase
                .from('ventas')
                .select('id, direccion_despacho_id, cliente_id, sucursal_id, valor_total, fecha')
                .in('id', ventaIds);
            if (ventasFetchErr) console.error('[confirmarDescarga] Error fetching ventas data:', ventasFetchErr);

            // For each venta, update item_catalogos direccion if venta has direccion_despacho_id
            for (const venta of ventasRows || []) {
                if (!venta.direccion_despacho_id) continue;

                // Fetch detalle_ventas for this venta
                const { data: detalles, error: detallesErr } = await supabase
                    .from('detalle_ventas')
                    .select('id')
                    .eq('venta_id', venta.id);
                if (detallesErr) console.error('[confirmarDescarga] Error fetching detalles:', detallesErr);

                const detalleIds = (detalles || []).map((d) => d.id);
                if (detalleIds.length === 0) continue;

                // Fetch detalle_venta_items for these detalles to find item ids
                const { data: detalleItems, error: dviErr } = await supabase
                    .from('detalle_venta_items')
                    .select('item_catalogo_id')
                    .in('detalle_venta_id', detalleIds);
                if (dviErr) console.error('[confirmarDescarga] Error fetching detalle_venta_items:', dviErr);

                const itemIds = (detalleItems || []).map((di) => di.item_catalogo_id).filter(Boolean);
                if (itemIds.length === 0) continue;

                const { error: updItemsErr } = await supabase
                    .from('items_catalogo')
                    .update({ direccion_id: venta.direccion_despacho_id })
                    .in('id', itemIds);
                if (updItemsErr) console.error('[confirmarDescarga] Error updating item_catalogos direccion:', updItemsErr);
            }

            let biDeudas;
            try {
                biDeudas = await syncBIDeudasFromVentas({
                    supabase,
                    ventaIds,
                    source: 'confirmar_descarga',
                });
            } catch (biError) {
                console.error('[confirmarDescarga] Error syncing bi_deudas:', biError);
                biDeudas = {
                    ok: false,
                    source: 'confirmar_descarga',
                    error: biError.message,
                    ventaIds,
                };
            }

            return NextResponse.json({ ok: true, message: 'Descarga confirmada exitosamente', estado: nuevoEstado, biDeudas });
        }
        return NextResponse.json({ ok: true, message: 'Descarga confirmada exitosamente', estado: nuevoEstado, biDeudas: { ok: true, source: 'confirmar_descarga', ventaIds: [] } });
    } catch (error) {
        console.error('ERROR in confirmarDescarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}