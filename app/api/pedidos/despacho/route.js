import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

function buildCargaItemsBucket(cargaItems = []) {
    return (cargaItems || []).reduce((acc, item) => {
        const subcategoriaId = String(item?.subcategoriaCatalogoId || "");
        if (!subcategoriaId) return acc;
        acc[subcategoriaId] = (acc[subcategoriaId] || 0) + 1;
        return acc;
    }, {});
}

function mapVentaParaDespacho(venta, cargaItems = []) {
    return {
        ventaId: venta.id,
        tipo: venta.tipo,
        fecha: venta.fecha,
        comentario: venta.comentario,
        cliente: {
            id: venta.cliente?.id || null,
            nombre: venta.cliente?.nombre || null,
            rut: venta.cliente?.rut || null,
            telefono: venta.cliente?.telefono || null,
        },
        detalles: (venta.detalles || []).map((det) => {
            const cantidadDetalle = Number(det?.cantidad || 0);
            const subcategoriaId = String(det?.subcategoria?.id || "");

            let restantes = cantidadDetalle;

            // Si cargaItems es un bucket (objeto), consumir globalmente por ruta.
            if (cargaItems && !Array.isArray(cargaItems)) {
                const disponibles = Number(cargaItems[subcategoriaId] || 0);
                const usados = Math.min(cantidadDetalle, disponibles);
                cargaItems[subcategoriaId] = Math.max(disponibles - usados, 0);
                restantes = Math.max(cantidadDetalle - usados, 0);
            } else {
                // Entrega en local: descontar por items del mismo detalle (detalle_venta_items).
                const entregadosEnDetalle = (det.items || []).length;
                restantes = Math.max(cantidadDetalle - entregadosEnDetalle, 0);
            }

            return {
                multiplicador: cantidadDetalle,
                restantes,
                itemCatalogoIds: (det.items || []).map((item) => item.item_catalogo_id).filter(Boolean),
                subcategoriaCatalogoId: {
                    id: det.subcategoria?.id,
                    nombre: det.subcategoria?.nombre,
                    unidad: det.subcategoria?.unidad,
                    cantidad: det.subcategoria?.cantidad,
                    categoriaCatalogoId: {
                        id: det.subcategoria?.categoria?.id,
                        nombre: det.subcategoria?.categoria?.nombre,
                        tipo: det.subcategoria?.categoria?.tipo,
                        gas: det.subcategoria?.categoria?.gas,
                        elemento: det.subcategoria?.categoria?.elemento,
                        esIndustrial: det.subcategoria?.categoria?.es_industrial,
                    }
                }
            };
        }),
        direccionesDespacho: venta.direccion_despacho ? [{
            id: venta.direccion_despacho.id || null,
            direccionCliente: venta.direccion_despacho.direccion_cliente || null,
            latitud: venta.direccion_despacho.latitud || null,
            longitud: venta.direccion_despacho.longitud || null,
        }] : [],
        entregasEnLocal: (venta.entregas || []).map((entrega) => ({
            nombreRecibe: entrega.nombre_recibe,
            rutRecibe: entrega.rut_recibe,
            createdAt: entrega.created_at,
        })) || [],
    };
}

function groupVentasByCliente(ventas) {
    const clientesMap = new Map();

    ventas.forEach((venta) => {
        const clienteKey = venta.cliente.id || venta.cliente.rut || venta.ventaId;

        if (!clientesMap.has(clienteKey)) {
            clientesMap.set(clienteKey, {
                cliente: venta.cliente,
                ventas: [],
            });
        }

        clientesMap.get(clienteKey).ventas.push({
            ventaId: venta.ventaId,
            tipo: venta.tipo,
            fecha: venta.fecha,
            comentario: venta.comentario,
            detalles: venta.detalles,
            direccionesDespacho: venta.direccionesDespacho,
            entregasEnLocal: venta.entregasEnLocal,
        });
    });

    return Array.from(clientesMap.values());
}

