import supabase from "@/lib/supabase";

/**
 * Genera todos los registros de BI Deuda para una venta específica
 * @param {Object} venta - Objeto de venta con clienteId, sucursalId, valorTotal, fecha
 * @returns {Promise<void>}
 */
export async function generateBIDeuda(venta) {
    if (!venta.clienteId || !venta.sucursalId) {
        console.warn(`Venta ${venta.id} sin clienteId o sucursalId - omitiendo generación de BI`);
        return;
    }

    const fechaVenta = new Date(venta.fecha);
    const montoVenta = venta.valorTotal || 0;

    console.log(`Generando registros BI para venta ${venta.id}, monto: ${montoVenta}`);

    // 1. Crear registro diario
    await createDailyRecord(venta, fechaVenta, montoVenta);

    // 2. Crear/actualizar registro semanal
    await createOrUpdateWeeklyRecord(venta, fechaVenta, montoVenta);

    // 3. Crear/actualizar registro mensual
    await createOrUpdateMonthlyRecord(venta, fechaVenta, montoVenta);

    // 4. Crear/actualizar registro anual
    await createOrUpdateYearlyRecord(venta, fechaVenta, montoVenta);

    console.log(`Registros BI generados exitosamente para venta ${venta.id}`);
}

async function createDailyRecord(venta, fechaVenta, montoVenta) {
    const { error } = await supabase
        .from("bi_deudas")
        .insert({
            sucursal_id: venta.sucursalId,
            cliente_id: venta.clienteId,
            monto: montoVenta,
            fecha: fechaVenta.toISOString(),
            periodo: "D",
            ultima_venta_id: venta.id,
            ventas_por_cobrar: 1,
        });

    if (error) {
        console.error("Error al crear registro diario de deuda:", error);
    }
}

async function createOrUpdateWeeklyRecord(venta, fechaVenta, montoVenta) {
    const inicioSemana = new Date(fechaVenta);
    inicioSemana.setDate(fechaVenta.getDate() - fechaVenta.getDay());

    const { data: existeSemanal, error: fetchError } = await supabase
        .from("bi_deudas")
        .select("id, monto, ventas_por_cobrar")
        .eq("sucursal_id", venta.sucursalId)
        .eq("cliente_id", venta.clienteId)
        .eq("periodo", "S")
        .eq("fecha", inicioSemana.toISOString())
        .single();

    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error al buscar registro semanal de deuda:", fetchError);
        return;
    }

    if (existeSemanal) {
        const { error: updateError } = await supabase
            .from("bi_deudas")
            .update({
                monto: existeSemanal.monto + montoVenta,
                ventas_por_cobrar: existeSemanal.ventas_por_cobrar + 1,
                ultima_venta_id: venta.id,
            })
            .eq("id", existeSemanal.id);

        if (updateError) {
            console.error("Error al actualizar registro semanal de deuda:", updateError);
        }
    } else {
        await createDailyRecord(venta, inicioSemana, montoVenta);
    }
}

async function createOrUpdateMonthlyRecord(venta, fechaVenta, montoVenta) {
    const inicioMes = new Date(fechaVenta.getFullYear(), fechaVenta.getMonth(), 1);

    const { data: existeMensual, error: fetchError } = await supabase
        .from("bi_deudas")
        .select("id, monto, ventas_por_cobrar")
        .eq("sucursal_id", venta.sucursalId)
        .eq("cliente_id", venta.clienteId)
        .eq("periodo", "M")
        .eq("fecha", inicioMes.toISOString())
        .single();

    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error al buscar registro mensual de deuda:", fetchError);
        return;
    }

    if (existeMensual) {
        const { error: updateError } = await supabase
            .from("bi_deudas")
            .update({
                monto: existeMensual.monto + montoVenta,
                ventas_por_cobrar: existeMensual.ventas_por_cobrar + 1,
                ultima_venta_id: venta.id,
            })
            .eq("id", existeMensual.id);

        if (updateError) {
            console.error("Error al actualizar registro mensual de deuda:", updateError);
        }
    } else {
        await createDailyRecord(venta, inicioMes, montoVenta);
    }
}

async function createOrUpdateYearlyRecord(venta, fechaVenta, montoVenta) {
    const inicioAno = new Date(fechaVenta.getFullYear(), 0, 1);

    const { data: existeAnual, error: fetchError } = await supabase
        .from("bi_deudas")
        .select("id, monto, ventas_por_cobrar")
        .eq("sucursal_id", venta.sucursalId)
        .eq("cliente_id", venta.clienteId)
        .eq("periodo", "A")
        .eq("fecha", inicioAno.toISOString())
        .single();

    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error al buscar registro anual de deuda:", fetchError);
        return;
    }

    if (existeAnual) {
        const { error: updateError } = await supabase
            .from("bi_deudas")
            .update({
                monto: existeAnual.monto + montoVenta,
                ventas_por_cobrar: existeAnual.ventas_por_cobrar + 1,
                ultima_venta_id: venta.id,
            })
            .eq("id", existeAnual.id);

        if (updateError) {
            console.error("Error al actualizar registro anual de deuda:", updateError);
        }
    } else {
        await createDailyRecord(venta, inicioAno, montoVenta);
    }
}

export async function generateBIDeudaForMultipleVentas(ventas) {
    console.log(`Generando registros BI para ${ventas.length} ventas`);

    for (const venta of ventas) {
        await generateBIDeuda(venta);
    }

    console.log(`Registros BI generados para ${ventas.length} ventas`);
}
