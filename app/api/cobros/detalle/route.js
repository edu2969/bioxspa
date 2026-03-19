import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { NextResponse } from 'next/server';
import { getActiveDebtScope } from "@/lib/arriendos/getActiveDebtScope";

function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
        months.push({
            label: d.toLocaleString("es-CL", { month: "short", year: "2-digit" }),
            year: d.getFullYear(),
            month: d.getMonth(),
            key: d.toISOString().slice(0, 10),
            date: d,
        });
    }
    return months;
}

function buildDebtChartData(biDeudasMensuales, pagosMensuales) {
    const months = getLast6Months();
    return months.map((m) => {
        const deuda = Number(biDeudasMensuales.get(m.key) || 0);
        const pago = Number(pagosMensuales.get(m.key) || 0);
        return {
            mes: m.label,
            deuda,
            pago,
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
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.success || !authResult.data) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { user } = authResult.data;
        const scope = await getActiveDebtScope({ supabase, userId: user.id });

        const { data: cliente, error: clienteError } = await supabase
            .from('clientes')
            .select('id, nombre, rut, credito')
            .eq('id', clienteId)
            .single();

        if (clienteError || !cliente) {
            return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
        }

        let ventasQuery = supabase
            .from('ventas')
            .select(`
                id, fecha, valor_total, saldo, codigo,
                vendedor:usuarios(nombre),
                documento:documentos_tributarios(nombre),
                direccion_despacho:direcciones(id, direccion_cliente)
            `)
            .eq('cliente_id', clienteId)
            .eq('por_cobrar', true)
            .eq('sucursal_id', scope.sucursalId)
            .order('fecha', { ascending: false });

        if (scope.dependenciaId) {
            ventasQuery = ventasQuery.eq('dependencia_id', scope.dependenciaId);
        } else {
            ventasQuery = ventasQuery.is('dependencia_id', null);
        }

        const { data: ventas, error: ventasError } = await ventasQuery;

        if (ventasError) {
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }

        const ventasRows = ventas || [];
        const ventaIds = ventasRows.map(v => v.id);

        const { data: detalles, error: detallesError } = ventaIds.length > 0 ? await supabase
            .from('detalle_ventas')
            .select('venta_id, glosa, cantidad, neto, iva, total')
            .in('venta_id', ventaIds)
            : { data: [], error: null };

        if (detallesError) {
            return NextResponse.json({ ok: false, error: detallesError.message }, { status: 500 });
        }

        const detallesRows = detalles || [];
        const ventasDetalladas = ventasRows.map(v => {
            const detallesVenta = detallesRows.filter(d => d.venta_id === v.id);
            return {
                ventaId: v.id,
                folio: v.codigo,
                fecha: v.fecha,
                total: v.valor_total,
                saldo: v.saldo ?? v.valor_total,
                vendedor: v.vendedor?.nombre || "",
                documento: v.documento?.nombre || "",
                direccion: v.direccion_despacho?.direccion_cliente || "",
                detalles: detallesVenta.map(d => ({
                    glosa: d.glosa,
                    cantidad: d.cantidad,
                    neto: d.neto,
                    iva: d.iva,
                    total: d.total
                }))
            };
        });

        const { data: pagosRows, error: pagosError } = ventaIds.length > 0 ? await supabase
            .from('pagos')
            .select('venta_id, fecha, monto')
            .in('venta_id', ventaIds)
            .order('fecha', { ascending: false })
            : { data: [], error: null };

        if (pagosError) {
            return NextResponse.json({ ok: false, error: pagosError.message }, { status: 500 });
        }

        let biDeudasMensualQuery = supabase
            .from('bi_deudas')
            .select('fecha, monto')
            .eq('cliente_id', clienteId)
            .eq('sucursal_id', scope.sucursalId)
            .eq('periodo', 'M')
            .order('fecha', { ascending: true });

        if (scope.dependenciaId) {
            biDeudasMensualQuery = biDeudasMensualQuery.eq('dependencia_id', scope.dependenciaId);
        } else {
            biDeudasMensualQuery = biDeudasMensualQuery.is('dependencia_id', null);
        }

        const { data: biDeudasMensualesRows, error: biDeudasMensualesError } = await biDeudasMensualQuery;

        if (biDeudasMensualesError) {
            return NextResponse.json({ ok: false, error: biDeudasMensualesError.message }, { status: 500 });
        }

        const totalDeuda = (biDeudasMensualesRows || []).reduce((sum, row) => sum + Number(row.monto || 0), 0);
        const ultimoPago = (pagosRows || [])[0]?.fecha || null;
        const ultimaVenta = ventasRows[0]?.fecha || null;

        const monthlyDebtMap = new Map((biDeudasMensualesRows || []).map((row) => [String(row.fecha).slice(0, 10), Number(row.monto || 0)]));
        const monthlyPaymentMap = new Map();
        for (const pago of pagosRows || []) {
            const pagoDate = new Date(pago.fecha);
            const key = new Date(Date.UTC(pagoDate.getUTCFullYear(), pagoDate.getUTCMonth(), 1)).toISOString().slice(0, 10);
            monthlyPaymentMap.set(key, Number(monthlyPaymentMap.get(key) || 0) + Number(pago.monto || 0));
        }

        const graficoDeuda = buildDebtChartData(monthlyDebtMap, monthlyPaymentMap);

        return NextResponse.json({
            ok: true,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                rut: cliente.rut,
                credito: cliente.credito || 0,
                totalDeuda,
                disponible: (cliente.credito || 0) - totalDeuda,
                ultimaVenta,
                ultimoPago,
                ventasPorCobrar: ventasRows.length,
                ventas: ventasDetalladas,
                graficoDeuda
            }
        });
    } catch (error) {
        console.error("Error in GET /cobros/detalle:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}