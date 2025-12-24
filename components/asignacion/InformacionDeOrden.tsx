"use client";

import React, { useState } from 'react';
import OperacionesTab from './informacion/tabs/DetalleVentaTab';
import HistorialTab from './informacion/tabs/HistorialTab';
import MensajeriaTab from './informacion/tabs/MensajeriaTab';

export default function InformacionDeOrden({
    ventaId,
    onClose, 
    loading = false 
} : {
    ventaId: string | null;
    onClose: () => void;
    loading?: boolean;
}) {
    const [activeTab, setActiveTab] = useState('operaciones');
    const tabs = [
        { id: 'operaciones', label: 'Operaciones' },
        { id: 'historial', label: 'Historial' },
        { id: 'mensajeria', label: 'Mensajería' }
    ];

    const renderTabContent = () => {        
        switch (activeTab) {
            case 'operaciones':
                return <OperacionesTab ventaId={ventaId} />;
            case 'historial':
                return <HistorialTab ventaId={ventaId} />;
            case 'mensajeria':
                return <MensajeriaTab ventaId={ventaId} />;
            default:
                return <OperacionesTab ventaId={ventaId} />;
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-16 mx-auto p-5 border w-[480px] max-w-[90vw] shadow-lg rounded-md bg-white">
                <div className="mt-3 text-left">
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
                                disabled={loading}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Contenido del tab activo */}
                    {
                        renderTabContent()
                    }

                    {/* Botones de acción */}
                    <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={onClose}
                            disabled={loading}
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
