"use client";

import React, { Fragment } from 'react';
import { FaClock } from 'react-icons/fa';
import { BsGeoAltFill } from 'react-icons/bs';
import { useQuery } from '@tanstack/react-query';
import { IHistorialVentaView } from '@/types/types';

// Función para formatear duración de segundos a horas:minutos
const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
        return `${minutes}m`;
    }
    
    return `${hours}h ${minutes}m`;
};

export default function HistorialTab({ ventaId } : {
    ventaId: string | null;
}) {
    const { data: historial, isLoading } = useQuery<IHistorialVentaView[]>({
        queryKey: ['historial-venta', ventaId],
        queryFn: async () => {
            const response = await fetch(`/api/ventas/historialEstados?ventaId=${ventaId}`);
            const data = await response.json();
            return data.historial;
        },
        enabled: ventaId !== null
    });
    return (
        <div className="flex flex-row items-start justify-center gap-3 mb-6 h-64 overflow-y-auto">
            {historial && historial.length > 0 ? (
                <>
                    {/* Trazado vertical con checks y tiempos a la izquierda */}
                    <div className="flex flex-row items-start">
                        {/* Tiempos a la izquierda */}
                        <div className="flex flex-col items-end mr-2">
                            {historial.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-end justify-center h-20">
                                    <div className="flex items-center mt-8">
                                        {item.duracion && (
                                            <>
                                                <FaClock className="mr-1 text-gray-400" />
                                                <span className="text-xs">{formatDuration(item.duracion)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Trazado vertical con checks */}
                        <div className="flex flex-col items-center mt-1 ml-2">
                            {historial.map((item, idx, arr) => (
                                <Fragment key={idx}>
                                    {/* Punto con check */}
                                    <div className={`w-6 h-6 rounded-full ${idx < historial.length ? 'bg-blue-700 border-blue-400' : 'bg-gray-300 border-gray-200'} border-4 flex items-center justify-center`}>
                                        {idx < historial.length && (
                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    {/* Línea vertical excepto el último */}
                                    {idx < arr.length - 1 && (
                                        <div className={`w-2 h-[56px] ${idx < historial.length ? 'bg-blue-400' : 'bg-gray-200'} mx-auto`} />
                                    )}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                    {/* Detalle de cada punto */}
                    <div className="flex flex-col items-start justify-start h-full ml-2 mt-1">
                        {historial.map((item, idx) => (
                            <div key={idx} className="h-20">
                                <div className="flex flex-col h-20 justify-start">
                                    {/* Nombre del estado */}
                                    <div className={`font-bold text-sm ${idx < historial.length ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {item.titulo}
                                    </div>
                                    {/* Fecha formateada */}
                                    <div className="text-xs text-gray-600 mt-1">
                                        {new Date(item.fecha).toLocaleDateString('es-CL', {
                                            day: '2-digit',
                                            month: '2-digit', 
                                            year: 'numeric'
                                        })} {new Date(item.fecha).toLocaleTimeString('es-CL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                        })}
                                    </div>
                                    {/* Dirección con icono */}
                                    {item.descripcion && (
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <BsGeoAltFill className="mr-1" />
                                            {item.descripcion}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full w-full text-center">
                    <div className="text-gray-500 text-sm">
                        {!isLoading && (!historial || historial.length === 0) 
                            ? 'No hay historial disponible para esta orden' 
                            : 'Cargando historial...'}
                    </div>
                </div>
            )}
        </div>
    );
}