export async function GET(request) {
    const authResult = await getAuthenticatedUser({ requireAuth: true });

    if (!authResult.success || !authResult.data) {
        return NextResponse.json(
            { ok: false, error: authResult.message || "Usuario no autenticado" },
            { status: 401 }
        );
    }
    const { user } = authResult.data;
    const userId = user.id;

    const usuarioId = request.nextUrl.searchParams.get("usuarioId");
    if (!usuarioId) {
        return NextResponse.json({ ok: false, error: "usuarioId is required" }, { status: 400 });
    }

    if(usuarioId !== userId) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: cargo, error: cargoError } = await supabase
        .from("cargos")
        .select(`id, sucursal_id, dependencia_id`)
        .eq("usuario_id", userId)
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

    let dependenciaIds = [];
    if (cargo.dependencia_id) {
        dependenciaIds = [cargo.dependencia_id];
    } else {
        const { data: dependenciasSucursal, error: dependenciasError } = await supabase
            .from("dependencias")
            .select("id")
            .eq("sucursal_id", sucursalId);

        if (dependenciasError) {
            console.log("Error fetching dependencias for sucursal:", dependenciasError);
            return NextResponse.json({ ok: false, error: dependenciasError.message }, { status: 500 });
        }

        dependenciaIds = (dependenciasSucursal || []).map((dep) => dep.id).filter(Boolean);
    }

    let rutasDespacho = [];
    if (dependenciaIds.length > 0) {
        const { data: rutasData, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                vehiculo:vehiculos(patente),
                conductor:usuarios(nombre),
                ventas:ruta_despacho_ventas(
                    venta:ventas(
                        id,
                        tipo,
                        fecha,
                        comentario,
                        cliente:clientes(
                            id,
                            nombre,
                            rut,
                            telefono
                        ),
                        direccion_despacho:direcciones(id, direccion_cliente, latitud, longitud),
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
            .in("dependencia_id", dependenciaIds)
            .in("estado", [
                TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado
            ]);

        if (rutasError) {
            console.log("Error fetching rutas_despacho:", rutasError);
            return NextResponse.json({ ok: false, error: rutasError.message }, { status: 500 });
        }

        rutasDespacho = rutasData || [];
    }

    // Obtener carga_item_ids para cada ruta
    const cargaItemsPromises = rutasDespacho.map(async (ruta) => {
        const { data: cargaHistorial } = await supabase
            .from("ruta_despacho_historial_carga")
            .select(`
                    items:ruta_despacho_historial_carga_items_movidos(
                        item_catalogo:items_catalogo(id, subcategoria_catalogo_id)
                    )
                `)
            .eq("ruta_despacho_id", ruta.id)
            .eq("es_carga", true);
        const items = cargaHistorial?.flatMap(h => h.items.map(i => ({
            id: i.item_catalogo.id,
            subcategoriaCatalogoId: i.item_catalogo.subcategoria_catalogo_id
        }))) || [];
        return { rutaId: ruta.id, items };
    });

    const cargaItemsResults = await Promise.all(cargaItemsPromises);
    const cargaItemsMap = Object.fromEntries(cargaItemsResults.map(r => [r.rutaId, r.items]));

    const cargamentosRutas = rutasDespacho.map((ruta) => {
        const cargaBucket = buildCargaItemsBucket(cargaItemsMap[ruta.id] || []);
        const ventas = (ruta.ventas || []).map((rv) => mapVentaParaDespacho(rv.venta, cargaBucket));
        const clientes = groupVentasByCliente(ventas);
        const fechaVentaMasReciente = ventas.length > 0 ? new Date(Math.max(...ventas.map(v => new Date(v.fecha)))) : null;

        return {
            rutaDespachoId: ruta.id,
            clientes,
            nombreChofer: ruta.conductor?.nombre || null,
            patenteVehiculo: ruta.vehiculo?.patente || null,
            fechaVentaMasReciente: fechaVentaMasReciente ? fechaVentaMasReciente.toISOString() : null,
            cargaItemIds: cargaItemsMap[ruta.id] || [],
            estado: ruta.estado,
            retiroEnLocal: false,
        };
    });

    const { data: ventasLocales, error: ventasLocalesError } = await supabase
        .from("ventas")
        .select(`
            id,
            tipo,
            fecha,
            comentario,
            estado,
            cliente:clientes(
                id,
                nombre,
                rut,
                telefono
            ),
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
        `)
        .eq("sucursal_id", sucursalId)
        .is("direccion_despacho_id", null)
        .in("estado", [
            TIPO_ESTADO_VENTA.por_asignar,
            TIPO_ESTADO_VENTA.pagado,
            TIPO_ESTADO_VENTA.preparacion,
            TIPO_ESTADO_VENTA.reparto,
        ]);

    if (ventasLocalesError) {
        console.log("Error fetching ventas locales:", ventasLocalesError);
        return NextResponse.json({ ok: false, error: ventasLocalesError.message }, { status: 500 });
    }

    const cargamentosLocales = (ventasLocales || []).map((ventaLocal) => {
        const venta = mapVentaParaDespacho(ventaLocal, []);
        return {
            rutaDespachoId: null,
            clientes: groupVentasByCliente([venta]),
            nombreChofer: null,
            patenteVehiculo: null,
            fechaVentaMasReciente: venta.fecha ? new Date(venta.fecha).toISOString() : null,
            cargaItemIds: [],
            estado: ventaLocal.estado || null,
            retiroEnLocal: true,
        };
    });

    const cargamentos = [...cargamentosRutas, ...cargamentosLocales];

    return NextResponse.json({ ok: true, cargamentos });
}

export async function POST(request) {
    try {
        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }
        const { user } = authResult.data;
        const userId = user.id;

        const { rutaId } = await request.json();
        if (!rutaId) {
            return NextResponse.json({ error: "rutaId is required" }, { status: 400 });
        }

        console.log("[despacho.POST] User", userId, "confirming carga for ruta", rutaId);
        const supabase = await getSupabaseServerClient();

        // Obtener la ruta y sus ventas
        const { data: rutaData, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select("id, ruta_despacho_ventas(venta_id)")
            .eq("id", rutaId)
            .single();
        if (rutaError || !rutaData) {
            console.error("[despacho.POST] ruta not found", rutaError);
            return NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }

        const ventaIds = (rutaData.ruta_despacho_ventas || []).map(r => r.venta_id).filter(Boolean);

        // Obtener detalles de las ventas
        const { data: detallesVentas, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select("id, venta_id, cantidad, subcategoria_catalogo_id")
            .in("venta_id", ventaIds.length ? ventaIds : [null]);
        if (detallesError) {
            console.error("[despacho.POST] error fetching detalle_ventas", detallesError);
            return NextResponse.json({ ok: false, error: detallesError.message }, { status: 500 });
        }

        // Tomar la carga más reciente (es_carga = true)
        const { data: cargas, error: cargasError } = await supabase
            .from("ruta_despacho_historial_carga")
            .select(`
                id,
                items:ruta_despacho_historial_carga_items_movidos(
                    item_catalogo:items_catalogo(id, subcategoria_catalogo_id)
                ),
                fecha
            `)
            .eq("ruta_despacho_id", rutaId)
            .eq("es_carga", true)
            .order("fecha", { ascending: false })
            .limit(1);
        if (cargasError) {
            console.error("[despacho.POST] error fetching ruta_despacho_historial_carga", cargasError);
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
            const subcat = item.subcategoria_catalogo_id;
            const id = item.id;
            if (subcat) {
                cantidadPorSubcat[subcat] = (cantidadPorSubcat[subcat] || 0) + 1;
            }
            if (id) itemCatalogoIds.push(id);
        });

        // Verificar que la carga cubre todos los detalles
        const cargaCompleta = (detallesVentas || []).every(detalle => {
            const subcatId = detalle.subcategoria_catalogo_id;
            const requerido = detalle.cantidad || 0;
            const disponible = cantidadPorSubcat[subcatId] || 0;
            return disponible >= requerido;
        });

        if (!cargaCompleta) {
            console.warn("[despacho.POST] carga incompleta", { rutaId, ventaIds });
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
            .eq("id", rutaId);
        if (updateRutaError) {
            console.error("[despacho.POST] error updating ruta estado", updateRutaError);
            return NextResponse.json({ ok: false, error: updateRutaError.message }, { status: 500 });
        }

        // Insertar historial de estado
        const { error: histEstadoError } = await supabase
            .from("ruta_despacho_historial_estados")
            .insert({ ruta_despacho_id: rutaId, estado: nuevoEstado, usuario_id: userId });
        if (histEstadoError) {
            console.error("[despacho.POST] error inserting ruta_despacho_historial_estados", histEstadoError);
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
            const ventaHistorialRows = (ventaIds || []).map(vid => ({ venta_id: vid, estado: TIPO_ESTADO_VENTA.entregado, usuario_id: userId }));
            const { error: insertVentaHistError } = await supabase
                .from("venta_historial_estados")
                .insert(ventaHistorialRows);
            if (insertVentaHistError) {
                console.error("[despacho.POST] error inserting venta_historial_estados", insertVentaHistError);
            }
        }

        console.log("[despacho.POST] carga confirmada for ruta", rutaId, "items", itemCatalogoIds.length);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({
            error: "Error updating item states.",
            details: error.message
        }, { status: 500 });
    }
}