import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";
import { syncBIDeudasFromVentas } from "@/lib/arriendos/syncBIDeudasFromVentas";

/**
 * Dado el usuario autenticado conductor, verifica que la ruta
 * exista y esté asignada a él. Busca entonces el destino
 * sin arribo de la ruta en estado de descarga, colocandole fecha de arribo.
 * Entre las ventas de la ruta, se busca aquella en que coincida la dirección de
 * destino de despacho de una de ellas.
 * @param {*} req 
 * @returns 
 */
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
        
        // Varificación de ruta existente
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

        // Get ventas for this ruta via ruta_despacho_ventas
        const { data: ventasRuta, error: rvErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('id, venta_id(id, estado)')
            .eq('ruta_despacho_id', rutaId);            

        if (rvErr) {
            console.error('[confirmarDescarga] Error fetching ruta_despacho_ventas:', rvErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta ventas' }, { status: 500 });
        }

        const { data: destinoReciente, error: destRecErr } = await supabase
            .from('ruta_despacho_destinos')
            .select('direccion_id')
            .eq('ruta_despacho_id', rutaId)
            .order('fecha_arribo', { ascending: false })
            .limit(1)
            .single();

        if(!destinoReciente || destRecErr) {
            console.error('[confirmarDescarga] Error fetching recent destino:', destRecErr);
            return NextResponse.json({ ok: false, error: 'Error fetching recent destino' }, { status: 500 });
        }

        const { data: ventaRuta, error: vrErr } = await supabase            
            .from('ventas')
            .select('id')
            .in('id', ventasRuta.map(v => v.venta_id.id))
            .eq('direccion_despacho_id', destinoReciente.direccion_id)
            .single();   
            
        if(vrErr) {
            console.error('[confirmarDescarga] Error fetching venta for ruta:', vrErr);
            return NextResponse.json({ ok: false, error: 'Error fetching venta for ruta' }, { status: 500 });
        }  
        
        // Actualiza la dirección de los items en cada detalle de la venta
        const { data: detalles, error: detallesErr } = await supabase
            .from('detalle_ventas')
            .select('id')
            .eq('venta_id', ventaRuta.id);

        if(detallesErr) {
            console.error('[confirmarDescarga] Error fetching detalle_ventas:', detallesErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalle ventas' }, { status: 500 });
        }

        if(!detalles || detalles.length === 0) {
            console.warn(`[confirmarDescarga] No detalles found for venta ${ventaRuta.id}`);
            return NextResponse.json({ ok: false, error: 'No detalles found for venta' }, { status: 404 });
        }

        const detalleIds = detalles.map(d => d.id);
        
        const { data: detalleItems, error: diErr } = await supabase
            .from('detalle_venta_items')
            .select('id, item_catalogo_id')
            .in('detalle_venta_id', detalleIds);

        if(diErr) {
            console.error('[confirmarDescarga] Error fetching detalle_venta_items:', diErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalle venta items' }, { status: 500 });
        }

        if(!detalleItems || detalleItems.length === 0) {
            console.warn(`[confirmarDescarga] No detalle_venta_items found for venta ${ventaRuta.id}`);
            return NextResponse.json({ ok: false, error: 'No detalle venta items found for venta' }, { status: 404 });
        }

        const { error: updItemsErr } = await supabase
            .from('items_catalogo')
            .update({ direccion_id: destinoReciente.direccion_id })
            .in('id', detalleItems.map(di => di.item_catalogo_id));

        if(updItemsErr) {
            console.error('[confirmarDescarga] Error updating items_catalogo:', updItemsErr);
            return NextResponse.json({ ok: false, error: 'Error updating items catalogo' }, { status: 500 });
        }

        // Update ventas estado and por_cobrar
        const { error: updVentasErr } = await supabase
            .from('ventas')
            .update({ estado: TIPO_ESTADO_VENTA.entregado, por_cobrar: true })
            .eq('id', ventaRuta.id);

        if(updVentasErr) {
            console.error('[confirmarDescarga] Error updating ventas:', updVentasErr);
            return NextResponse.json({ ok: false, error: 'Error updating ventas' }, { status: 500 });
        }

        // Crea un historial de cambio de estado de la venta
        const { error: updHistorialEstadoVentaErr } = await supabase
            .from('venta_historial_estados')
            .insert({
                venta_id: ventaRuta.id,
                estado: TIPO_ESTADO_VENTA.entregado,
                usuario_id: userId,
            });

        if (updHistorialEstadoVentaErr) {
            console.error('[confirmarDescarga] Error inserting venta_historial_estados:', updHistorialEstadoVentaErr);
            return NextResponse.json({ ok: false, error: 'Error updating venta historial estados' }, { status: 500 });
        }        

        // Busca si queda algún destino pendiente
        const ventasRestantes = ventasRuta.filter(v => v.venta_id.id !== ventaRuta.id && v.venta_id.estado !== TIPO_ESTADO_VENTA.entregado);

        // Actualizacion estado de ruta        
        const nuevoEstado = ventasRestantes.length > 0 ? TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino : TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
        
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

        // Actualizar vista BI deudas
        let biDeudas;
        try {
            biDeudas = await syncBIDeudasFromVentas({
                supabase,
                ventaIds: [ventaRuta.id],
                source: 'confirmar_descarga',
            });
        } catch (biError) {
            console.error('[confirmarDescarga] Error syncing bi_deudas:', biError);
            biDeudas = {
                ok: false,
                source: 'confirmar_descarga',
                error: biError.message,
                ventaIds: [ventaRuta.id],
            };
        }
            
        return NextResponse.json({ ok: true, message: 'Descarga confirmada exitosamente', estado: nuevoEstado, biDeudas: { ok: true, source: 'confirmar_descarga', ventaIds: [] } });
    } catch (error) {
        console.error('ERROR in confirmarDescarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}