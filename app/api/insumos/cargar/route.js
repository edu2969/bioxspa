import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function POST(request) {
    try {
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { rutaDespachoId, itemId, ventaId } = body;

        if (!itemId) {
            return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 });
        }

        // Busca el item y su subcategoría
        const { data: item, error: itemError } = await supabase
            .from("items_catalogo")
            .select("id, subcategoria_catalogo_id, stock_actual")
            .eq("id", itemId)
            .single();
            
        if (itemError || !item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        // Verifica que la subcategoría exista
        const { data: subcategoria, error: subcategoriaError } = await supabase
            .from("subcategorias_catalogo")
            .select("id")
            .eq("id", item.subcategoria_catalogo_id)
            .single();
            
        if (subcategoriaError || !subcategoria) {
            return NextResponse.json({ ok: false, error: "Subcategoria not found" }, { status: 404 });
        }

        // Actualiza el stock del item (resta 1)
        const { error: updateStockError } = await supabase
            .from("items_catalogo")
            .update({ 
                stock_actual: Math.max(0, (item.stock_actual || 0) - 1) 
            })
            .eq("id", item.id);

        if (updateStockError) {
            console.error("Error updating stock:", updateStockError);
            return NextResponse.json({ ok: false, error: "Error updating item stock" }, { status: 500 });
        }

        if (ventaId) {
            // Busca los detalles de la venta
            const { data: detalles, error: detallesError } = await supabase
                .from("detalle_ventas")
                .select("id, subcategoria_catalogo_id, cantidad")
                .eq("venta_id", ventaId);

            if (detallesError) {
                console.error("Error fetching detalle_ventas:", detallesError);
                return NextResponse.json({ ok: false, error: "Error fetching sale details" }, { status: 500 });
            }

            // Busca el detalle con la misma subcategoría
            const detalleCoincidente = detalles.find(detalle =>
                detalle.subcategoria_catalogo_id === item.subcategoria_catalogo_id
            );
            
            if (!detalleCoincidente) {
                return NextResponse.json({ ok: false, error: "No existe detalle con la misma subcategoría que el item" });
            }

            // Verifica si ya fue escaneado
            const { data: itemsExistentes, error: itemsExistentesError } = await supabase
                .from("detalle_venta_items")
                .select("item_catalogo_id")
                .eq("detalle_venta_id", detalleCoincidente.id);

            if (itemsExistentesError) {
                console.error("Error checking existing items:", itemsExistentesError);
                return NextResponse.json({ ok: false, error: "Error checking existing items" }, { status: 500 });
            }

            const itemIdSet = new Set(itemsExistentes.map(i => i.item_catalogo_id));
            
            if (itemIdSet.has(item.id)) {
                return NextResponse.json({ ok: false, error: "El item ya fue cargado previamente en el detalle" });
            }
            
            // Verifica que no se exceda la cantidad
            if (itemsExistentes.length >= detalleCoincidente.cantidad) {
                return NextResponse.json({ ok: false, error: "No se pueden agregar más items a este detalle, ya se alcanzó la cantidad máxima." });
            }

            // Agrega el item al detalle
            const { error: insertItemError } = await supabase
                .from("detalle_venta_items")
                .insert({
                    detalle_venta_id: detalleCoincidente.id,
                    item_catalogo_id: item.id
                });

            if (insertItemError) {
                console.error("Error inserting item into detalle:", insertItemError);
                return NextResponse.json({ ok: false, error: "Error adding item to sale detail" }, { status: 500 });
            }

            // Actualiza estado de la venta si corresponde
            const { data: venta, error: ventaError } = await supabase
                .from("ventas")
                .select("id, estado")
                .eq("id", ventaId)
                .single();

            if (ventaError) {
                console.error("Error fetching venta:", ventaError);
            } else if (venta.estado === TIPO_ESTADO_VENTA.por_asignar) {
                // Actualizar estado de venta
                const { error: updateVentaError } = await supabase
                    .from("ventas")
                    .update({ estado: TIPO_ESTADO_VENTA.preparacion })
                    .eq("id", ventaId);

                if (updateVentaError) {
                    console.error("Error updating venta estado:", updateVentaError);
                }

                // Insertar historial de estado
                const { error: historialError } = await supabase
                    .from("venta_historial_estados")
                    .insert({
                        venta_id: ventaId,
                        estado: TIPO_ESTADO_VENTA.preparacion,
                        usuario_id: authResult.userData.id
                    });

                if (historialError) {
                    console.error("Error inserting historial estado:", historialError);
                }
            }

        } else if (rutaDespachoId) {
            // Busca la ruta de despacho
            const { data: rutaDespacho, error: rutaError } = await supabase
                .from("rutas_despacho")
                .select("id")
                .eq("id", rutaDespachoId)
                .single();

            if (rutaError || !rutaDespacho) {
                return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
            }

            // Verificar si el item ya está en el historial de carga más reciente
            const { data: ultimoHistorial, error: historialError } = await supabase
                .from("ruta_despacho_historial_carga")
                .select(`
                    id, 
                    items:ruta_despacho_items_movidos(item_catalogo_id)
                `)
                .eq("ruta_despacho_id", rutaDespachoId)
                .eq("es_carga", true)
                .order("fecha", { ascending: false })
                .limit(1);

            if (historialError) {
                console.error("Error fetching historial carga:", historialError);
                return NextResponse.json({ ok: false, error: "Error checking load history" }, { status: 500 });
            }

            let historialCargaId = null;
            
            if (ultimoHistorial.length > 0) {
                const lastHistorial = ultimoHistorial[0];
                const itemsEnHistorial = new Set(lastHistorial.items.map(i => i.item_catalogo_id));
                
                if (itemsEnHistorial.has(item.id)) {
                    return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
                }
                
                historialCargaId = lastHistorial.id;
            } else {
                // Crear nuevo historial de carga
                const { data: nuevoHistorial, error: nuevoHistorialError } = await supabase
                    .from("ruta_despacho_historial_carga")
                    .insert({
                        ruta_despacho_id: rutaDespachoId,
                        es_carga: true,
                        fecha: new Date().toISOString(),
                        usuario_id: authResult.userData.id
                    })
                    .select("id")
                    .single();

                if (nuevoHistorialError) {
                    console.error("Error creating new historial:", nuevoHistorialError);
                    return NextResponse.json({ ok: false, error: "Error creating load history" }, { status: 500 });
                }
                
                historialCargaId = nuevoHistorial.id;
            }

            // Agregar el item al historial de carga
            const { error: insertItemMovidoError } = await supabase
                .from("ruta_despacho_items_movidos")
                .insert({
                    historial_carga_id: historialCargaId,
                    item_catalogo_id: item.id
                });

            if (insertItemMovidoError) {
                console.error("Error inserting item movido:", insertItemMovidoError);
                return NextResponse.json({ ok: false, error: "Error adding item to route load" }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("Error in cargar endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}