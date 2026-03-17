import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CATEGORIA_CATALOGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO } from "@/app/utils/constants";

export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        console.log("GET /api/flota/gestorCarga called...");
        
        // Get authenticated user from Supabase
        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's cargo to determine access level and filter criteria
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`
                id,
                tipo,
                sucursal_id,
                dependencia_id
            `)
            .eq("usuario_id", user.id)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ error: "User has no assigned cargo" }, { status: 400 });
        }

        // Determine filter criteria based on cargo
        let filterField;
        let filterValue;
        
        if (cargo.dependencia_id) {
            filterField = "dependencia_id";
            filterValue = cargo.dependencia_id;
        } else if (cargo.sucursal_id) {
            filterField = "sucursal_id";  
            filterValue = cargo.sucursal_id;
        } else {
            return NextResponse.json({ error: "Cargo has no valid dependencia or sucursal" }, { status: 400 });
        }

        // Determine allowed estados based on user role
        const estados = [TIPO_ESTADO_RUTA_DESPACHO.preparacion];
        
        if (cargo.tipo === TIPO_CARGO.conductor) {
            estados.push(TIPO_ESTADO_RUTA_DESPACHO.en_ruta);
        }
        if (cargo.tipo === TIPO_CARGO.encargado || cargo.tipo === TIPO_CARGO.responsable) {
            estados.push(TIPO_ESTADO_RUTA_DESPACHO.descarga);
        }

        // Get rutas de despacho with their related ventas
        const { data: rutasDespacho, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                ventas:ruta_despacho_ventas(
                    venta:ventas(
                        id,
                        tipo,
                        estado,
                        fecha,
                        comentario,
                        direccion_despacho_id,
                        cliente:clientes(
                            id,
                            nombre,
                            rut,
                            direcciones_despacho:cliente_direcciones_despacho(
                                direccion:direcciones(nombre)
                            )
                        )
                    )
                )
            `)
            .eq(filterField, filterValue)
            .in("estado", estados);

        if (rutasError) {
            console.error("Error fetching rutas:", rutasError);
            return NextResponse.json({ error: rutasError.message }, { status: 500 });
        }

        const ventasActuales = [];

        // Process each ruta and its ventas
        for (const ruta of rutasDespacho) {
            // Get carga items for this ruta
            const { data: cargaHistorial, error: cargaError } = await supabase
                .from("ruta_despacho_historial_carga")
                .select(`
                    items:ruta_despacho_historial_carga_items_movidos(
                        item_catalogo:items_catalogo(
                            id,
                            subcategoria_catalogo_id
                        )
                    )
                `)
                .eq("ruta_despacho_id", ruta.id)
                .eq("es_carga", true)
                .order("fecha", { ascending: false })
                .limit(1);

            // Count items by subcategoria in carga
            const contadoresSubcategoriasCarga = {};
            if (cargaHistorial && cargaHistorial.length > 0) {
                const latestCarga = cargaHistorial[0];
                (latestCarga.items || []).forEach(item => {
                    const subcatId = item.item_catalogo.subcategoria_catalogo_id;
                    contadoresSubcategoriasCarga[subcatId] = (contadoresSubcategoriasCarga[subcatId] || 0) + 1;
                });
            }

            // Process each venta in the ruta
            for (const rutaVenta of ruta.ventas) {
                const venta = rutaVenta.venta;

                // Get detalle ventas for this venta
                const { data: detallesVenta, error: detallesError } = await supabase
                    .from("detalle_ventas")
                    .select(`
                        id,
                        venta_id,
                        glosa,
                        tipo,
                        cantidad,
                        subcategoria_catalogo_id,
                        subcategoria:subcategorias_catalogo(
                            id,
                            nombre,
                            unidad,
                            cantidad as multiplicador,
                            sin_sifon,
                            categoria:categorias_catalogo(
                                id,
                                nombre,
                                tipo,
                                elemento,
                                es_industrial,
                                es_medicinal
                            )
                        ),
                        items:detalle_venta_items(item_catalogo_id)
                    `)
                    .eq("venta_id", venta.id);

                if (detallesError) {
                    console.error("Error fetching detalle ventas:", detallesError);
                    continue;
                }

                // Count items by subcategoria in venta
                const contadoresSubcategoriasVenta = {};
                (detallesVenta || []).forEach(detalle => {
                    contadoresSubcategoriasVenta[detalle.subcategoria_catalogo_id] = (contadoresSubcategoriasVenta[detalle.subcategoria_catalogo_id] || 0) + detalle.cantidad;
                });

                const detalles = [];
                let totalCilindros = 0;
                let itemsCompletados = 0;
                const entregaEnLocal = !venta.direccion_despacho_id;

                // Process each detalle
                for (const detalle of detallesVenta || []) {
                    const tipo = detalle.tipo;
                    const multiplicador = detalle.subcategoria?.multiplicador || 1;

                    const procesados = entregaEnLocal 
                        ? contadoresSubcategoriasVenta[detalle.subcategoria_catalogo_id] || 0
                        : contadoresSubcategoriasCarga[detalle.subcategoria_catalogo_id] || 0;

                    const restantes = multiplicador - procesados;
                    
                    detalles.push({
                        tipo,
                        descripcion: detalle.glosa || detalle.subcategoria?.nombre || '',
                        cantidad: detalle.cantidad,
                        restantes,
                        multiplicador,
                        unidad: detalle.subcategoria?.unidad || 'unidad',
                        elemento: detalle.subcategoria?.categoria?.elemento,
                        esIndustrial: detalle.subcategoria?.categoria?.es_industrial,
                        esMedicinal: detalle.subcategoria?.categoria?.es_medicinal,
                        sinSifon: detalle.subcategoria?.sin_sifon
                    });

                    if (tipo === TIPO_CATEGORIA_CATALOGO.cilindro) {
                        totalCilindros += detalle.cantidad;
                        if (restantes === 0) itemsCompletados += detalle.cantidad;
                    }
                }

                const porcentajeCompletado = totalCilindros > 0 ? (itemsCompletados / totalCilindros) * 100 : 0;

                ventasActuales.push({
                    nombreCliente: venta.cliente?.nombre || '',
                    rutCliente: venta.cliente?.rut || '',
                    comentario: venta.comentario,
                    tipo: venta.tipo,
                    totalCilindros,
                    detalles,
                    porcentajeCompletado
                });
            }
        }

        const porcentajeTotal = ventasActuales.length > 0 
            ? ventasActuales.reduce((sum, v) => sum + v.porcentajeCompletado, 0) / ventasActuales.length 
            : 0;

        const gestorCarga = {
            ventas: ventasActuales,
            porcentajeCompletado: porcentajeTotal
        };

        return NextResponse.json({ 
            gestorCarga 
        });

    } catch (error) {
        console.error("Error in gestorCarga:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}