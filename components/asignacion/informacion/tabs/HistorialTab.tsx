"use client";

import React, { Fragment } from 'react';
import { FaClock } from 'react-icons/fa';
import { BsGeoAltFill } from 'react-icons/bs';
import { useQuery } from '@tanstack/react-query';
import { IHistorialVentaView } from '@/types/types';

export default function HistorialTab({ rutaDespachoId } : {
    rutaDespachoId: string | null;
}) {
    const { data: historial, isLoading } = useQuery<IHistorialVentaView[]>({
        queryKey: ['historial-venta', rutaDespachoId],
        queryFn: async () => {
            const response = await fetch(`/api/ventas/historialEstados?rutaDespachoId=${rutaDespachoId}`);
            const data = await response.json();
            return data.historial;
        },
        enabled: rutaDespachoId !== null
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
                                <div key={idx} className="flex flex-col items-end justify-center h-16">
                                    <div className="flex items-center mt-8">
                                        {item.duracion && (
                                            <>
                                                <FaClock className="mr-1 text-gray-400" />
                                                <span className="text-xs">{item.duracion}</span>
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
                                        <div className={`w-2 h-[40px] ${idx < historial.length ? 'bg-blue-400' : 'bg-gray-200'} mx-auto`} />
                                    )}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                    {/* Detalle de cada punto */}
                    <div className="flex flex-col items-start justify-start h-full ml-2 mt-1">
                        {historial.map((item, idx) => (
                            <div key={idx} className="h-16">
                                <div className="flex flex-col h-16">
                                    <div className={`font-bold ${idx < historial.length ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {item.estado}
                                    </div>
                                    {item.descripcion && (
                                        <div className="text-xs text-gray-500">{item.descripcion}</div>
                                    )}
                                    <div className="flex items-center text-xs text-gray-500">
                                        {item.descripcion && <BsGeoAltFill className="mr-1" />}
                                        {item.fecha.toLocaleString()}
                                    </div>
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