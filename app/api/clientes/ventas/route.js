import supabase from "@/lib/supabase";
import { NextResponse } from "next/server";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    // Busca el cliente
    const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, credito")
        .eq("id", clienteId)
        .single();

    if (clienteError || !cliente) {
        return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
    }

    // Busca documentos tributarios que aplican a ventas
    const { data: documentos, error: documentosError } = await supabase
        .from("documentos_tributarios")
        .select("id")
        .eq("venta", true);

    if (documentosError) {
        return NextResponse.json({ ok: false, error: "Error fetching documentos tributarios" }, { status: 500 });
    }

    const documentoIds = documentos.map(doc => doc.id);

    // Busca ventas por cobrar del cliente
    const { data: ventas, error: ventasError } = await supabase
        .from("ventas")
        .select(`
            id, codigo, fecha, valor_total, saldo, 
            vendedor:usuarios(id, nombre),
            documento:documentos_tributarios(nombre),
            direccion_despacho_id:direcciones(id, nombre)
        `)
        .eq("cliente_id", clienteId)
        .eq("por_cobrar", true)
        .eq("estado", TIPO_ESTADO_VENTA.entregado)
        .gt("valor_total", 0)
        .in("documento_tributario_id", documentoIds)
        .order("fecha", { ascending: false });

    console.log("Ventas output:", ventas, ventasError);

    if (ventasError) {
        return NextResponse.json({ ok: false, error: "Error fetching ventas" }, { status: 500 });
    }

    const ventaIds = ventas.map(v => v.id);

    // Busca detalles de cada venta
    const { data: detalles, error: detallesError } = await supabase
        .from("detalle_ventas")
        .select(`
            venta_id, cantidad, neto, iva, total,
            subcategoria:subcategorias_catalogo(
                cantidad, unidad, sin_sifon,
                categoria:categorias_catalogo(
                    es_industrial, elemento
                )
            )
        `)
        .in("venta_id", ventaIds);

    if (detallesError) {
        return NextResponse.json({ ok: false, error: "Error fetching detalles de ventas" }, { status: 500 });
    }

    // Adorna ventas con detalles y vendedor
    const ventasDetalladas = ventas.map(v => {
        const detallesVenta = detalles.filter(d => d.venta_id === v.id);
        return {
            ventaId: v.id,
            folio: v.codigo,
            fecha: v.fecha,
            total: v.valor_total,
            saldo: v.saldo ?? 0,
            vendedor: v.vendedor?.name || "",
            documento: v.documento?.nombre || "",
            direccion: v.direccion?.direccion || "",
            detalles: detallesVenta.map(d => ({
                glosa: `${d.subcategoria?.categoria?.elemento || ""} ${d.subcategoria?.cantidad || 0}${d.subcategoria?.unidad || ""}`,
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
}