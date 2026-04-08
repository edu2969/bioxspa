import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * Obtiene los detalles de la venta para la vista de edición de pedidos dado el id de la venta.
 * 
 * @param {*} req 
 * @param {id} props 
 * @returns 
 */
export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    // Validate UUID format (Supabase uses UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
        console.warn(`[GET /ventas/byId] Invalid ID format: ${id}`);
        return NextResponse.json({ error: "ID de venta inválido" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Find the venta using Supabase
    const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .select(`id, sucursalId:sucursal_id, clienteId:cliente_id, tipo, estado, fecha, comentario, 
            direccionDespachoId:direccion_despacho_id, numeroOrden:numero_orden, codigoHes:codigo_hes`)
        .eq('id', id)
        .single();

    if (ventaError || !venta) {
        console.error('Error fetching venta:', ventaError);
        return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    // Obtiene los detalles
    const { data: items, error: detalleVentasError } = await supabase
        .from('detalle_ventas')
        .select(`cantidad, subcategoriaId:subcategoria_catalogo_id,
            subcategoria:subcategoria_catalogo_id(
                id, cantidad, unidad, sinSifon:sin_sifon, categoria:categoria_id(
                    id, elemento, esIndustrial:es_industrial, esMedicinal:es_medicinal
                ), precio:precios(
                    valor, moneda
                ))`)
        .eq('venta_id', id);

    if (detalleVentasError) {
        console.error('Error fetching detalles_venta:', detalleVentasError);
        return NextResponse.json({ error: "Error al obtener los detalles de la venta" }, { status: 500 });
    }

    return NextResponse.json({ ...venta, items }, { status: 200 });
}