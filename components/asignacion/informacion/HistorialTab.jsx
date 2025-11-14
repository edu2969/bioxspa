"use client";

import React from 'react';
import { FaClock } from 'react-icons/fa';
import { BsGeoAltFill } from 'react-icons/bs';
import { TIPO_ESTADO_VENTA, TIPO_ESTADO_RUTA_DESPACHO } from '@/app/utils/constants';

export default function HistorialTab({ ventaDetalle }) {
    // Mapear estados de venta a nombres legibles
    const getEstadoVentaNombre = (estado) => {
        const estadosMap = {
            [TIPO_ESTADO_VENTA.borrador]: "Borrador",
            [TIPO_ESTADO_VENTA.por_asignar]: "Por asignar",
            [TIPO_ESTADO_VENTA.cotizacion]: "Cotización",
            [TIPO_ESTADO_VENTA.ot]: "Orden de trabajo",
            [TIPO_ESTADO_VENTA.preparacion]: "Preparación",
            [TIPO_ESTADO_VENTA.reparto]: "En reparto",
            [TIPO_ESTADO_VENTA.entregado]: "Entregado",
            [TIPO_ESTADO_VENTA.rechazado]: "Rechazado",
            [TIPO_ESTADO_VENTA.anulado]: "Anulado",
            [TIPO_ESTADO_VENTA.pagado]: "Pagado",
            [TIPO_ESTADO_VENTA.cerrado]: "Cerrado"
        };
        return estadosMap[estado] || `Estado ${estado}`;
    };

    // Mapear estados de ruta a nombres legibles
    const getEstadoRutaNombre = (estado) => {
        const estadosMap = {
            [TIPO_ESTADO_RUTA_DESPACHO.preparacion]: "Preparación",
            [TIPO_ESTADO_RUTA_DESPACHO.orden_cargada]: "Orden cargada",
            [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada]: "Orden confirmada",
            [TIPO_ESTADO_RUTA_DESPACHO.checklist_vehiculo]: "Checklist vehículo",
            [TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino]: "Selección destino",
            [TIPO_ESTADO_RUTA_DESPACHO.en_ruta]: "En ruta",
            [TIPO_ESTADO_RUTA_DESPACHO.descarga]: "Descarga",
            [TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada]: "Descarga confirmada",
            [TIPO_ESTADO_RUTA_DESPACHO.carga]: "Carga",
            [TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada]: "Carga confirmada",
            [TIPO_ESTADO_RUTA_DESPACHO.retirado]: "Retirado",
            [TIPO_ESTADO_RUTA_DESPACHO.regreso]: "Regreso",
            [TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado]: "Regreso confirmado",
            [TIPO_ESTADO_RUTA_DESPACHO.terminado]: "Terminado",
            [TIPO_ESTADO_RUTA_DESPACHO.cancelado]: "Cancelado",
            [TIPO_ESTADO_RUTA_DESPACHO.a_reasignar]: "A reasignar",
            [TIPO_ESTADO_RUTA_DESPACHO.anulado]: "Anulado"
        };
        return estadosMap[estado] || `Estado ${estado}`;
    };

    // Procesar datos del historial en orden cronológico
    const procesarTimelineData = () => {
        const eventos = [];

        // Agregar historial de estados de venta
        if (ventaDetalle?.historialEstados) {
            ventaDetalle.historialEstados.forEach(estado => {
                eventos.push({
                    fecha: new Date(estado.fecha),
                    estado: getEstadoVentaNombre(estado.estado),
                    descripcion: estado.comentario || null,
                    tipo: 'venta',
                    completado: true,
                    ubicacion: false
                });
            });
        }

        // Agregar historial de estados de ruta
        if (ventaDetalle?.rutaDespacho?.historialEstado) {
            ventaDetalle.rutaDespacho.historialEstado.forEach(estado => {
                eventos.push({
                    fecha: new Date(estado.fecha),
                    estado: getEstadoRutaNombre(estado.estado),
                    descripcion: ventaDetalle.rutaDespacho.chofer?.nombre ? `${ventaDetalle.rutaDespacho.chofer.nombre}` : null,
                    tipo: 'ruta',
                    completado: true,
                    ubicacion: [TIPO_ESTADO_RUTA_DESPACHO.en_ruta, TIPO_ESTADO_RUTA_DESPACHO.descarga, TIPO_ESTADO_RUTA_DESPACHO.regreso].includes(estado.estado)
                });
            });
        }

        // Agregar historial de carga
        if (ventaDetalle?.rutaDespacho?.historialCarga) {
            ventaDetalle.rutaDespacho.historialCarga.forEach(carga => {
                const itemsCount = carga.itemMovidoIds?.length || 0;
                eventos.push({
                    fecha: new Date(carga.fecha),
                    estado: carga.esCarga ? "Carga" : "Descarga",
                    descripcion: itemsCount > 0 ? `${itemsCount} items ${carga.esCarga ? 'cargados' : 'descargados'}` : null,
                    tipo: 'carga',
                    completado: true,
                    ubicacion: !carga.esCarga
                });
            });
        }

        // Ordenar por fecha
        eventos.sort((a, b) => a.fecha - b.fecha);

        // Calcular tiempos entre eventos
        const eventosConTiempo = eventos.map((evento, idx) => {
            let tiempo = null;
            if (idx < eventos.length - 1) {
                const diff = eventos[idx + 1].fecha - evento.fecha;
                const segundos = Math.round(diff / 1000);
                
                if (segundos > 0) {
                    if (segundos < 60) {
                        tiempo = `${segundos}s`;
                    } else {
                        const minutos = Math.round(segundos / 60);
                        tiempo = minutos > 60 ? `${Math.round(minutos / 60)}h` : `${minutos}min`;
                    }
                }
            }

            return {
                estado: evento.estado,
                descripcion: evento.descripcion,
                fecha: evento.fecha.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                tiempo,
                completado: evento.completado,
                ubicacion: evento.ubicacion
            };
        });

        return eventosConTiempo;
    };

    const timelineData = ventaDetalle ? procesarTimelineData() : [];

    return (
        <div className="flex flex-row items-start justify-center gap-3 mb-6 h-64 overflow-y-auto">
            {timelineData.length > 0 ? (
                <>
                    {/* Trazado vertical con checks y tiempos a la izquierda */}
                    <div className="flex flex-row items-start">
                        {/* Tiempos a la izquierda */}
                        <div className="flex flex-col items-end mr-2">
                            {timelineData.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-end justify-center h-16">
                                    <div className="flex items-center mt-8">
                                        {item.tiempo && (
                                            <>
                                                <FaClock className="mr-1 text-gray-400" />
                                                <span className="text-xs">{item.tiempo}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Trazado vertical con checks */}
                        <div className="flex flex-col items-center mt-1 ml-2">
                            {timelineData.map((item, idx, arr) => (
                                <React.Fragment key={idx}>
                                    {/* Punto con check */}
                                    <div className={`w-6 h-6 rounded-full ${item.completado ? 'bg-blue-700 border-blue-400' : 'bg-gray-300 border-gray-200'} border-4 flex items-center justify-center`}>
                                        {item.completado && (
                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    {/* Línea vertical excepto el último */}
                                    {idx < arr.length - 1 && (
                                        <div className={`w-2 h-[40px] ${item.completado ? 'bg-blue-400' : 'bg-gray-200'} mx-auto`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    {/* Detalle de cada punto */}
                    <div className="flex flex-col items-start justify-start h-full ml-2 mt-1">
                        {timelineData.map((item, idx) => (
                            <div key={idx} className="h-16">
                                <div className="flex flex-col h-16">
                                    <div className={`font-bold ${item.completado ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {item.estado}
                                    </div>
                                    {item.descripcion && (
                                        <div className="text-xs text-gray-500">{item.descripcion}</div>
                                    )}
                                    <div className="flex items-center text-xs text-gray-500">
                                        {item.ubicacion && <BsGeoAltFill className="mr-1" />}
                                        {item.fecha}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full w-full text-center">
                    <div className="text-gray-500 text-sm">
                        {ventaDetalle ? 'No hay historial disponible para esta orden' : 'Cargando historial...'}
                    </div>
                </div>
            )}
        </div>
    );
}