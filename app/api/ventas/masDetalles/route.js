import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const ventaId = searchParams.get("ventaId");
        if (!ventaId) {
            return NextResponse.json({ error: "Falta el parámetro 'ventaId'" }, { status: 400 });
        }

        // Fetch venta with related data using Supabase joins
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select(`
                    id,
                    fecha,
                    estado,
                    por_cobrar,
                    valor_neto,
                    valor_iva,
                    valor_total,
                    venta_entregas_local(
                        id,
                        nombre_recibe,
                        rut_recibe,
                        created_at
                    ),
                    created_at,
                    updated_at,
                    clientes (
                        id,
                        nombre,
                        giro,
                        email,
                        telefono,
                        rut
                    ),
                    usuarios (
                        id,
                        nombre,
                        email
                    ),
                    documentos_tributarios (
                        id,
                        nombre
                    )
                `)
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            console.warn(`No venta found for ID: ${ventaId}`, ventaError);
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        console.log("Fetching detalles de venta from Supabase...");
        // Fetch detalles de venta with all related data
        const { data: detallesVenta, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select(`
                id,
                glosa,
                codigo,
                codigo_cilindro,
                tipo,
                cantidad,
                especifico,
                neto,
                iva,
                total,
                created_at,
                updated_at,
                subcategorias_catalogo (
                    id,
                    nombre,
                    cantidad,
                    unidad,
                    sin_sifon,
                    categorias_catalogo (
                        id,
                        nombre,
                        tipo,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                ),
                detalle_venta_items (
                    detalle_venta_id,
                    item_catalogo_id,
                    created_at
                )
            `)
            .eq("venta_id", ventaId);

        if (detallesError) {
            console.warn(`Error fetching detalles for venta ID: ${ventaId}`, detallesError);
        }

        const ventaDetails = {
            id: venta.id,
            fecha: venta.fecha,
            estado: venta.estado,
            porCobrar: venta.por_cobrar,
            valorNeto: venta.valor_neto,
            valorIva: venta.valor_iva,
            valorTotal: venta.valor_total,
            vendedor: {
                id: venta.usuario?.id,
                nombre: venta.usuario?.nombre,
                email: venta.usuario?.email
            },
            cliente: {
                id: venta.clientes?.id,
                nombre: venta.clientes?.nombre,
                giro: venta.clientes?.giro,
                email: venta.clientes?.email,
                telefono: venta.clientes?.telefono,
                rut: venta.clientes?.rut
            },
            entregasEnLocal: venta.venta_entregas_local || [],
            // Nuevos campos agregados
            detalles: detallesVenta?.map(detalle => ({
                id: detalle.id,
                estado: "Pendiente",
                glosa: detalle.glosa,
                codigo: detalle.codigo,
                codigoCilindro: detalle.codigo_cilindro,
                subcategoriaCatalogoId: detalle.subcategorias_catalogo ? {
                    id: detalle.subcategorias_catalogo.id,
                    nombre: detalle.subcategorias_catalogo.nombre,
                    cantidad: detalle.subcategorias_catalogo.cantidad,
                    unidad: detalle.subcategorias_catalogo.unidad,
                    sinSifon: detalle.subcategorias_catalogo.sin_sifon,
                    categoriaCatalogoId: detalle.subcategorias_catalogo.categorias_catalogo ? {
                        id: detalle.subcategorias_catalogo.categorias_catalogo.id,
                        nombre: detalle.subcategorias_catalogo.categorias_catalogo.nombre,
                        tipo: detalle.subcategorias_catalogo.categorias_catalogo.tipo,
                        elemento: detalle.subcategorias_catalogo.categorias_catalogo.elemento,
                        esIndustrial: detalle.subcategorias_catalogo.categorias_catalogo.es_industrial,
                        esMedicinal: detalle.subcategorias_catalogo.categorias_catalogo.es_medicinal
                    } : null
                } : null,
                detalleVentaItems: Array.isArray(detalle.detalle_venta_items)
                    ? detalle.detalle_venta_items.map(item => ({
                        _id: item.id,
                        codigo: item.codigo,
                        estado: item.estado
                    }))
                    : detalle.detalle_venta_items ? [{
                        id: detalle.detalle_venta_items.id,
                        codigo: detalle.detalle_venta_items.codigo,
                        estado: detalle.detalle_venta_items.estado
                    }] : [],
                tipo: detalle.tipo,
                cantidad: detalle.cantidad,
                especifico: detalle.especifico,
                neto: detalle.neto,
                iva: detalle.iva,
                total: detalle.total
            })) || []
        };

        return NextResponse.json({ ok: true, venta: ventaDetails });

    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}