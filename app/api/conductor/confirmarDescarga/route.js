import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { connectMongoDB } from "@/lib/mongodb";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { generateBIDeudaForMultipleVentas } from "@/lib/bi/deudaGenerator";

export async function POST(req) {
    try {
        console.log("POST request received for confirmarDescarga (Supabase)");

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { rutaId } = body || {};
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });

        // Fetch ruta and validate
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

        if (String(rutaData.conductor_id) !== String(user.id)) {
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

        // Insert ruta_historial_estados
        const { error: histErr } = await supabase
            .from('ruta_historial_estados')
            .insert({ ruta_id: rutaId, estado: nuevoEstado, created_at: nowIso });
        if (histErr) console.error('[confirmarDescarga] Error inserting ruta_historial_estados:', histErr);

        // Get ventas for this ruta via ruta_ventas
        const { data: rutaVentas, error: rvErr } = await supabase
            .from('ruta_ventas')
            .select('venta_id')
            .eq('ruta_id', rutaId);
        if (rvErr) console.error('[confirmarDescarga] Error fetching ruta_ventas:', rvErr);

        const ventaIds = (rutaVentas || []).map((r) => r.venta_id).filter(Boolean);

        let ventasToGenerateBI = [];

        if (ventaIds.length > 0) {
            // Update ventas estado and por_cobrar
            const { error: updVentasErr } = await supabase
                .from('ventas')
                .update({ estado: TIPO_ESTADO_VENTA.entregado, por_cobrar: true })
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

            ventasToGenerateBI = (ventasRows || []).map((v) => ({
                _id: v.id,
                clienteId: v.cliente_id,
                sucursalId: v.sucursal_id,
                valorTotal: v.valor_total,
                fecha: v.fecha
            }));

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
        }

        // Generate BI records using existing Mongo-based generator (requires Mongo connection)
        if (ventasToGenerateBI.length > 0) {
            try {
                await connectMongoDB();
                await generateBIDeudaForMultipleVentas(ventasToGenerateBI);
            } catch (err) {
                console.error('[confirmarDescarga] Error generating BI records:', err);
            }
        }

        return NextResponse.json({ ok: true, message: 'Descarga confirmada exitosamente', estado: nuevoEstado });

    } catch (error) {
        console.error('ERROR in confirmarDescarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}