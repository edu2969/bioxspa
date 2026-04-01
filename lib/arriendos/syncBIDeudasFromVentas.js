function toIsoDateOnly(date) {
    return date.toISOString().slice(0, 10);
}

function parseVentaDate(fecha) {
    if (!fecha) {
        throw new Error("venta.fecha is required to sync bi_deudas");
    }

    return new Date(`${String(fecha).slice(0, 10)}T00:00:00.000Z`);
}

function getWeekStart(date) {
    const weekStart = new Date(date);
    const day = weekStart.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setUTCDate(weekStart.getUTCDate() + diff);
    return weekStart;
}

function getMonthStart(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getYearStart(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function getMonthEnd(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function getYearEnd(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
}

function getWeekEnd(date) {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    return weekEnd;
}

function getPeriodDefinitions(fecha) {
    const ventaDate = parseVentaDate(fecha);

    return [
        {
            periodo: "D",
            fechaInicio: ventaDate,
            fechaFin: ventaDate,
        },
        {
            periodo: "S",
            fechaInicio: getWeekStart(ventaDate),
            fechaFin: getWeekEnd(ventaDate),
        },
        {
            periodo: "M",
            fechaInicio: getMonthStart(ventaDate),
            fechaFin: getMonthEnd(ventaDate),
        },
        {
            periodo: "A",
            fechaInicio: getYearStart(ventaDate),
            fechaFin: getYearEnd(ventaDate),
        },
    ];
}

function getOutstandingAmount(venta) {
    const saldo = Number(venta?.saldo || 0);
    const valorTotal = Number(venta?.valor_total || 0);

    if (saldo > 0) {
        return saldo;
    }

    return valorTotal;
}

function uniqueStrings(values = []) {
    return [...new Set((values || []).filter(Boolean).map((value) => String(value)))];
}

async function fetchAffectedVentas(supabase, ventaIds) {
    const { data, error } = await supabase
        .from("ventas")
        .select("id, cliente_id, sucursal_id, dependencia_id, fecha, saldo, valor_total, por_cobrar")
        .in("id", ventaIds);

    if (error) {
        throw new Error(`Error fetching affected ventas: ${error.message}`);
    }

    return data || [];
}

async function fetchOutstandingVentasForScope(supabase, scope, periodDefinition) {
    let query = supabase
        .from("ventas")
        .select("id, fecha, saldo, valor_total, updated_at")
        .eq("cliente_id", scope.clienteId)
        .eq("sucursal_id", scope.sucursalId)
        .eq("por_cobrar", true)
        .gte("fecha", toIsoDateOnly(periodDefinition.fechaInicio))
        .lte("fecha", toIsoDateOnly(periodDefinition.fechaFin))
        .order("fecha", { ascending: false });

    if (scope.dependenciaId) {
        query = query.eq("dependencia_id", scope.dependenciaId);
    } else {
        query = query.is("dependencia_id", null);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error fetching outstanding ventas for BI debt sync: ${error.message}`);
    }

    return (data || []).filter((venta) => getOutstandingAmount(venta) > 0);
}

async function findExistingBIDeuda(supabase, scope, periodDefinition) {
    let query = supabase
        .from("bi_deudas")
        .select("id")
        .eq("cliente_id", scope.clienteId)
        .eq("sucursal_id", scope.sucursalId)
        .eq("periodo", periodDefinition.periodo)
        .eq("fecha", toIsoDateOnly(periodDefinition.fechaInicio));

    if (scope.dependenciaId) {
        query = query.eq("dependencia_id", scope.dependenciaId);
    } else {
        query = query.is("dependencia_id", null);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
        throw new Error(`Error fetching existing bi_deudas row: ${error.message}`);
    }

    return data || null;
}

async function syncPeriodForScope(supabase, scope, periodDefinition) {
    const ventas = await fetchOutstandingVentasForScope(supabase, scope, periodDefinition);
    const existing = await findExistingBIDeuda(supabase, scope, periodDefinition);

    if (ventas.length === 0) {
        if (existing?.id) {
            const { error: deleteError } = await supabase
                .from("bi_deudas")
                .delete()
                .eq("id", existing.id);

            if (deleteError) {
                throw new Error(`Error deleting empty bi_deudas row: ${deleteError.message}`);
            }
        }

        return {
            periodo: periodDefinition.periodo,
            fecha: toIsoDateOnly(periodDefinition.fechaInicio),
            action: existing?.id ? "deleted" : "noop",
            monto: 0,
            ventasPorCobrar: 0,
        };
    }

    const monto = ventas.reduce((sum, venta) => sum + getOutstandingAmount(venta), 0);
    const ultimaVenta = ventas[0] || null;

    const payload = {
        sucursal_id: scope.sucursalId,
        dependencia_id: scope.dependenciaId,
        cliente_id: scope.clienteId,
        fecha: toIsoDateOnly(periodDefinition.fechaInicio),
        periodo: periodDefinition.periodo,
        monto,
        ventas_por_cobrar: ventas.length,
        ultima_venta_id: ultimaVenta?.id || null,
    };

    if (existing?.id) {
        const { error: updateError } = await supabase
            .from("bi_deudas")
            .update(payload)
            .eq("id", existing.id);

        if (updateError) {
            throw new Error(`Error updating bi_deudas row: ${updateError.message}`);
        }

        return {
            periodo: periodDefinition.periodo,
            fecha: payload.fecha,
            action: "updated",
            monto,
            ventasPorCobrar: ventas.length,
        };
    }

    const { error: insertError } = await supabase
        .from("bi_deudas")
        .insert(payload);

    if (insertError) {
        throw new Error(`Error inserting bi_deudas row: ${insertError.message}`);
    }

    return {
        periodo: periodDefinition.periodo,
        fecha: payload.fecha,
        action: "inserted",
        monto,
        ventasPorCobrar: ventas.length,
    };
}

export async function syncBIDeudasFromVentas({
    supabase,
    ventaIds,
    source = "desconocido",
}) {
    if (!supabase) {
        throw new Error("supabase client is required");
    }

    const normalizedVentaIds = uniqueStrings(ventaIds);
    if (normalizedVentaIds.length === 0) {
        return {
            ok: true,
            source,
            scopes: [],
        };
    }

    const ventas = await fetchAffectedVentas(supabase, normalizedVentaIds);
    const scopeMap = new Map();

    for (const venta of ventas) {
        if (!venta.cliente_id || !venta.sucursal_id || !venta.fecha) {
            continue;
        }

        const scopeKey = [
            venta.cliente_id,
            venta.sucursal_id,
            venta.dependencia_id || "null",
            String(venta.fecha).slice(0, 10),
        ].join("|");

        if (!scopeMap.has(scopeKey)) {
            scopeMap.set(scopeKey, {
                clienteId: venta.cliente_id,
                sucursalId: venta.sucursal_id,
                dependenciaId: venta.dependencia_id || null,
                categoriaCatalogoId: null,
                fecha: venta.fecha,
            });
        }
    }

    const scopes = [];

    for (const scope of scopeMap.values()) {
        const periodResults = [];
        for (const periodDefinition of getPeriodDefinitions(scope.fecha)) {
            const result = await syncPeriodForScope(supabase, scope, periodDefinition);
            periodResults.push(result);
        }

        scopes.push({
            clienteId: scope.clienteId,
            sucursalId: scope.sucursalId,
            dependenciaId: scope.dependenciaId,
            fecha: String(scope.fecha).slice(0, 10),
            periodos: periodResults,
        });
    }

    return {
        ok: true,
        source,
        ventaIds: normalizedVentaIds,
        scopes,
    };
}