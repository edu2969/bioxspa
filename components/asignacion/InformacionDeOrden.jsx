"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { FaClock, FaEdit, FaBan } from 'react-icons/fa';
import { BsGeoAltFill, BsCheck2All } from 'react-icons/bs';
import { MdSend } from 'react-icons/md';
import { getColorEstanque } from '@/lib/uix';

export default function InformacionDeOrden({ 
    show, 
    onClose, 
    pedido = null,
    loading = false 
}) {
    const [activeTab, setActiveTab] = useState('historial'); // Cambiado a historial por defecto
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            usuario: 'Luis',
            rol: 'Conductor',
            mensaje: 'He llegado al cliente, pero está cerrado. ¿Qué debo hacer?',
            fecha: '2024-11-04',
            hora: '14:32',
            esPropio: false,
            avatar: 'luis'
        },
        {
            id: 2,
            usuario: 'Mario',
            rol: 'Jefe de Despacho',
            mensaje: 'Hola Luis, por favor contacta al cliente al número que aparece en la orden',
            fecha: '2024-11-04',
            hora: '14:34',
            esPropio: false,
            avatar: 'mario'
        },
        {
            id: 3,
            usuario: 'Luis',
            rol: 'Conductor',
            mensaje: 'Ya contacté al cliente, me dice que llega en 10 minutos',
            fecha: '2024-11-04',
            hora: '14:35',
            esPropio: false,
            avatar: 'luis'
        },
        {
            id: 4,
            usuario: 'Alex',
            rol: 'Gerente',
            mensaje: 'Perfecto, mantengan la comunicación. Cualquier novedad reporten de inmediato',
            fecha: '2024-11-04',
            hora: '14:40',
            esPropio: false,
            avatar: 'alex'
        },
        {
            id: 5,
            usuario: 'Karen',
            rol: 'Administradora General',
            mensaje: 'El cliente confirma su llegada. Luis, procede con la descarga normal',
            fecha: '2024-11-04',
            hora: '14:46',
            esPropio: true,
            avatar: 'karen'
        }
    ]);

    // Códigos escaneados dummy
    const [codigosEscaneados] = useState([
        { codigo: 'BX001234', producto: 'Oxígeno 10m³', elemento: 'o2', estado: 'Entregado', hora: '14:20' },
        { codigo: 'BX001235', producto: 'Oxígeno 10m³', elemento: 'o2', estado: 'Entregado', hora: '14:21' },
        { codigo: 'BX001236', producto: 'Acetileno 5m³', elemento: 'acetileno', estado: 'Entregado', hora: '14:22' },
        { codigo: 'BX001237', producto: 'Argón 15m³', elemento: 'ar', estado: 'Pendiente', hora: '--:--' },
        { codigo: 'BX001238', producto: 'CO₂ 20m³', elemento: 'co2', estado: 'Entregado', hora: '14:23' },
        { codigo: 'BX001239', producto: 'Nitrógeno 25m³', elemento: 'n2', estado: 'Pendiente', hora: '--:--' }
    ]);

    if (!show) return null;

    const tabs = [
        { id: 'operaciones', label: 'Operaciones' },
        { id: 'historial', label: 'Historial' },
        { id: 'mensajeria', label: 'Mensajería' }
    ];

    // Datos simulados del timeline - aquí se conectarían con los datos reales del pedido
    const timelineData = [
        {
            estado: "Por asignar",
            descripcion: null,
            fecha: "12/06/2024 09:00",
            tiempo: "15min",
            completado: true
        },
        {
            estado: "Cargado",
            descripcion: "por Juan Perez",
            fecha: "12/06/2024 09:15",
            tiempo: "30min",
            completado: true
        },
        {
            estado: "Arribo",
            descripcion: "Empresa S.A.",
            fecha: "12/06/2024 09:45",
            tiempo: "10min",
            completado: true,
            ubicacion: true
        },
        {
            estado: "Recibe",
            descripcion: "Pedro Soto 12.345.678-9",
            fecha: "12/06/2024 09:55",
            tiempo: "5min",
            completado: true
        },
        {
            estado: "Descarga",
            descripcion: null,
            fecha: "12/06/2024 10:00",
            tiempo: "20min",
            completado: true
        },
        {
            estado: "Retorno",
            descripcion: null,
            fecha: "12/06/2024 10:20",
            tiempo: null,
            completado: true
        }
    ];

    const renderOperaciones = () => (
        <div className="h-72 overflow-y-auto space-y-4 min-w-lg">
            {/* Header con información del pedido */}
            {pedido && (
                <div className="p-3 bg-gray-50 rounded-md border">
                    <h2 className="font-bold text-lg text-gray-900">{pedido.clienteNombre}</h2>
                    <p className="text-sm text-gray-600">
                        Orden #{pedido._id?.substring(pedido._id.length - 8) || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                        {pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : 'Fecha no disponible'}
                    </p>
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
                    <div>• Conductor: En proceso de descarga</div>
                    <div>• Productos: 3 de 4 entregados</div>
                    <div>• Tiempo estimado: 15 min restantes</div>
                </div>
            </div>
        </div>
    );

    const renderHistorial = () => (
        <div className="flex flex-row items-start justify-center gap-3 mb-6 h-64 overflow-y-auto">
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
        </div>
    );

    const renderMensajeria = () => {
        const handleSendMessage = () => {
            if (newMessage.trim()) {
                const newMsg = {
                    id: messages.length + 1,
                    usuario: 'Karen',
                    rol: 'Administradora General',
                    mensaje: newMessage.trim(),
                    fecha: new Date().toISOString().split('T')[0],
                    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    esPropio: true,
                    avatar: 'karen'
                };
                setMessages([...messages, newMsg]);
                setNewMessage('');
            }
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        };

        const groupMessagesByDate = (messages) => {
            const groups = {};
            messages.forEach(msg => {
                const date = msg.fecha;
                if (!groups[date]) {
                    groups[date] = [];
                }
                groups[date].push(msg);
            });
            return groups;
        };

        const formatDate = (dateString) => {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            if (dateString === today) return 'Hoy';
            if (dateString === yesterday) return 'Ayer';
            
            return new Date(dateString).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });
        };

        const messageGroups = groupMessagesByDate(messages);

        return (
            <div className="h-72 flex flex-col">
                {/* Chat área */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50 rounded-t-lg border">
                    {Object.entries(messageGroups).map(([date, msgs]) => (
                        <div key={date}>
                            {/* Separador de fecha */}
                            <div className="flex justify-center my-2">
                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                                    {formatDate(date)}
                                </span>
                            </div>
                            
                            {/* Mensajes del día */}
                            {msgs.map((msg) => (
                                <div key={msg.id} className={`flex mb-2 ${msg.esPropio ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-xs ${msg.esPropio ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 flex-shrink-0 rounded-full overflow-hidden ${msg.esPropio ? 'ml-2' : 'mr-2'}`}>
                                            <Image
                                                src={`/profiles/${msg.avatar}.jpg`}
                                                alt={`${msg.usuario} avatar`}
                                                width={32}
                                                height={32}
                                                className="w-8 h-8 object-cover"
                                            />
                                        </div>
                                        
                                        {/* Burbuja de mensaje */}
                                        <div className={`rounded-lg px-3 py-2 shadow-sm ${
                                            msg.esPropio 
                                                ? 'bg-blue-500 text-white' 
                                                : 'bg-white text-gray-800 border'
                                        }`}>
                                            {!msg.esPropio && (
                                                <div className="text-xs font-semibold mb-1 text-blue-600">
                                                    {msg.usuario} • {msg.rol}
                                                </div>
                                            )}
                                            <div className="text-sm">{msg.mensaje}</div>
                                            <div className={`text-xs mt-1 flex items-center ${
                                                msg.esPropio ? 'text-blue-100 justify-end' : 'text-gray-500'
                                            }`}>
                                                <span>{msg.hora}</span>
                                                {msg.esPropio && (
                                                    <BsCheck2All className="ml-1 text-blue-200" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                
                {/* Input para nuevo mensaje */}
                <div className="flex items-center p-2 bg-white border-t border-l border-r rounded-b-lg">
                    <input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 py-2 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <MdSend className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operaciones':
                return renderOperaciones();
            case 'historial':
                return renderHistorial();
            case 'mensajeria':
                return renderMensajeria();
            default:
                return renderHistorial(); // Cambiado a historial por defecto
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
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Contenido del tab activo */}
                    {renderTabContent()}

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
