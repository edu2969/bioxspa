"use client";

import React from 'react';
import Image from 'next/image';
import { FaEdit, FaBan } from 'react-icons/fa';
import { getColorEstanque } from '@/lib/uix';
import type { IDetalleVentaView } from '@/types/venta';
import { useQuery } from '@tanstack/react-query';

export default function OperacionesTab({ rutaDespachoId } : {
    rutaDespachoId: string | null;
}) {
    const { data: ventaDetalle } = useQuery<IDetalleVentaView | null>({
        queryKey: ['venta-detalle', rutaDespachoId],
        queryFn: async () => {
            if (!rutaDespachoId) return null;
            const response = await fetch(`/api/ventas/masDetalles/${rutaDespachoId}`);
            const data = await response.json();
            return data.venta;
        },
        enabled: rutaDespachoId !== null
    });

    return (
        <div className="h-72 overflow-y-auto space-y-4 min-w-lg">
            {/* Header con información del pedido */}
            {ventaDetalle && (
                <div className="p-3 bg-gray-50 rounded-md border">
                    <h2 className="font-bold text-lg text-gray-900">
                        {ventaDetalle?.cliente?.nombre || 'Cliente no especificado'}
                    </h2>
                    <div className="grid grid-cols-1 gap-1 mt-2">
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">RUT:</span> {ventaDetalle?.cliente?.nombre || 'No disponible'}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">Giro:</span> {ventaDetalle?.cliente?.giro || 'No especificado'}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">Teléfono:</span> {ventaDetalle?.cliente?.telefono || 'No disponible'}
                        </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-300">
                        <p className="text-sm text-gray-600">
                            Orden #N/A
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(ventaDetalle?.fecha || 0).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
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
                    <div className="overflow-x-auto">
                        <div className="flex gap-3 min-w-max pb-2">
                            {ventaDetalle && ventaDetalle.detalles?.map((item, idx) => (
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
                                            src={`/ui/tanque_biox${getColorEstanque(item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento)}.png`}
                                            alt={`${item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento} tank`}
                                            width={32}
                                            height={72}
                                            className={`${item.estado === 'Entregado' ? 'opacity-100' : 'opacity-40'}`}
                                            style={{ width: '32px', height: 'auto' }}
                                        />
                                    </div>
                                </div>
                            )) || <></>}
                        </div>
                    </div>                    
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
                    <div>• Conductor: ??</div>
                    <div>• Productos: 0 de 0 entregados</div>
                    <div>• Tiempo estimado: 0</div>                    
                    <div className="mt-2">
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{
                                        width: `0%` }}
                            ></div>
                        </div>
                        <div className="text-xs mt-1">0% completado</div>
                    </div>
                </div>
            </div>
        </div>
    );
}