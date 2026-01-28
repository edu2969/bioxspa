import BIDeuda from "@/models/biDeuda";

/**
 * Genera todos los registros de BI Deuda para una venta específica
 * @param {Object} venta - Objeto de venta con clienteId, sucursalId, valorTotal, fecha
 * @returns {Promise<void>}
 */
export async function generateBIDeuda(venta) {
    // Validación de datos requeridos
    if (!venta.clienteId || !venta.sucursalId) {
        console.warn(`Venta ${venta._id} sin clienteId o sucursalId - omitiendo generación de BI`);
        return;
    }

    const fechaVenta = new Date(venta.fecha);
    const montoVenta = venta.valorTotal || 0;
    
    console.log(`Generando registros BI para venta ${venta._id}, monto: ${montoVenta}`);

    // 1. Crear registro diario
    await createDailyRecord(venta, fechaVenta, montoVenta);
    
    // 2. Crear/actualizar registro semanal
    await createOrUpdateWeeklyRecord(venta, fechaVenta, montoVenta);
    
    // 3. Crear/actualizar registro mensual
    await createOrUpdateMonthlyRecord(venta, fechaVenta, montoVenta);
    
    // 4. Crear/actualizar registro anual
    await createOrUpdateYearlyRecord(venta, fechaVenta, montoVenta);
    
    console.log(`Registros BI generados exitosamente para venta ${venta._id}`);
}

/**
 * Crea registro diario de deuda
 */
async function createDailyRecord(venta, fechaVenta, montoVenta) {
    await BIDeuda.create({
        sucursalId: venta.sucursalId,
        clienteId: venta.clienteId,
        monto: montoVenta,
        fecha: fechaVenta,
        periodo: 'D',
        lastVentaId: venta._id,
        ventasPorCobrar: 1
    });
}

/**
 * Crea o actualiza registro semanal de deuda
 */
async function createOrUpdateWeeklyRecord(venta, fechaVenta, montoVenta) {
    const inicioSemana = new Date(fechaVenta);
    inicioSemana.setDate(fechaVenta.getDate() - fechaVenta.getDay());
    
    const existeSemanal = await BIDeuda.findOne({
        sucursalId: venta.sucursalId,
        clienteId: venta.clienteId,
        periodo: 'S',
        fecha: { 
            $gte: inicioSemana, 
            $lt: new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000) 
        }
    });
    
    if (existeSemanal) {
        existeSemanal.monto += montoVenta;
        existeSemanal.ventasPorCobrar += 1;
        existeSemanal.lastVentaId = venta._id;
        await existeSemanal.save();
    } else {
        await BIDeuda.create({
            sucursalId: venta.sucursalId,
            clienteId: venta.clienteId,
            monto: montoVenta,
            fecha: inicioSemana,
            periodo: 'S',
            lastVentaId: venta._id,
            ventasPorCobrar: 1
        });
    }
}

/**
 * Crea o actualiza registro mensual de deuda
 */
async function createOrUpdateMonthlyRecord(venta, fechaVenta, montoVenta) {
    const inicioMes = new Date(fechaVenta.getFullYear(), fechaVenta.getMonth(), 1);
    
    const existeMensual = await BIDeuda.findOne({
        sucursalId: venta.sucursalId,
        clienteId: venta.clienteId,
        periodo: 'M',
        fecha: inicioMes
    });
    
    if (existeMensual) {
        existeMensual.monto += montoVenta;
        existeMensual.ventasPorCobrar += 1;
        existeMensual.lastVentaId = venta._id;
        await existeMensual.save();
    } else {
        await BIDeuda.create({
            sucursalId: venta.sucursalId,
            clienteId: venta.clienteId,
            monto: montoVenta,
            fecha: inicioMes,
            periodo: 'M',
            lastVentaId: venta._id,
            ventasPorCobrar: 1
        });
    }
}

/**
 * Crea o actualiza registro anual de deuda
 */
async function createOrUpdateYearlyRecord(venta, fechaVenta, montoVenta) {
    const inicioAno = new Date(fechaVenta.getFullYear(), 0, 1);
    
    const existeAnual = await BIDeuda.findOne({
        sucursalId: venta.sucursalId,
        clienteId: venta.clienteId,
        periodo: 'A',
        fecha: inicioAno
    });
    
    if (existeAnual) {
        existeAnual.monto += montoVenta;
        existeAnual.ventasPorCobrar += 1;
        existeAnual.lastVentaId = venta._id;
        await existeAnual.save();
    } else {
        await BIDeuda.create({
            sucursalId: venta.sucursalId,
            clienteId: venta.clienteId,
            monto: montoVenta,
            fecha: inicioAno,
            periodo: 'A',
            lastVentaId: venta._id,
            ventasPorCobrar: 1
        });
    }
}

/**
 * Genera registros BI para múltiples ventas
 * @param {Array} ventas - Array de objetos de venta
 * @returns {Promise<void>}
 */
export async function generateBIDeudaForMultipleVentas(ventas) {
    console.log(`Generando registros BI para ${ventas.length} ventas`);
    
    for (const venta of ventas) {
        await generateBIDeuda(venta);
    }
    
    console.log(`Registros BI generados para ${ventas.length} ventas`);
}
