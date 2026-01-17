import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import Venta from "@/models/venta";
import BIDeuda from "@/models/biDeuda";
import DetalleVenta from "@/models/detalleVenta";
import ItemCatalogo from "@/models/itemCatalogo";

export async function POST(request: NextRequest) {
    try {
        console.log("POST request received for confirmar descarga.");
        
        await connectMongoDB();
        console.log("MongoDB connected.");

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { rutaId } = await request.json();
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId);

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "Ruta no encontrada" }, { status: 404 });
        }

        // Verificar que la ruta esté en estado de descarga
        if (rutaDespacho.estado !== TIPO_ESTADO_RUTA_DESPACHO.descarga) {
            console.warn(`Ruta no está en estado de descarga. Estado actual: ${rutaDespacho.estado}`);
            return NextResponse.json({ ok: false, error: "La ruta no está en estado de descarga" }, { status: 400 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id) {
            console.warn("User doesn't have access to this ruta");
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Actualizar estado a descarga_confirmada
        const nuevoEstado = TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
        const fechaActual = new Date();

        rutaDespacho.estado = nuevoEstado;
        rutaDespacho.historialEstado.push({
            estado: nuevoEstado,
            fecha: fechaActual
        });

        await rutaDespacho.save();

        console.log(`Ruta ${rutaId} actualizada a estado descarga_confirmada`);

        // Actualizar las ventas asociadas a estado entregado
        if (rutaDespacho.ventaIds && rutaDespacho.ventaIds.length > 0) {
            await Venta.updateMany(
                { _id: { $in: rutaDespacho.ventaIds } },
                { 
                    $set: { 
                        estado: TIPO_ESTADO_VENTA.entregado,
                        porCobrar: true
                    },
                    $push: { 
                        historialEstados: {
                            fecha: fechaActual,
                            estado: TIPO_ESTADO_VENTA.entregado
                        }
                    }
                }
            );
            console.log(`${rutaDespacho.ventaIds.length} ventas actualizadas a estado entregado`);
        }

        // Generar registros de BI para deudas
        if (rutaDespacho.ventaIds && rutaDespacho.ventaIds.length > 0) {
            const ventas = await Venta.find({ _id: { $in: rutaDespacho.ventaIds } });
            
            for (const venta of ventas) {
                // Actualizar direcciones de itemCatalogo si la venta tiene dirección de despacho
                if (venta.direccionDespachoId) {
                    // Obtener todos los detalles de venta para esta venta
                    const detallesVenta = await DetalleVenta.find({ ventaId: venta._id });
                    
                    for (const detalle of detallesVenta) {
                        if (detalle.itemCatalogoIds && detalle.itemCatalogoIds.length > 0) {
                            // Actualizar la dirección de todos los itemCatalogo en este detalle
                            await ItemCatalogo.updateMany(
                                { _id: { $in: detalle.itemCatalogoIds } },
                                { $set: { direccionId: venta.direccionDespachoId } }
                            );
                            
                            console.log(`Actualizadas ${detalle.itemCatalogoIds.length} direcciones de itemCatalogo para detalle ${detalle._id}`);
                        }
                    }
                }

                if (!venta.clienteId || !venta.sucursalId) continue;                
                
                const fechaVenta = new Date(venta.fecha);
                const montoVenta = venta.valorTotal || 0;
                
                // Crear registro diario
                await BIDeuda.create({
                    sucursalId: venta.sucursalId,
                    clienteId: venta.clienteId,
                    monto: montoVenta,
                    fecha: fechaVenta,
                    periodo: 'D',
                    lastVentaId: venta._id,
                    ventasPorCobrar: 1
                });
                
                // Crear registro semanal (inicio de semana)
                const inicioSemana = new Date(fechaVenta);
                inicioSemana.setDate(fechaVenta.getDate() - fechaVenta.getDay());
                
                const existeSemanal = await BIDeuda.findOne({
                    sucursalId: venta.sucursalId,
                    clienteId: venta.clienteId,
                    periodo: 'S',
                    fecha: { $gte: inicioSemana, $lt: new Date(inicioSemana.getTime() + 7 * 24 * 60 * 60 * 1000) }
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
                
                // Crear registro mensual (primer día del mes)
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
                
                // Crear registro anual (primer día del año)
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
            
            console.log(`Registros de BI Deuda creados para ${ventas.length} ventas`);
        }

        return NextResponse.json({ 
            ok: true, 
            message: "Descarga confirmada exitosamente",
            estado: nuevoEstado 
        });

    } catch (error) {
        console.error("Error al confirmar descarga:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}