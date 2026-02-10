import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_CARGO, TIPO_ORDEN } from "@/app/utils/constants";

export async function POST(request) {
    try {
        const body = await request.json();
        const { rutaId, codigo } = body || {};

        if (!rutaId || !codigo) return NextResponse.json({ ok: false, error: "Missing rutaId or codigo" }, { status: 400 });

        // Fetch item by codigo with subcategoria->categoria
        const { data: itemRow, error: itemErr } = await supabase
            .from('items_catalogo')
            .select(`id, codigo, subcategoria:subcategorias_catalogo(id, nombre, cantidad, unidad, sin_sifon, categoria:categorias_catalogo(id, nombre, elemento))`)
            .eq('codigo', codigo)
            .maybeSingle();

        if (itemErr) {
            console.error('[descargar] Error fetching item:', itemErr);
            return NextResponse.json({ ok: false, error: 'Error fetching item' }, { status: 500 });
        }
        if (!itemRow) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });

        // Get last destination for the ruta
        const { data: ultimoDestino, error: ultimoDestinoErr } = await supabase
            .from('ruta_destinos')
            .select('id, direccion_id')
            .eq('ruta_id', rutaId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!ultimoDestino || ultimoDestinoErr) {
            return NextResponse.json({ ok: false, error: 'RutaDespacho or destino not found: ' + (ultimoDestinoErr ? ultimoDestinoErr.message : '') }, { status: 404 });
        }
