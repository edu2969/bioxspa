import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_ORDEN } from "@/app/utils/constants";

// filepath: d:\git\bioxspa\app\api\pedidos\confirmarMovimientoCarga\route.js

export async function POST(request) {
    console.log("Starting confirmarMovimientoCarga process");
    try {
        const { rutaId } = await request.json();
        console.log("Request received with rutaId:", rutaId);

        // Validate rutaId
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Get authenticated user from Supabase
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log("User authenticated:", user.id);

        // Verify the user has an active conductor cargo
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("id, tipo, usuario_id")
            .eq("usuario_id", user.id)
            .eq("tipo", TIPO_CARGO.conductor)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        // Find the rutaDespacho and verify user is assigned as driver
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                chofer_id,
                estado,
                dependencia_id
            `)
            .eq("id", rutaId)
            .single();

        if (rutaError || !rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.chofer_id !== user.id) {
            return NextResponse.json({ ok: false, error: "User is not the assigned driver for this route" }, { status: 403 });
        }

        // Get current date
        const now = new Date().toISOString();

        // Get the last destination of the route (most recent by creation order)
        const { data: rutaDestinos, error: destinosError } = await supabase
            .from("ruta_despacho_destinos")
            .select("id, direccion_destino_id, fecha_arribo")
            .eq("ruta_despacho_id", rutaId)
            .order("created_at", { ascending: false })
            .limit(1);

        if (destinosError) {
            console.error("Error fetching route destinations:", destinosError);
            return NextResponse.json({ ok: false, error: "Error fetching route destinations" }, { status: 500 });
        }

        const lastDestino = rutaDestinos && rutaDestinos.length > 0 ? rutaDestinos[0] : null;
        if (!lastDestino) {
            return NextResponse.json({ ok: false, error: "No destination found for this route" }, { status: 400 });
        }

        const lastDireccionId = lastDestino.direccion_destino_id;

        // Get items currently loaded in the route (from latest carga)
        const { data: cargaHistorial, error: cargaError } = await supabase
            .from("ruta_despacho_historial_carga_historial_carga")
            .select(`
                id,
                items:ruta_despacho_historial_carga_items_movidos(
                    item_catalogo_id
                )
            `)
            .eq("ruta_despacho_id", rutaId)
            .eq("es_carga", true)
            .order("fecha", { ascending: false })
            .limit(1);

        if (cargaError) {
            console.error("Error fetching carga historial:", cargaError);
            return NextResponse.json({ ok: false, error: "Error fetching cargo information" }, { status: 500 });
        }

        const itemMovidoIds = cargaHistorial && cargaHistorial.length > 0 
            ? cargaHistorial[0].items.map(item => item.item_catalogo_id)
            : [];

        // Update the direccion_id of moved items
        if (itemMovidoIds.length > 0 && lastDireccionId) {
            const { error: updateItemsError } = await supabase
                .from("items_catalogo")
                .update({ direccion_id: lastDireccionId })
                .in("id", itemMovidoIds);

            if (updateItemsError) {
                console.error("Error updating items direccion_id:", updateItemsError);
                return NextResponse.json({ ok: false, error: "Error updating items location" }, { status: 500 });
            }
        }

        // Get ventas associated with this route
        const { data: rutaVentas, error: ventasRutaError } = await supabase
            .from("ruta_despacho_ventas")
            .select(`
                venta:ventas(
                    id,
                    tipo,
                    cliente_id,
                    direccion_despacho_id
                )
            `)
            .eq("ruta_despacho_id", rutaId);

        if (ventasRutaError) {
            console.error("Error fetching route ventas:", ventasRutaError);
            return NextResponse.json({ ok: false, error: "Error fetching route sales" }, { status: 500 });
        }

        const ventas = rutaVentas.map(rv => rv.venta);

        // Filter ventas that match the last destination
        const ventasEnDireccion = ventas.filter(v => v.direccion_despacho_id === lastDireccionId);

        if (ventasEnDireccion.length > 0) {
            for (const venta of ventasEnDireccion) {
                // Get detalle ventas for this venta
                const { data: detalles, error: detallesError } = await supabase
                    .from("detalle_ventas")
                    .select(`
                        id,
                        cantidad,
                        items:detalle_venta_items(item_catalogo_id)
                    `)
                    .eq("venta_id", venta.id);

                if (detallesError) {
                    console.error("Error fetching detalle ventas:", detallesError);
                    continue;
                }

                // Check if all items have been scanned
                const todosEscaneados = (detalles || []).every(detalle => {
                    const itemsEscaneados = detalle.items ? detalle.items.length : 0;
                    return itemsEscaneados === detalle.cantidad;
                });

                const tipoOrden = venta.tipo;
                
                // Determine new state and porCobrar
                const nuevoEstado = tipoOrden === TIPO_ORDEN.traslado 
                    ? TIPO_ESTADO_VENTA.retirado
                    : (todosEscaneados ? TIPO_ESTADO_VENTA.entregado : TIPO_ESTADO_VENTA.por_asignar);
                const nuevoPorCobrar = todosEscaneados;

                // Update venta
                const { error: updateVentaError } = await supabase
                    .from("ventas")
                    .update({
                        estado: nuevoEstado,
                        por_cobrar: nuevoPorCobrar
                    })
                    .eq("id", venta.id);

                if (updateVentaError) {
                    console.error("Error updating venta:", updateVentaError);
                }

                // Add to venta historial estados
                const { error: historialVentaError } = await supabase
                    .from("venta_historial_estados")
                    .insert({
                        venta_id: venta.id,
                        estado: nuevoEstado,
                        fecha: now,
                        usuario_id: user.id
                    });

                if (historialVentaError) {
                    console.error("Error adding venta historial:", historialVentaError);
                }
            }
        }

        // Determine if there are any retiro (traslado) operations
        const tieneRetiro = ventasEnDireccion.some(v => v.tipo === TIPO_ORDEN.traslado);
        const estadoFinal = tieneRetiro ? TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada 
            : TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;

        // Update route status
        const { error: updateRutaError } = await supabase
            .from("rutas_despacho")
            .update({ estado: estadoFinal })
            .eq("id", rutaId);

        if (updateRutaError) {
            console.error("Error updating ruta estado:", updateRutaError);
            return NextResponse.json({ ok: false, error: "Error updating route status" }, { status: 500 });
        }

        // Add to route historial estados
        const { error: historialRutaError } = await supabase
            .from("ruta_despacho_historial_estados")
            .insert({
                ruta_despacho_id: rutaId,
                estado: estadoFinal,
                fecha: now,
                usuario_id: user.id
            });

        if (historialRutaError) {
            console.error("Error adding ruta historial:", historialRutaError);
        }

        // Add to historial carga (descarga record)
        if (itemMovidoIds.length > 0) {
            // First insert the historial_carga record
            const { data: historialCargaRecord, error: historialCargaError } = await supabase
                .from("ruta_despacho_historial_carga")
                .insert({
                    ruta_despacho_id: rutaId,
                    fecha: now,
                    es_carga: tieneRetiro,
                    usuario_id: user.id
                })
                .select("id")
                .single();

            if (historialCargaError) {
                console.error("Error adding historial carga:", historialCargaError);
            } else {
                // Then insert the individual item movements
                const itemMovimientos = itemMovidoIds.map(itemId => ({
                    ruta_despacho_historial_carga_id: historialCargaRecord.id,
                    item_catalogo_id: itemId
                }));

                const { error: itemMovimientosError } = await supabase
                    .from("ruta_despacho_historial_carga_items_movidos")
                    .insert(itemMovimientos);

                if (itemMovimientosError) {
                    console.error("Error adding item movements:", itemMovimientosError);
                }
            }
        }

        return NextResponse.json({
            ok: true,
            message: "Unloading confirmation successful"
        });

    } catch (error) {
        console.error("Error in POST /confirmarMovimientoCarga:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
