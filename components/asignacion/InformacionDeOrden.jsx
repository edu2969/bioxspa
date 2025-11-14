"use client";

import React, { useState, useEffect, useCallback } from 'react';
import OperacionesTab from './informacion/OperacionesTab';
import HistorialTab from './informacion/HistorialTab';
import MensajeriaTab from './informacion/MensajeriaTab';
import Loader from '../Loader';

export default function InformacionDeOrden({ 
    show, 
    onClose, 
    pedido = null,
    loading = false 
}) {
    const [activeTab, setActiveTab] = useState('historial');
    const [ventaDetalle, setVentaDetalle] = useState(null);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);

    const fetchVentaDetalle = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            const response = await fetch(`/api/ventas/masDetalles/${pedido._id}`);
            const data = await response.json();

            console.log("DATA", data);
            
            if (data.ok) {
                setVentaDetalle(data.venta);
            } else {
                setError('Error al cargar los detalles de la venta');
                console.error('Error fetching venta details:', data.error);
            }
        } catch (error) {
            setError('Error de conexión al cargar los datos');
            console.error('Error fetching venta details:', error);
        } finally {
            setLoadingData(false);
        }
    }, [pedido, setLoadingData, setError, setVentaDetalle]);

    // Fetch datos de la venta cuando se abre el modal
    useEffect(() => {
        if (show && pedido && pedido._id) {
            fetchVentaDetalle();
        }
    }, [show, pedido, fetchVentaDetalle]);    

    if (!show) return null;

    const tabs = [
        { id: 'operaciones', label: 'Operaciones' },
        { id: 'historial', label: 'Historial' },
        { id: 'mensajeria', label: 'Mensajería' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operaciones':
                return <OperacionesTab pedido={pedido} ventaDetalle={ventaDetalle} />;
            case 'historial':
                return <HistorialTab ventaDetalle={ventaDetalle} />;
            case 'mensajeria':
                return <MensajeriaTab ventaDetalle={ventaDetalle} />;
            default:
                return <HistorialTab ventaDetalle={ventaDetalle} />;
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-16 mx-auto p-5 border w-[480px] max-w-[90vw] shadow-lg rounded-md bg-white">
                <div className="mt-3 text-left">
                    {/* Loading Overlay */}
                    {loadingData && (
                        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-md">
                            <Loader texto="Cargando información..." />
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !loadingData && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-700 text-sm">{error}</p>
                            <button 
                                onClick={fetchVentaDetalle}
                                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex justify-between items-center mb-4">
                        {tabs.map((tab, idx) => (
                            <button
                                key={tab.id}
                                className={`flex-1 text-center py-2 font-semibold focus:outline-none transition-colors ${
                                    idx === 0 ? 'rounded-tl-md' : ''
                                } ${
                                    idx === tabs.length - 1 ? 'rounded-tr-md' : ''
                                } ${
                                    activeTab === tab.id
                                        ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-b-2 border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab(tab.id)}
                                disabled={loadingData}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Contenido del tab activo */}
                    {!loadingData && renderTabContent()}

                    {/* Botones de acción */}
                    <div className={`mt-4 ${loading || loadingData ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={onClose}
                            disabled={loading || loadingData}
                            className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                        >
                            CERRAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
