import supabase from "@/lib/supabase";
import { NextResponse } from 'next/server';

function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString("es-CL", { month: "short", year: "2-digit" }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }
    return months;
}

function generateFakeDebtData(ventas, pagos) {
    const months = getLast6Months();
    let deudaAcumulada = 0;
    let pagoAcumulado = 0;
    return months.map((m) => {
        const ventasMes = ventas.filter(v => {
            const d = new Date(v.fecha);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
        });
        const pagosMes = pagos.filter(p => {
            const d = new Date(p.fecha);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
        });
        deudaAcumulada += ventasMes.reduce((sum, v) => sum + v.valor_total, 0);
        pagoAcumulado += pagosMes.reduce((sum, p) => sum + p.monto, 0);
        return {
            mes: m.label,
            deuda: deudaAcumulada,
            pago: pagoAcumulado
        };
    });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    try {
        // Fetch client details
        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('id, nombre, rut, credito')
            .eq('id', clienteId)
            .single();

        if (clienteError || !cliente) {
            return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
        }

        // Fetch sales for the client
        const { data: ventas, error: ventasError } = await supabase
            .from('ventas')
            .select(`
                id, fecha, valor_total, codigo,
                vendedor:usuarios(nombre),
                documento:documentos_tributarios(nombre),
                direccion_despacho_id:direcciones(id, nombre)
            `)
            .eq('cliente_id', clienteId)
            .eq('por_cobrar', true)
            .order('fecha', { ascending: false });

        if (ventasError) {
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }

        // Fetch sale details
        const ventaIds = ventas.map(v => v.id);
        const { data: detalles, error: detallesError } = await supabase
            .from('detalle_ventas')
            .select('venta_id, glosa, cantidad, neto, iva, total')
            .in('venta_id', ventaIds);

        if (detallesError) {
            return NextResponse.json({ ok: false, error: detallesError.message }, { status: 500 });
        }

        // Map sales with details
        const ventasDetalladas = ventas.map(v => {
            const detallesVenta = detalles.filter(d => d.venta_id === v.id);
            return {
                folio: v.codigo,
                fecha: v.fecha,
                total: v.valor_total,
                vendedor: v.vendedor?.nombre || "",
                documento: v.documento?.nombre || "",
                direccion: v.direccion?.direccion || "",
                detalles: detallesVenta.map(d => ({
                    glosa: d.glosa,
                    cantidad: d.cantidad,
                    neto: d.neto,
                    iva: d.iva,
                    total: d.total
                }))
            };
        });

        // Generate fake payments for the last 6 months
        const pagos = getLast6Months().map(m => ({
            fecha: new Date(m.year, m.month, 10),
            monto: Math.floor(Math.random() * 500000)
        }));

        // Generate debt graph
        const graficoDeuda = generateFakeDebtData(ventas, pagos);

        // Build response
        return NextResponse.json({
            ok: true,
            cliente: {
                _id: cliente.id,
                nombre: cliente.nombre,
                rut: cliente.rut,
                credito: cliente.credito || 0,
                totalDeuda: ventas.reduce((sum, v) => sum + v.valor_total, 0),
                disponible: (cliente.credito || 0) - ventas.reduce((sum, v) => sum + v.valor_total, 0),
                ultimaVenta: ventas[0]?.fecha || null,
                ultimoPago: pagos[pagos.length - 1]?.fecha || null,
                ventas: ventasDetalladas,
                graficoDeuda
            }
        });
    } catch (error) {
        console.error("Error in GET /cobros/detalle:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}