"use client";

import React from 'react';
import Image from 'next/image';
import { FaEdit, FaBan } from 'react-icons/fa';
import { getColorEstanque } from '@/lib/uix';

export default function OperacionesTab({ pedido, ventaDetalle }) {
    // Procesar códigos escaneados reales
    const procesarCodigosEscaneados = () => {
        if (!ventaDetalle?.detalles || !Array.isArray(ventaDetalle.detalles)) {
            return [];
        }

        const codigosEscaneados = [];
        
        ventaDetalle.detalles.forEach(detalle => {
            if (detalle.itemCatalogoIds && Array.isArray(detalle.itemCatalogoIds)) {
                detalle.itemCatalogoIds.forEach(item => {
                    // Determinar si el item está entregado basándome en el historial de carga
                    const estaEntregado = determinarEstadoEntrega(item._id, ventaDetalle.rutaDespacho);
                    
                    codigosEscaneados.push({
                        codigo: item.codigo,
                        producto: detalle.subcategoriaCatalogoId?.nombre || 'Producto no especificado',
                        elemento: detalle.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || 'gas',
                        estado: estaEntregado ? 'Entregado' : 'Pendiente',
                        hora: estaEntregado ? obtenerHoraEntrega(item._id, ventaDetalle.rutaDespacho) : '--:--',
                        cantidad: detalle.subcategoriaCatalogoId?.cantidad || '',
                        unidad: detalle.subcategoriaCatalogoId?.unidad || ''
                    });
                });
            }
        });

        return codigosEscaneados;
    };

    // Determinar si un item está entregado basándome en el historial de carga
    const determinarEstadoEntrega = (itemId, rutaDespacho) => {
        if (!rutaDespacho || !rutaDespacho.historialCarga) {
            return false;
        }

        // Buscar en el historial de carga si el item fue descargado (esCarga: false)
        const descarga = rutaDespacho.historialCarga.find(carga => 
            !carga.esCarga && 
            carga.itemMovidoIds && 
            carga.itemMovidoIds.includes(itemId)
        );

        return !!descarga;
    };

    // Obtener hora de entrega de un item
    const obtenerHoraEntrega = (itemId, rutaDespacho) => {
        if (!rutaDespacho || !rutaDespacho.historialCarga) {
            return '--:--';
        }

        const descarga = rutaDespacho.historialCarga.find(carga => 
            !carga.esCarga && 
            carga.itemMovidoIds && 
            carga.itemMovidoIds.includes(itemId)
        );

        if (descarga && descarga.fecha) {
            return new Date(descarga.fecha).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        return '--:--';
    };

    // Calcular estadísticas de entrega
    const calcularEstadisticas = () => {
        const codigosEscaneados = procesarCodigosEscaneados();
        const totalItems = codigosEscaneados.length;
        const itemsEntregados = codigosEscaneados.filter(item => item.estado === 'Entregado').length;
        const itemsPendientes = totalItems - itemsEntregados;

        return {
            totalItems,
            itemsEntregados,
            itemsPendientes,
            porcentajeCompletado: totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0
        };
    };

    const codigosEscaneados = procesarCodigosEscaneados();
    const estadisticas = calcularEstadisticas();

    // Información del estado actual basada en la ruta de despacho
    const obtenerEstadoActual = () => {
        if (!ventaDetalle?.rutaDespacho) {
            return {
                conductor: 'No asignado',
                estado: 'Sin ruta asignada',
                tiempoEstimado: 'N/A'
            };
        }

        const ruta = ventaDetalle.rutaDespacho;
        const estadoRuta = ruta.estado || 'pendiente';
        
        let estadoTexto = 'Preparando ruta';
        let tiempoEstimado = 'Calculando...';

        switch (estadoRuta) {
            case 'en_ruta':
                estadoTexto = 'En proceso de entrega';
                tiempoEstimado = estadisticas.itemsPendientes > 0 ? `${estadisticas.itemsPendientes * 5} min restantes` : 'Completado';
                break;
            case 'completado':
                estadoTexto = 'Entrega completada';
                tiempoEstimado = 'Finalizado';
                break;
            case 'pendiente':
            default:
                estadoTexto = 'Esperando inicio de ruta';
                tiempoEstimado = 'Por determinar';
        }

        return {
            conductor: ruta.chofer?.nombre || 'No asignado',
            estado: estadoTexto,
            tiempoEstimado: tiempoEstimado
        };
    };

    const estadoActual = obtenerEstadoActual();

    return (
        <div className="h-72 overflow-y-auto space-y-4 min-w-lg">
            {/* Header con información del pedido */}
            {(pedido || ventaDetalle) && (
                <div className="p-3 bg-gray-50 rounded-md border">
                    <h2 className="font-bold text-lg text-gray-900">
                        {ventaDetalle?.cliente?.nombre || pedido?.clienteId?.nombre || pedido?.clienteNombre || 'Cliente no especificado'}
                    </h2>
                    <div className="grid grid-cols-1 gap-1 mt-2">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">RUT:</span> {ventaDetalle?.cliente?.rut || pedido?.clienteId?.rut || 'No disponible'}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">Giro:</span> {ventaDetalle?.cliente?.giro || pedido?.clienteId?.giro || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">Teléfono:</span> {ventaDetalle?.cliente?.telefono || pedido?.clienteId?.telefono || 'No disponible'}
                        </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-300">
                        <p className="text-sm text-gray-600">
                            Orden #{(ventaDetalle?._id || pedido?._id)?.substring((ventaDetalle?._id || pedido?._id)?.length - 8) || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                            {(ventaDetalle?.fecha || pedido?.fecha) ? new Date(ventaDetalle?.fecha || pedido?.fecha).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : 'Fecha no disponible'}
                        </p>
                    </div>
                </div>
            )}

            {/* Recuadro de códigos escaneados */}
            <div className="border rounded-lg p-3 bg-gray-50">
                <h3 className="font-semibold text-sm mb-3 text-gray-700">Códigos Escaneados</h3>
                
                {/* Visualización de cilindros */}
                <div className="mb-4 p-3 bg-white rounded border">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Cilindros</h4>
                    {codigosEscaneados.length > 0 ? (
                        <div className="overflow-x-auto">
                            <div className="flex gap-3 min-w-max pb-2">
                                {codigosEscaneados.map((item, idx) => (
                                    <div key={idx} className="flex items-end gap-2 min-w-fit">
                                        {/* Código vertical al lado izquierdo */}
                                        <div className="flex flex-col justify-end pb-2">
                                            <div className="writing-mode-vertical text-xs font-mono font-semibold text-gray-700 mb-1"
                                                 style={{ 
                                                     writingMode: 'vertical-rl', 
                                                     textOrientation: 'mixed',
                                                     transform: 'rotate(180deg)',
                                                     minHeight: '60px',
                                                     display: 'flex',
                                                     alignItems: 'flex-end'
                                                 }}>
                                                {item.codigo}
                                            </div>
                                            <div className={`text-xs px-1 rounded text-center whitespace-nowrap ${
                                                item.estado === 'Entregado' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {item.estado === 'Entregado' ? '✓' : '⏳'}
                                            </div>
                                        </div>
                                        
                                        {/* Cilindro */}
                                        <div className="flex flex-col items-center">
                                            <Image
                                                src={`/ui/tanque_biox${getColorEstanque(item.elemento)}.png`}
                                                alt={`${item.elemento} tank`}
                                                width={32}
                                                height={72}
                                                className={`${item.estado === 'Entregado' ? 'opacity-100' : 'opacity-40'}`}
                                                style={{ width: '32px', height: 'auto' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            {ventaDetalle ? 'No hay cilindros registrados en esta orden' : 'Cargando información de productos...'}
                        </div>
                    )}
                </div>

            </div>

            {/* Botones de operaciones */}
            <div className="space-y-2">
                <button 
                    className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold text-sm"
                    onClick={() => alert('Función Modificar - En desarrollo')}
                >
                    <FaEdit className="mr-2" />
                    MODIFICAR ORDEN
                </button>
                <button 
                    className="w-full flex items-center justify-center py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-semibold text-sm"
                    onClick={() => {
                        if (confirm('¿Estás seguro de que deseas anular esta venta?')) {
                            alert('Función Anular Venta - En desarrollo');
                        }
                    }}
                >
                    <FaBan className="mr-2" />
                    ANULAR VENTA
                </button>
            </div>

            {/* Información adicional */}
            <div className="border rounded-lg p-3 bg-blue-50">
                <h3 className="font-semibold text-sm mb-2 text-blue-700">Estado Actual</h3>
                <div className="text-sm text-blue-600">
                    <div>• Conductor: {estadoActual.conductor}</div>
                    <div>• Productos: {estadisticas.itemsEntregados} de {estadisticas.totalItems} entregados</div>
                    <div>• Tiempo estimado: {estadoActual.tiempoEstimado}</div>
                    {estadisticas.totalItems > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${estadisticas.porcentajeCompletado}%` }}
                                ></div>
                            </div>
                            <div className="text-xs mt-1">{estadisticas.porcentajeCompletado}% completado</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}