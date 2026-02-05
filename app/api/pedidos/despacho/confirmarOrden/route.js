import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO } from "@/app/utils/constants";

export async function POST() {
    try {
        console.log("[CONFIRMAR ORDEN] Iniciando proceso de confirmación de orden (Supabase)");

        const { user } = await getAuthenticatedUser();
        if (!user) {
            console.warn("[CONFIRMAR ORDEN] Usuario no autenticado");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = user.id;
        console.log(`[CONFIRMAR ORDEN] Usuario autenticado: ${choferId}`);

        // Verificar que el usuario tenga cargo de chofer activo
        const { data: cargoChofer, error: cargoErr } = await supabase
            .from('cargos')
            .select('id, hasta')
            .eq('usuario_id', choferId)
            .eq('tipo', TIPO_CARGO.conductor)
            .limit(1)
            .maybeSingle();

        if (cargoErr) {
            console.error('[CONFIRMAR ORDEN] Error consultando cargos:', cargoErr);
            return NextResponse.json({ ok: false, error: 'Error checking cargo' }, { status: 500 });
        }

        const now = new Date();
        if (!cargoChofer || (cargoChofer.hasta && new Date(cargoChofer.hasta) < now)) {
            console.warn(`[CONFIRMAR ORDEN] Usuario ${choferId} no tiene cargo de chofer activo`);
            return NextResponse.json({ ok: false, error: 'No autorizado: no es chofer activo' }, { status: 403 });
        }

        // Buscar la ruta asociada al chofer en estado orden_cargada
        const { data: rutaDespacho, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, estado, ruta_ventas(venta_id)')
            .eq('conductor_id', choferId)
            .eq('estado', TIPO_ESTADO_RUTA_DESPACHO.orden_cargada)
            .maybeSingle();

        if (rutaErr) {
            console.error('[CONFIRMAR ORDEN] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaDespacho) {
            console.warn(`[CONFIRMAR ORDEN] No se encontró ruta en estado 'orden_cargada' para chofer ${choferId}`);
            return NextResponse.json({ ok: false, error: "No hay ruta en estado 'orden_cargada' para este chofer" }, { status: 404 });
        }

        // Actualizar estado de la ruta a orden_confirmada
        const { error: updateErr } = await supabase
            .from('rutas_despacho')
            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada })
            .eq('id', rutaDespacho.id);

        if (updateErr) {
            console.error('[CONFIRMAR ORDEN] Error actualizando estado de ruta:', updateErr);
            return NextResponse.json({ ok: false, error: 'Error updating ruta state' }, { status: 500 });
        }

        // Insertar historial de estado
        const { error: histErr } = await supabase
            .from('ruta_historial_estados')
            .insert({ ruta_id: rutaDespacho.id, estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada });

        if (histErr) {
            console.error('[CONFIRMAR ORDEN] Error insertando historial de estado:', histErr);
        }

        // Si la ruta tiene exactamente una venta, intentar agregar destino si el cliente tiene una sola dirección de despacho
        const ventaIds = (rutaDespacho.ruta_ventas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length === 1) {
            const ventaId = ventaIds[0];
            const { data: venta, error: ventaErr } = await supabase
                .from('ventas')
                .select('id, cliente_id')
                .eq('id', ventaId)
                .maybeSingle();

            if (ventaErr) {
                console.error('[CONFIRMAR ORDEN] Error fetching venta:', ventaErr);
            } else if (venta && venta.cliente_id) {
                const { data: direcciones, error: dirErr } = await supabase
                    .from('cliente_direcciones_despacho')
                    .select('direccion_id')
                    .eq('cliente_id', venta.cliente_id);

                if (dirErr) {
                    console.error('[CONFIRMAR ORDEN] Error fetching cliente direcciones:', dirErr);
                } else if (direcciones && direcciones.length === 1) {
                    const direccionId = direcciones[0].direccion_id;

                    // Verificar si ya existe ese destino en la ruta
                    const { data: existingDestino, error: exErr } = await supabase
                        .from('ruta_destinos')
                        .select('id')
                        .eq('ruta_id', rutaDespacho.id)
                        .eq('direccion_id', direccionId)
                        .limit(1);

                    if (exErr) console.error('[CONFIRMAR ORDEN] Error checking ruta_destinos:', exErr);

                    if (!existingDestino || existingDestino.length === 0) {
                        const { error: insErr } = await supabase
                            .from('ruta_destinos')
                            .insert({ ruta_id: rutaDespacho.id, direccion_id: direccionId, fecha_arribo: null });
                        if (insErr) console.error('[CONFIRMAR ORDEN] Error inserting ruta_destinos:', insErr);

                        // Actualizar estado a seleccion_destino
                        const { error: upd2Err } = await supabase
                            .from('rutas_despacho')
                            .update({ estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino })
                            .eq('id', rutaDespacho.id);
                        if (upd2Err) console.error('[CONFIRMAR ORDEN] Error updating ruta to seleccion_destino:', upd2Err);
                    }
                }
            }
        }

        console.log('[CONFIRMAR ORDEN] Orden confirmada y cambios aplicados');
        return NextResponse.json({ ok: true, message: 'Orden confirmada correctamente' });
    } catch (error) {
        console.error('[CONFIRMAR ORDEN] Error interno:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}