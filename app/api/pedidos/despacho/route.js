import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(request) {
    try {
        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log(`[GET /api/pedidos/despacho] Authenticated user: ${user.id}`);

        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`id, sucursal_id, dependencia_id`)
            .eq("usuario_id", user.id)
            .in("tipo", [TIPO_CARGO.despacho, TIPO_CARGO.responsable])
            .single();

        console.log(`[GET /api/pedidos/despacho] Cargo fetched for user ${user.id}: ${cargo ? `sucursal ${cargo.sucursal_id}, dependencia ${cargo.dependencia_id}` : 'failed'}`);

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "User has no assigned cargo" }, { status: 400 });
        }

        // Determinar la sucursal_id para filtrar rutas
        let sucursalId = null;
        if (cargo.sucursal_id) {
            console.log("[GET /api/pedidos/despacho] Using cargo's sucursal_id:", cargo.sucursal_id);
            sucursalId = cargo.sucursal_id;
        } else if (cargo.dependencia_id) {
            console.log("[GET /api/pedidos/despacho] Fetching sucursal for dependencia_id:", cargo.dependencia_id);
            const { data: dependencias } = await supabase
                .from("dependencias")
                .select("sucursal_id")
                .eq("id", cargo.dependencia_id)
                .single();
            console.log("[GET /api/pedidos/despacho] Sucursal fetched for dependencia:", dependencias);
            if (dependencias) {
                console.log("[GET /api/pedidos/despacho] Using fetched sucursal id:", dependencias.sucursal_id);
                sucursalId = dependencias.sucursal_id;
            }
        }

        if (!sucursalId) {
            console.log(`[GET /api/pedidos/despacho] No valid sucursal found for cargo ${cargo.id}`);
            return NextResponse.json({ ok: false, error: "No valid sucursal found for user cargo" }, { status: 400 });
        }

        console.log("[GET /api/pedidos/despacho] Using sucursalId:", sucursalId);

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

        console.log(`[GET /api/pedidos/despacho] Fetched ${rutasDespacho?.length ?? '??'} rutas for sucursal ${sucursalId}`);

        if (rutasError) {
            console.error("Error fetching rutas_despacho:", rutasError);
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
                        restantes: det.cantidad, // Asumir restantes = cantidad inicialmente
                        item_catalogo_ids: det.items?.map(i => i.item_catalogo_id) || [],
                        subcategoria_catalogo_id: {
                            id: det.subcategoria?.id,
                            nombre: det.subcategoria?.nombre,
                            unidad: det.subcategoria?.unidad,
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

        console.log(`[GET /api/pedidos/despacho] Processed ${cargamentos.length} cargamentos`);

        return NextResponse.json({ ok: true, cargamentos });
    } catch (error) {
        console.error("Error fetching despacho data:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}