1
        // ventas asociadas a la ruta
        const { data: rutaVentas } = await supabase.from('ruta_ventas').select('venta_id').eq('ruta_id', rutaId);
        const ventaIds = (rutaVentas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length === 0) return NextResponse.json({ ok: false, error: 'No hay ventas asociadas a la ruta' }, { status: 404 });

        const { data: ventas } = await supabase
            .from('ventas')
            .select('id, tipo, cliente_id, direccion_despacho_id')
            .in('id', ventaIds);

        // Find venta matching the destination
        let ventaDestino = (ventas || []).find(v => String(v.direccion_despacho_id) === String(ultimoDestino.direccion_id));
        if (!ventaDestino) {
            const clienteIds = (ventas || []).map(v => v.cliente_id).filter(Boolean);
            const { data: cliDirs } = await supabase
                .from('cliente_direcciones_despacho')
                .select('cliente_id, direccion_id')
                .in('cliente_id', clienteIds)
                .eq('direccion_id', ultimoDestino.direccion_destino_id);
            if (cliDirs && cliDirs.length > 0) {
                const clienteMatchedId = cliDirs[0].cliente_id;
                ventaDestino = (ventas || []).find(v => String(v.cliente_id) === String(clienteMatchedId));
            }
        }

        if (!ventaDestino) return NextResponse.json({ ok: false, error: 'Venta not found for destino' }, { status: 404 });

        // Get detalle_ventas for the ventaDestino with nested items
        const { data: detalles, error: detErr } = await supabase
            .from('detalle_ventas')
            .select(`id, cantidad, tipo, subcategoria:subcategorias_catalogo(id), detalle_venta_items(item_catalogo_id)`)
            .eq('venta_id', ventaDestino.id);

        if (detErr) {
            console.error('[descargar] Error fetching detalle_ventas:', detErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalle_ventas' }, { status: 500 });
        }

        // Compute currently loaded items (from carga historials)
        const { data: cargaHist, error: cargaErr } = await supabase
            .from('ruta_historial_carga')
            .select('id, items:ruta_items_movidos(item_catalogo_id)')
            .eq('ruta_id', rutaId)
            .eq('es_carga', true);

        if (cargaErr) console.error('[descargar] Error fetching carga historials:', cargaErr);
        const carga_item_ids = (cargaHist || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));

        // Traslado flow
        if (ventaDestino.tipo === TIPO_ORDEN.traslado) {
            const { user } = await getAuthenticatedUser();
            if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

            const { data: cargo, error: cargoErr } = await supabase
                .from('cargos')
                .select('id, sucursal_id, dependencia_id')
                .eq('usuario_id', user.id)
                .in('tipo', [TIPO_CARGO.despacho, TIPO_CARGO.responsable])
                .limit(1)
                .maybeSingle();

            if (cargoErr) {
                console.error('[descargar] Error fetching cargo:', cargoErr);
                return NextResponse.json({ ok: false, error: 'Error fetching cargo' }, { status: 500 });
            }
            if (!cargo) return NextResponse.json({ ok: false, error: 'Cargo not found' }, { status: 403 });

            // Collect cargo addresses
            const direccionesCargo = [];
            if (cargo.sucursal_id) {
                const { data: suc } = await supabase.from('sucursales').select('direccion_id').eq('id', cargo.sucursal_id).maybeSingle();
                if (suc?.direccion_id) direccionesCargo.push(String(suc.direccion_id));
            }
            if (cargo.dependencia_id) {
                const { data: dep } = await supabase.from('dependencias').select('direccion_id').eq('id', cargo.dependencia_id).maybeSingle();
                if (dep?.direccion_id) direccionesCargo.push(String(dep.direccion_id));
            }

            if (!direccionesCargo.includes(String(ultimoDestino.direccion_destino_id))) {
                return NextResponse.json({ ok: false, error: 'No autorizado para descargar en esta dirección' }, { status: 403 });
            }

            if (!carga_item_ids.includes(itemRow.id)) {
                return NextResponse.json({ ok: false, error: 'El item no está en la ruta de despacho' }, { status: 400 });
            }

            // Add detalle or update existing detalle_ventas
            // First check if item already present in any detalle
            const itemAlready = (detalles || []).some(d => (d.detalle_venta_items || []).some(i => String(i.item_catalogo_id) === String(itemRow.id)));
            if (itemAlready) return NextResponse.json({ ok: false, error: 'El item ya fue descargado en esta venta' }, { status: 400 });

            // Try to find existing detalle of tipo=2 (retiro) and matching subcategoria
            let detalleExistente = (detalles || []).find(d => d.tipo === 2 && String(d.subcategoria?.id) === String(itemRow.subcategoria?.id));
            let detalleId;
            if (detalleExistente) {
                detalleId = detalleExistente.id;
            } else {
                // create new detalle_ventas
                const { data: newDet, error: newDetErr } = await supabase
                    .from('detalle_ventas')
                    .insert({ venta_id: ventaDestino.id, glosa: `Retiro de ${itemRow.subcategoria?.nombre || 'cilindro'}`, codigo: itemRow.codigo, subcategoria_id: itemRow.subcategoria?.id, tipo: ventaDestino.tipo, cantidad: 1, neto: 0, iva: 0, total: 0 })
                    .select('id')
                    .maybeSingle();
                if (newDetErr) {
                    console.error('[descargar] Error creating detalle_ventas:', newDetErr);
                    return NextResponse.json({ ok: false, error: 'Error creating detalle' }, { status: 500 });
                }
                detalleId = newDet.id;
            }

            // Insert detalle_venta_items
            const { error: insItemErr } = await supabase.from('detalle_venta_items').insert({ detalle_venta_id: detalleId, item_catalogo_id: itemRow.id });
            if (insItemErr) console.error('[descargar] Error inserting detalle_venta_items:', insItemErr);

            // Record descarga in ruta_historial_carga / ruta_items_movidos
            // Try reuse last historial with es_carga = false
            const { data: lastHist } = await supabase.from('ruta_historial_carga').select('id, es_carga').eq('ruta_id', rutaId).order('fecha', { ascending: false }).limit(1).maybeSingle();
            let historialId;
            if (lastHist && lastHist.es_carga === false) {
                historialId = lastHist.id;
            } else {
                const { data: created, error: createErr } = await supabase.from('ruta_historial_carga').insert({ ruta_id: rutaId, es_carga: false, fecha: new Date().toISOString(), created_at: new Date().toISOString() }).select('id').maybeSingle();
                if (createErr) console.error('[descargar] Error creating historial descarga:', createErr);
                historialId = created?.id;
            }

            if (historialId) {
                const { error: insMovErr } = await supabase.from('ruta_items_movidos').insert({ historial_carga_id: historialId, item_catalogo_id: itemRow.id, created_at: new Date().toISOString() });
                if (insMovErr) console.error('[descargar] Error inserting ruta_items_movidos:', insMovErr);
            }

            // Recompute remaining carga items
            const { data: cargaAll } = await supabase.from('ruta_historial_carga').select('items:ruta_items_movidos(item_catalogo_id)').eq('ruta_id', rutaId).eq('es_carga', true);
            const cargaAllIds = (cargaAll || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));
            const { data: descargaAll } = await supabase.from('ruta_historial_carga').select('items:ruta_items_movidos(item_catalogo_id)').eq('ruta_id', rutaId).eq('es_carga', false);
            const descargaAllIds = (descargaAll || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));
            const remaining = cargaAllIds.filter(id => !descargaAllIds.includes(id));
            if (remaining.length === 0) {
                const { error: updVentaErr } = await supabase.from('ventas').update({ estado: 99 }).eq('id', ventaDestino.id);
                if (updVentaErr) console.error('[descargar] Error updating venta estado:', updVentaErr);
            }

            return NextResponse.json({ ok: true, item: itemRow });
        }

        // Other order types: check cliente ownership and available detalle
        const perteneceAlCliente = (detalles || []).some(d => String(d.subcategoria?.id) === String(itemRow.subcategoria?.id));
        if (!perteneceAlCliente) return NextResponse.json({ ok: false, error: 'El item no pertenece al cliente' }, { status: 403 });

        if (!carga_item_ids.includes(itemRow.id)) return NextResponse.json({ ok: false, error: 'El item no está cargado en la ruta de despacho' }, { status: 400 });

        // Find detalle disponible (where count of detalle_venta_items < cantidad)
        let detalleDisponible = null;
        for (const d of (detalles || [])) {
            const assigned = (d.detalle_venta_items || []).length || 0;
            if (String(d.subcategoria?.id) === String(itemRow.subcategoria?.id) && assigned < (d.cantidad || 0)) {
                detalleDisponible = d;
                break;
            }
        }
        if (!detalleDisponible) return NextResponse.json({ ok: false, error: 'No hay espacio en los detalles de la venta para este item' }, { status: 400 });

        // Insert detalle_venta_items
        const { error: insErr } = await supabase.from('detalle_venta_items').insert({ detalle_venta_id: detalleDisponible.id, item_catalogo_id: itemRow.id });
        if (insErr) console.error('[descargar] Error inserting detalle_venta_items:', insErr);

        // Record descarga similar to above
        const { data: lastHist2 } = await supabase.from('ruta_historial_carga').select('id, es_carga').eq('ruta_id', rutaId).order('fecha', { ascending: false }).limit(1).maybeSingle();
        let historialId2;
        if (lastHist2 && lastHist2.es_carga === false) historialId2 = lastHist2.id;
        else {
            const { data: created2, error: createErr2 } = await supabase.from('ruta_historial_carga').insert({ ruta_id: rutaId, es_carga: false, fecha: new Date().toISOString(), created_at: new Date().toISOString() }).select('id').maybeSingle();
            if (createErr2) console.error('[descargar] Error creating historial descarga:', createErr2);
            historialId2 = created2?.id;
        }
        if (historialId2) {
            const { error: insMovErr2 } = await supabase.from('ruta_items_movidos').insert({ historial_carga_id: historialId2, item_catalogo_id: itemRow.id, created_at: new Date().toISOString() });
            if (insMovErr2) console.error('[descargar] Error inserting ruta_items_movidos:', insMovErr2);
        }

        // Recompute remaining carga items
        const { data: cargaAll2 } = await supabase.from('ruta_historial_carga').select('items:ruta_items_movidos(item_catalogo_id)').eq('ruta_id', rutaId).eq('es_carga', true);
        const cargaAllIds2 = (cargaAll2 || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));
        const { data: descargaAll2 } = await supabase.from('ruta_historial_carga').select('items:ruta_items_movidos(item_catalogo_id)').eq('ruta_id', rutaId).eq('es_carga', false);
        const descargaAllIds2 = (descargaAll2 || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));
        const remaining2 = cargaAllIds2.filter(id => !descargaAllIds2.includes(id));
        if (remaining2.length === 0) {
            const { error: updVentaErr2 } = await supabase.from('ventas').update({ estado: 99 }).eq('id', ventaDestino.id);
            if (updVentaErr2) console.error('[descargar] Error updating venta estado:', updVentaErr2);
        }

        return NextResponse.json({ ok: true, item: itemRow });
    } catch (error) {
        console.error('Error in descargar route:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
