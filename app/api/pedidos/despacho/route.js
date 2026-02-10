import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(request) {
    try {
        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`id, sucursal_id, dependencia_id`)
            .eq("usuario_id", user.id)
            .in("tipo", [TIPO_CARGO.despacho, TIPO_CARGO.responsable])
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "User has no assigned cargo" }, { status: 400 });
        }

        // Determinar la sucursal_id para filtrar rutas
        let sucursalId = null;
        if (cargo.sucursal_id) {
            sucursalId = cargo.sucursal_id;
        } else if (cargo.dependencia_id) {
            const { data: dependencias } = await supabase
                .from("dependencias")
                .select("sucursal_id")
                .eq("id", cargo.dependencia_id)
                .single();
            if (dependencias) {
                sucursalId = dependencias.sucursal_id;
            }
        }

        if (!sucursalId) {
            return NextResponse.json({ ok: false, error: "No valid sucursal found for user cargo" }, { status: 400 });
        }

        const { data: rutasDespacho, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                vehiculo:vehiculos(patente),
                conductor:usuarios(nombre),
                ventas:ruta_ventas(
                    venta:ventas(
                        id,
                        tipo,
                        fecha,
                        comentario,
                        cliente:clientes(
                            nombre,
                            rut,
                            telefono
                        ),
                        direccion_despacho:direcciones(id, nombre, latitud, longitud),
                        detalles:detalle_ventas(
                            cantidad,
                            subcategoria:subcategorias_catalogo(
                                id,
                                nombre,
                                unidad,
                                cantidad,
                                categoria:categorias_catalogo(
                                    id,
                                    nombre,
                                    tipo,
                                    gas,
                                    elemento,
                                    es_industrial
                                )
                            ),
                            items:detalle_venta_items(item_catalogo_id)
                        ),
                        entregas:venta_entregas_local(
                            nombre_recibe,
                            rut_recibe,
                            created_at
                        )
                    )
                )
            `)
            .eq("dependencia_id", cargo.dependencia_id)
            .in("estado", [
                TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                TIPO_ESTADO_RUTA_DESPACHO.descarga,
                TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado
            ]);

        if (rutasError) {
            return NextResponse.json({ ok: false, error: rutasError.message }, { status: 500 });
        }

        // Obtener carga_item_ids para cada ruta
        const cargaItemsPromises = rutasDespacho.map(async (ruta) => {
            const { data: cargaHistorial } = await supabase
                .from("ruta_historial_carga")
                .select(`
                    items:ruta_items_movidos(
                        item_catalogo:items_catalogo(id, subcategoria_id)
                    )
                `)
                .eq("ruta_id", ruta.id)
                .eq("es_carga", true);
            const items = cargaHistorial?.flatMap(h => h.items.map(i => ({
                id: i.item_catalogo.id,
                subcategoria_catalogo_id: i.item_catalogo.subcategoria_id
            }))) || [];
            return { rutaId: ruta.id, items };
        });

        const cargaItemsResults = await Promise.all(cargaItemsPromises);
        const cargaItemsMap = Object.fromEntries(cargaItemsResults.map(r => [r.rutaId, r.items]));

        const cargamentos = rutasDespacho.map((ruta) => {
            const ventas = ruta.ventas.map((rv) => {
                const venta = rv.venta;
                return {
                    venta_id: venta.id,
                    tipo: venta.tipo,
                    fecha: venta.fecha,
                    comentario: venta.comentario,
                    cliente: {
                        nombre: venta.cliente?.nombre || null,
                        rut: venta.cliente?.rut || null,
                        direccion: venta.cliente?.direccion_principal?.direccion || null,
                        telefono: venta.cliente?.telefono || null,
                        direcciones_despacho: venta.direcciones_despacho?.map(dd => ({
                            nombre: dd.direccion?.nombre || null,
                            direccion_id: dd.direccion_id || null,
                            latitud: dd.direccion?.latitud || null,
                            longitud: dd.direccion?.longitud || null
                        })) || []
                    },
                    detalles: venta.detalles.map((det) => ({
                        multiplicador: det.cantidad,
                        restantes: det.cantidad - (cargaItemsMap[ruta.id] || []).filter(i => i.subcategoria_catalogo_id === det.subcategoria?.id).length,
                        subcategoria_catalogo_id: {
                            id: det.subcategoria?.id,
                            nombre: det.subcategoria?.nombre,
                            unidad: det.subcategoria?.unidad,
                            cantidad: det.subcategoria?.cantidad,
                            categoria_catalogo_id: {
                                id: det.subcategoria?.categoria?.id,
                                nombre: det.subcategoria?.categoria?.nombre,
                                tipo: det.subcategoria?.categoria?.tipo,
                                gas: det.subcategoria?.categoria?.gas,
                                elemento: det.subcategoria?.categoria?.elemento,
                                es_industrial: det.subcategoria?.categoria?.es_industrial
                            }
                        }
                    })),
                    entregas_en_local: venta.entregas?.map(e => ({
                        nombre_recibe: e.nombre_recibe,
                        rut_recibe: e.rut_recibe,
                        created_at: e.created_at
                    })) || []
                };
            });

            const fecha_venta_mas_reciente = ventas.length > 0 ? new Date(Math.max(...ventas.map(v => new Date(v.fecha)))) : null;

            const retiro_en_local = ventas.some(v => v.entregas_en_local.length > 0);

            return {
                ruta_id: ruta.id,
                ventas,
                nombre_chofer: ruta.conductor?.nombre || null,
                patente_vehiculo: ruta.vehiculo?.patente || null,
                fecha_venta_mas_reciente,
                carga_item_ids: cargaItemsMap[ruta.id] || [],
                estado: ruta.estado,
                retiro_en_local
            };
        });

        return NextResponse.json({ ok: true, cargamentos });
    } catch (error) {
        console.error("Error fetching despacho data:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { ruta_id } = await request.json();
        if (!ruta_id) {
            return NextResponse.json({ error: "ruta_id is required" }, { status: 400 });
        }

        console.log("[despacho.POST] User", user.id, "confirming carga for ruta", ruta_id);

        // Obtener la ruta y sus ventas
        const { data: rutaData, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select("id, ruta_ventas(venta_id)")
            .eq("id", ruta_id)
            .single();
        if (rutaError || !rutaData) {
            console.error("[despacho.POST] ruta not found", rutaError);
            return NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }

        const ventaIds = (rutaData.ruta_ventas || []).map(r => r.venta_id).filter(Boolean);

        // Obtener detalles de las ventas
        const { data: detallesVentas, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select("id, venta_id, cantidad, subcategoria_id")
            .in("venta_id", ventaIds.length ? ventaIds : [null]);
        if (detallesError) {
            console.error("[despacho.POST] error fetching detalle_ventas", detallesError);
            return NextResponse.json({ ok: false, error: detallesError.message }, { status: 500 });
        }

        // Tomar la carga más reciente (es_carga = true)
        const { data: cargas, error: cargasError } = await supabase
            .from("ruta_historial_carga")
            .select(`
                id,
                items:ruta_items_movidos(
                    item_catalogo:items_catalogo(id, subcategoria_id)
                ),
                fecha
            `)
            .eq("ruta_id", ruta_id)
            .eq("es_carga", true)
            .order("fecha", { ascending: false })
            .limit(1);
        if (cargasError) {
            console.error("[despacho.POST] error fetching ruta_historial_carga", cargasError);
            return NextResponse.json({ ok: false, error: cargasError.message }, { status: 500 });
        }

        const latestCarga = cargas && cargas.length ? cargas[0] : null;
        if (!latestCarga) {
            return NextResponse.json({ error: "No carga found for this route" }, { status: 400 });
        }

        // Contar items por subcategoria en la carga
        const cantidadPorSubcat = {};
        const itemCatalogoIds = [];
        (latestCarga.items || []).forEach(it => {
            const item = it.item_catalogo;
            if (!item) return;
            const subcat = item.subcategoria_id;
            const id = item.id;
            if (subcat) {
                cantidadPorSubcat[subcat] = (cantidadPorSubcat[subcat] || 0) + 1;
            }
            if (id) itemCatalogoIds.push(id);
        });

        // Verificar que la carga cubre todos los detalles
        const cargaCompleta = (detallesVentas || []).every(detalle => {
            const subcatId = detalle.subcategoria_id;
            const requerido = detalle.cantidad || 0;
            const disponible = cantidadPorSubcat[subcatId] || 0;
            return disponible >= requerido;
        });

        if (!cargaCompleta) {
            console.warn("[despacho.POST] carga incompleta", { ruta_id, ventaIds });
            return NextResponse.json({
                error: "La carga no está complete. Faltan elementos por cargar.",
                message: "No se puede confirmar la carga hasta que todos los pedidos estén cubiertos."
            }, { status: 400 });
        }

        // Determinar tipo de las ventas
        const { data: ventasRuta, error: ventasError } = await supabase
            .from("ventas")
            .select("id, tipo, estado")
            .in("id", ventaIds.length ? ventaIds : [null]);
        if (ventasError) {
            console.error("[despacho.POST] error fetching ventas", ventasError);
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }

        const todasSonTraslado = (ventasRuta || []).every(v => v.tipo === TIPO_ORDEN.traslado);

        // Actualizar estado de la ruta
        const nuevoEstado = todasSonTraslado ? TIPO_ESTADO_RUTA_DESPACHO.terminado : TIPO_ESTADO_RUTA_DESPACHO.orden_cargada;
        const { error: updateRutaError } = await supabase
            .from("rutas_despacho")
            .update({ estado: nuevoEstado })
            .eq("id", ruta_id);
        if (updateRutaError) {
            console.error("[despacho.POST] error updating ruta estado", updateRutaError);
            return NextResponse.json({ ok: false, error: updateRutaError.message }, { status: 500 });
        }

        // Insertar historial de estado
        const { error: histEstadoError } = await supabase
            .from("ruta_historial_estados")
            .insert({ ruta_id: ruta_id, estado: nuevoEstado, usuario_id: user.id });
        if (histEstadoError) {
            console.error("[despacho.POST] error inserting ruta_historial_estados", histEstadoError);
        }

        // Si todas son traslado, marcar ventas como entregado y agregar historial de ventas
        if (todasSonTraslado && ventaIds.length) {
            const { error: updateVentasError } = await supabase
                .from("ventas")
                .update({ estado: TIPO_ESTADO_VENTA.entregado })
                .in("id", ventaIds);
            if (updateVentasError) {
                console.error("[despacho.POST] error updating ventas", updateVentasError);
            }

            // Insertar historial de estado para cada venta
            const ventaHistorialRows = (ventaIds || []).map(vid => ({ venta_id: vid, estado: TIPO_ESTADO_VENTA.entregado, usuario_id: user.id }));
            const { error: insertVentaHistError } = await supabase
                .from("venta_historial_estados")
                .insert(ventaHistorialRows);
            if (insertVentaHistError) {
                console.error("[despacho.POST] error inserting venta_historial_estados", insertVentaHistError);
            }
        }

        console.log("[despacho.POST] carga confirmada for ruta", ruta_id, "items", itemCatalogoIds.length);

        return NextResponse.json({ ok: true });
        
    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ 
            error: "Error updating item states.",
            details: error.message 
        }, { status: 500 });
    }
}