import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
    }

    // Fetch ventas in borrador state
    const { data: ventas, error: ventasError } = await supabase
        .from('ventas')
        .select('id, cliente_id, solicitante_id, vendedor_id, fecha, created_at, estado, detalles(venta_id, cantidad, neto, subcategoria_catalogo_id)')
        .eq('sucursal_id', sucursalId)
        .in('estado', [
            TIPO_ESTADO_VENTA.borrador,
            TIPO_ESTADO_VENTA.cotizacion,
            TIPO_ESTADO_VENTA.anulado,
            TIPO_ESTADO_VENTA.rechazado
        ]);

    if (ventasError) {
        console.error('Error fetching ventas:', ventasError);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const pedidos = await Promise.all(
        (ventas || []).map(async (venta) => {
            const { data: cliente, error: clienteError } = await supabase
                .from('clientes')
                .select('id, nombre, rut')
                .eq('id', venta.cliente_id)
                .single();

            const { data: solicitante, error: solicitanteError } = await supabase
                .from('users')
                .select('id, name, persona_id')
                .eq('id', venta.solicitante_id || venta.vendedor_id)
                .single();

            let telefono = "";
            if (solicitante && solicitante.persona_id) {
                const { data: persona, error: personaError } = await supabase
                    .from('personas')
                    .select('telefono')
                    .eq('id', solicitante.persona_id)
                    .single();
                telefono = persona?.telefono || "";
            }

            const items = await Promise.all(
                (venta.detalles || []).map(async (item) => {
                    const { data: subcat, error: subcatError } = await supabase
                        .from('subcategoria_catalogos')
                        .select('id, nombre, cantidad, unidad, categoria_catalogo_id')
                        .eq('id', item.subcategoria_catalogo_id)
                        .single();

                    const { data: cat, error: catError } = subcat?.categoria_catalogo_id
                        ? await supabase
                            .from('categoria_catalogos')
                            .select('id, nombre')
                            .eq('id', subcat.categoria_catalogo_id)
                            .single()
                        : { data: null, error: null };

                    return {
                        producto: (cat && subcat) ? `${cat.nombre} - ${subcat.nombre}` : "",
                        capacidad: subcat?.cantidad ? `${subcat.cantidad} ${subcat.unidad || ""}`.trim() : "",
                        cantidad: item.cantidad,
                        precio: item.neto || undefined,
                        subcategoriaCatalogoId: item.subcategoria_catalogo_id || null,
                    };
                })
            );

            return {
                _id: venta.id,
                cliente: cliente
                    ? { nombre: cliente.nombre, rut: cliente.rut, _id: cliente.id }
                    : { nombre: "Sin cliente", rut: "" },
                solicitante: solicitante
                    ? {
                        _id: solicitante.id,
                        nombre: solicitante.name || "",
                        telefono,
                    }
                    : { _id: "", nombre: "", telefono: "" },
                fecha: venta.fecha || venta.created_at,
                items,
            };
        })
    );

    return NextResponse.json({ pedidos });
}

export async function POST(request) {
    const body = await request.json();
    const { ventaId, precios, eliminar } = body;

    if (!ventaId) {
        return NextResponse.json({ ok: false, error: "Falta ventaId" }, { status: 400 });
    }

    const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .select('id, cliente_id, estado')
        .eq('id', ventaId)
        .single();

    if (ventaError || !venta) {
        return NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
    }

    if (eliminar) {
        const { error: updateError } = await supabase
            .from('ventas')
            .update({ estado: TIPO_ESTADO_VENTA.anulado })
            .eq('id', ventaId);

        if (updateError) {
            console.error('Error updating venta:', updateError);
            return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, estado: "anulado" });
    }

    if (!Array.isArray(precios) || precios.length === 0) {
        return NextResponse.json({ ok: false, error: "Debe enviar precios" }, { status: 400 });
    }

    for (const { subcategoriaCatalogoId, precio } of precios) {
        if (!subcategoriaCatalogoId || !precio) {
            continue;
        }

        const { data: precioDoc, error: precioError } = await supabase
            .from('precios')
            .select('id, valor, historial')
            .eq('cliente_id', venta.cliente_id)
            .eq('subcategoria_catalogo_id', subcategoriaCatalogoId)
            .single();

        if (precioDoc) {
            const historial = precioDoc.historial || [];
            historial.push({
                valor: precio,
                fecha: new Date(),
                varianza: precio - precioDoc.valor,
            });

            const { error: updateError } = await supabase
                .from('precios')
                .update({
                    valor: precio,
                    valor_bruto: precio,
                    fecha_desde: new Date(),
                    historial,
                })
                .eq('id', precioDoc.id);

            if (updateError) {
                console.error('Error updating precio:', updateError);
            }
        } else {
            const { error: insertError } = await supabase
                .from('precios')
                .insert({
                    cliente_id: venta.cliente_id,
                    subcategoria_catalogo_id: subcategoriaCatalogoId,
                    valor: precio,
                    valor_bruto: precio,
                    impuesto: 0,
                    moneda: "CLP",
                    historial: [{ valor: precio, fecha: new Date(), varianza: 0 }],
                    fecha_desde: new Date(),
                });

            if (insertError) {
                console.error('Error inserting precio:', insertError);
            }
        }
    }

    const { error: updateVentaError } = await supabase
        .from('ventas')
        .update({ estado: TIPO_ESTADO_VENTA.por_asignar })
        .eq('id', ventaId);

    if (updateVentaError) {
        console.error('Error updating venta estado:', updateVentaError);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, estado: "por_asignar" });
}