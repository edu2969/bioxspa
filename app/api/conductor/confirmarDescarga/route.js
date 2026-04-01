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

        // Get ruta_despacho_destinos por arribar
        const { data: destino, error: destinosErr } = await supabase
            .from('ruta_despacho_destinos')
            .select('id, direccion_id')
            .eq('ruta_despacho_id', rutaId)
            .eq('fecha_arribo', null)
            .single();
        
        if (destinosErr) { 
            console.error('[confirmarDescarga] Error fetching ruta_despacho_destinos:', destinosErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta destinos' }, { status: 500 });
        }

        // Get ventas for this ruta via ruta_despacho_ventas
        const { data: ventaRuta, error: rvErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('id, venta_id')
            .eq('direccion_despacho_id', destino.direccion_id)
            .single();

        if (rvErr) {
            console.error('[confirmarDescarga] Error fetching ruta_despacho_ventas:', rvErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta ventas' }, { status: 500 });
        }
        // Update ventas estado and por_cobrar
        const { error: updVentasErr } = await supabase
            .from('ventas')
            .update({ estado: TIPO_ESTADO_VENTA.entregado, por_cobrar: true })
            .eq('id', ventaRuta.venta_id);

        if(updVentasErr) {
            console.error('[confirmarDescarga] Error updating ventas:', updVentasErr);
            return NextResponse.json({ ok: false, error: 'Error updating ventas' }, { status: 500 });
        }
        
        // Update arribo destino
        const { error: updDestinoErr } = await supabase
            .from('ruta_despacho_destinos')
            .update({ arribo: nowIso })
            .eq('direccion_despacho_id', destino.direccion_id);
        if (updDestinoErr) {
            console.error('[confirmarDescarga] Error updating ruta_despacho_destinos arribo:', updDestinoErr);
            return NextResponse.json({ ok: false, error: 'Error updating destino arribo' }, { status: 500 });
        }

        // Actualizar vista BI deudas
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
            
        return NextResponse.json({ ok: true, message: 'Descarga confirmada exitosamente', estado: nuevoEstado, biDeudas: { ok: true, source: 'confirmar_descarga', ventaIds: [] } });
    } catch (error) {
        console.error('ERROR in confirmarDescarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}