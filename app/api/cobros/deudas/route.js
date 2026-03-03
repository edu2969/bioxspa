import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const clienteId = searchParams.get("id");
        if (!clienteId) {
            return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
        }

        // Buscar el cliente
        const { data: cliente, error: clienteError } = await supabase
            .from("clientes")
            .select("id, nombre")
            .eq("id", clienteId)
            .single();

        if (clienteError || !cliente) {
            return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
        }

        // Buscar documentos tributarios que sean de venta
        const { data: documentosTributarios, error: docsError } = await supabase
            .from("documentos_tributarios")
            .select("id")
            .eq("venta", true);

        if (docsError) {
            console.error("Error fetching documentos tributarios:", docsError);
            return NextResponse.json({ ok: false, error: docsError.message }, { status: 500 });
        }

        const documentoIds = documentosTributarios.map(d => d.id);

        // Buscar ventas por cobrar del cliente
        const { data: ventas, error: ventasError } = await supabase
            .from("ventas")
            .select(`
                id,
                codigo,
                fecha,
                valor_total,
                saldo,
                vendedor:usuarios(id, nombre),
                documento_tributario:documentos_tributarios(id, nombre),
                direccion_despacho:direcciones(id, nombre)
            `)
            .eq("cliente_id", clienteId)
            .eq("por_cobrar", true)
            .eq("estado", TIPO_ESTADO_VENTA.entregado)
            .gt("valor_total", 0)
            .in("documento_tributario_id", documentoIds.length ? documentoIds : [null])
            .order("fecha", { ascending: false });

        if (ventasError) {
            console.error("Error fetching ventas:", ventasError);
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }

        if (!ventas || ventas.length === 0) {
            return NextResponse.json({
                ok: true,
                ventas: []
            });
        }

        const ventaIds = ventas.map(v => v.id);

        // Buscar detalles de cada venta con subcategoría y categoría
        const { data: detalles, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select(`
                id,
                venta_id,
                glosa,
                cantidad,
                neto,
                iva,
                total,
                subcategoria:subcategorias_catalogo(
                    id,
                    cantidad,
                    unidad,
                    sin_sifon,
                    categoria:categorias_catalogo(
                        id,
                        es_industrial,
                        codigo,
                        elemento
                    )
                )
            `)
            .in("venta_id", ventaIds);

        if (detallesError) {
            console.error("Error fetching detalle ventas:", detallesError);
            return NextResponse.json({ ok: false, error: detallesError.message }, { status: 500 });
        }

        // Adorna ventas con detalles y vendedor
        const ventasDetalladas = ventas.map(v => {
            const detallesVenta = (detalles || []).filter(d => d.venta_id === v.id);
            return {
                ventaId: v.id,
                folio: v.codigo,
                fecha: v.fecha,
                total: v.valor_total,
                saldo: v.saldo ?? 0,
                vendedor: v.vendedor?.nombre || "",
                documento: v.documento_tributario?.nombre || "",
                direccion: v.direccion_despacho?.nombre || "",
                detalles: detallesVenta.map(d => ({
                    glosa: (d.subcategoria?.categoria?.elemento || "") + " " + (d.subcategoria?.cantidad || 0) + (d.subcategoria?.unidad || ""),
                    cantidad: d.cantidad,
                    neto: d.neto,
                    iva: d.iva,
                    total: d.total,
                    sinSifon: d.subcategoria?.sin_sifon || false,
                    esIndustrial: d.subcategoria?.categoria?.es_industrial || false,
                }))
            };
        });    

        // Respuesta
        return NextResponse.json({
            ok: true,
            ventas: ventasDetalladas
        });
    } catch (error) {
        console.error("Error in GET /api/cobros/deudas:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}