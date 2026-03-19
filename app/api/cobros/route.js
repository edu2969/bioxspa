import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { NextResponse } from 'next/server';
import { getActiveDebtScope } from "@/lib/arriendos/getActiveDebtScope";

const PAGE_SIZE = 12;

function getCutoffDate(days) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - days + 1);
    return date.toISOString().slice(0, 10);
}

function sortClientes(clientes, sortBy, sortOrder) {
    const direction = sortOrder === "desc" ? -1 : 1;

    return [...clientes].sort((left, right) => {
        switch (sortBy) {
            case "totalDeuda":
                return (left.totalDeuda - right.totalDeuda) * direction;
            case "ventasPorCobrar":
                return (left.ventasPorCobrar - right.ventasPorCobrar) * direction;
            case "ultimaVenta":
                return ((new Date(left.ultimaVenta || 0).getTime() - new Date(right.ultimaVenta || 0).getTime()) * direction);
            case "nombre":
            default:
                return String(left.nombre || "").localeCompare(String(right.nombre || ""), "es", { sensitivity: "base" }) * direction;
        }
    });
}

// Configurar cliente de Supabase
export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });
        if (!authResult.success || !authResult.data) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { user } = authResult.data;
        const scope = await getActiveDebtScope({ supabase, userId: user.id });

        const { searchParams } = new URL(request.url);
        const q = parseInt(searchParams.get("q") ?? "0", 10);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const sortBy = searchParams.get("sortBy") || "nombre";
        const sortOrder = searchParams.get("sortOrder") || "asc";

        if (![0, 30, 60, 90].includes(q)) {
            return NextResponse.json({ ok: false, error: "Invalid 'q' parameter" }, { status: 400 });
        }

        let biDeudasQuery = supabase
            .from('bi_deudas')
            .select('id, cliente_id, ultima_venta_id, monto, fecha, ventas_por_cobrar')
            .eq('sucursal_id', scope.sucursalId)
            .eq('periodo', 'D')
            .not('cliente_id', 'is', null);

        if (scope.dependenciaId) {
            biDeudasQuery = biDeudasQuery.eq('dependencia_id', scope.dependenciaId);
        } else {
            biDeudasQuery = biDeudasQuery.is('dependencia_id', null);
        }

        if (q > 0) {
            biDeudasQuery = biDeudasQuery.gte('fecha', getCutoffDate(q));
        }

        const { data: biDeudas, error: biDeudasError } = await biDeudasQuery;

        if (biDeudasError) {
            return NextResponse.json({ ok: false, error: biDeudasError.message }, { status: 500 });
        }

        const biDeudasRows = biDeudas || [];
        const groupedByCliente = new Map();

        for (const deuda of biDeudasRows) {
            const clienteId = deuda.cliente_id;
            if (!clienteId) continue;

            if (!groupedByCliente.has(clienteId)) {
                groupedByCliente.set(clienteId, {
                    clienteId,
                    totalDeuda: 0,
                    ventasPorCobrar: 0,
                    deudas: [],
                });
            }

            const group = groupedByCliente.get(clienteId);
            group.totalDeuda += Number(deuda.monto || 0);
            group.ventasPorCobrar += Number(deuda.ventas_por_cobrar || 0);
            group.deudas.push(deuda);
        }

        const clienteIds = [...groupedByCliente.keys()];
        if (clienteIds.length === 0) {
            return NextResponse.json({
                ok: true,
                clientes: [],
                pagination: { page: 1, totalPages: 1, totalItems: 0 },
            });
        }

        const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('id, nombre, credito, telefono, email')
            .in('id', clienteIds);

        if (clientesError) {
            return NextResponse.json({ ok: false, error: clientesError.message }, { status: 500 });
        }

        const clientesBase = (clientes || []).map((cliente) => {
            const deudaCliente = groupedByCliente.get(cliente.id);
            return {
                ...cliente,
                totalDeuda: deudaCliente?.totalDeuda || 0,
                ventasPorCobrar: deudaCliente?.ventasPorCobrar || 0,
                disponible: Number(cliente.credito || 0) - Number(deudaCliente?.totalDeuda || 0),
                ultimaVenta: null,
                ultimoPago: null,
                deudas: deudaCliente?.deudas || [],
            };
        });

        const clientesOrdenados = sortClientes(clientesBase, sortBy, sortOrder);
        const totalItems = clientesOrdenados.length;
        const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const clientesPagina = clientesOrdenados.slice(startIndex, startIndex + PAGE_SIZE);
        const pagedClienteIds = clientesPagina.map((cliente) => cliente.id);

        const { data: ventasClienteScope, error: ventasScopeError } = await supabase
            .from('ventas')
            .select('id, cliente_id, fecha, dependencia_id')
            .in('cliente_id', pagedClienteIds)
            .eq('sucursal_id', scope.sucursalId)
            .order('fecha', { ascending: false });

        if (ventasScopeError) {
            return NextResponse.json({ ok: false, error: ventasScopeError.message }, { status: 500 });
        }

        const ventasScopeFiltradas = (ventasClienteScope || []).filter((venta) =>
            scope.dependenciaId ? String(venta.dependencia_id) === String(scope.dependenciaId) : true
        );

        const ultimaVentaByCliente = new Map();
        const ventaIdToClienteId = new Map();

        for (const venta of ventasScopeFiltradas) {
            ventaIdToClienteId.set(String(venta.id), String(venta.cliente_id));
            if (!ultimaVentaByCliente.has(String(venta.cliente_id))) {
                ultimaVentaByCliente.set(String(venta.cliente_id), venta.fecha);
            }
        }

        const ventaIds = [...ventaIdToClienteId.keys()];
        const ultimoPagoByCliente = new Map();

        if (ventaIds.length > 0) {
            const { data: pagos, error: pagosError } = await supabase
                .from('pagos')
                .select('venta_id, fecha')
                .in('venta_id', ventaIds)
                .order('fecha', { ascending: false });

            if (pagosError) {
                return NextResponse.json({ ok: false, error: pagosError.message }, { status: 500 });
            }

            for (const pago of pagos || []) {
                const clienteId = ventaIdToClienteId.get(String(pago.venta_id));
                if (!clienteId) continue;
                if (!ultimoPagoByCliente.has(clienteId)) {
                    ultimoPagoByCliente.set(clienteId, pago.fecha);
                }
            }
        }

        const clientesConDeuda = clientesPagina.map((cliente) => ({
            ...cliente,
            ultimaVenta: ultimaVentaByCliente.get(String(cliente.id)) || null,
            ultimoPago: ultimoPagoByCliente.get(String(cliente.id)) || null,
        }));

        return NextResponse.json({
            ok: true,
            clientes: clientesConDeuda,
            pagination: {
                page: currentPage,
                totalPages,
                totalItems,
            },
        });
    } catch (error) {
        console.error("Error en el endpoint:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
