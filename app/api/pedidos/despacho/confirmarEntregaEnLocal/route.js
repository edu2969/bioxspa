import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { generateBIDeuda } from "@/lib/bi/deudaGenerator";

export async function POST(request) {
    try {
        const { data: user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { ventaId, nombreRecibe, rutRecibe } = await request.json();
        if (!ventaId || nombreRecibe === undefined || rutRecibe === undefined) {
            return NextResponse.json({ ok: false, error: "ventaId, nombreRecibe and rutRecibe are required" }, { status: 400 });
        }
        const supabase = await getSupabaseServerClient();
        // Obtiene los detalles de la venta con sus items asociados
        const { data: detalles, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select(`
                id,
                cantidad,
                items:detalle_venta_items(item_catalogo_id)
            `)
            .eq("venta_id", ventaId);

        if (detallesError || !detalles || detalles.length === 0) {
            return NextResponse.json({ ok: false, error: "No existen detalles para la venta" }, { status: 404 });
        }

        // Obtiene la venta actual
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select(`
                id,
                estado,
                tipo,
                entregas:venta_entregas_local(
                    id,
                    items:entrega_local_items(item_catalogo_id)
                )
            `)
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Reúne todos los itemCatalogoIds de los detalles
        const allDetalleItemIds = detalles.flatMap(d => 
            d.items?.map(item => item.item_catalogo_id) || []
        );

        // Reúne todos los itemCatalogoIds ya entregados
        const entregados = venta.entregas?.flatMap(e => 
            e.items?.map(item => item.item_catalogo_id) || []
        ) || [];

        // Filtra los nuevos items escaneados
        const nuevosItems = allDetalleItemIds.filter(id => !entregados.includes(id));

        // Si hay nuevos items, inserta una nueva entrega
        if (nuevosItems.length > 0) {
            // Crear nueva entrega
            const { data: nuevaEntrega, error: entregaError } = await supabase
                .from("venta_entregas_local")
                .insert({
                    venta_id: ventaId,
                    nombre_recibe: nombreRecibe || "",
                    rut_recibe: rutRecibe || ""
                })
                .select("id")
                .single();

            if (entregaError) {
                console.error("Error creating entrega:", entregaError);
                return NextResponse.json({ ok: false, error: "Error creating delivery record" }, { status: 500 });
            }

            // Insertar items de la entrega
            const itemsEntrega = nuevosItems.map(itemId => ({
                entrega_id: nuevaEntrega.id,
                item_catalogo_id: itemId
            }));

            const { error: itemsError } = await supabase
                .from("entrega_local_items")
                .insert(itemsEntrega);

            if (itemsError) {
                console.error("Error inserting entrega items:", itemsError);
                return NextResponse.json({ ok: false, error: "Error recording delivery items" }, { status: 500 });
            }
        }

        // Verifica si todos los detalles tienen la cantidad de itemCatalogoIds igual a cantidad
        let completa = true;
        for (const detalle of detalles) {
            const itemCount = detalle.items?.length || 0;
            if (itemCount < detalle.cantidad) {
                completa = false;
                break;
            }
        }

        // Actualiza el estado de la venta si corresponde
        const nuevoEstado = completa ? TIPO_ESTADO_VENTA.entregado : TIPO_ESTADO_VENTA.por_asignar;
        if (venta.estado !== nuevoEstado) {
            // Actualizar estado de venta
            const { error: updateVentaError } = await supabase
                .from("ventas")
                .update({ estado: nuevoEstado })
                .eq("id", ventaId);

            if (updateVentaError) {
                console.error("Error updating venta estado:", updateVentaError);
                return NextResponse.json({ ok: false, error: "Error updating sale status" }, { status: 500 });
            }

            // Insertar historial de estado
            const { error: historialError } = await supabase
                .from("venta_historial_estados")
                .insert({
                    venta_id: ventaId,
                    estado: nuevoEstado,
                    usuario_id: user.id
                });

            if (historialError) {
                console.error("Error inserting historial estado:", historialError);
            }

            // Si la entrega está completa, generar registros de BI
            if (completa && nuevoEstado === TIPO_ESTADO_VENTA.entregado) {
                // Obtener venta completa para BI
                const { data: ventaCompleta, error: ventaCompletaError } = await supabase
                    .from("ventas")
                    .select("*")
                    .eq("id", ventaId)
                    .single();

                if (ventaCompleta && !ventaCompletaError) {
                    console.log(`Generando BI para entrega local completa - Venta: ${ventaId}`);
                    await generateBIDeuda(ventaCompleta);
                }
            }
        }

        return NextResponse.json({ ok: true, estado: nuevoEstado });

    } catch (error) {
        console.error("Error in confirmarEntregaEnLocal endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}