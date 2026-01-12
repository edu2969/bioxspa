"use client";

import React, { useCallback } from 'react'; // Agregado useMemo para cálculos pesados
import { ConfirmModal } from '../modals/ConfirmModal';
import Loader from '../Loader';
import { useState } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import PorAsignar from './PorAsignar';
import Conductores from './Conductores';
import EnTransito from './EnTransito';
import InformacionDeOrden from './InformacionDeOrden';
import { useForm, useWatch } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { INuevaVentaSubmit } from '../pedidos/types';
import Nav from '../Nav';
import { SessionProvider } from 'next-auth/react';
import CommentModal from '../modals/CommentModal';
import { IPedidoPorAsignar, IConductoresResponse } from '@/types/types';

interface ISucursalSelectable {
    _id: string;
    nombre: string;
    ventasActivas: number;
}

export default function Asignacion() {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReasignacionModal, setShowReasignacionModal] = useState(false);
    const [showDetalleOrdenModal, setShowDetalleOrdenModal] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [ventaIdForComment, setVentaIdForComment] = useState<string | null>(null);
    const [comentarioActual, setComentarioActual] = useState<string | null>(null);
    const [onSaveComment, setOnSaveComment] = useState<() => void>(() => () => {});
    const [selectedChofer, setSelectedChofer] = useState<{ _id: string, nombre: string } | null>(null);
    const [selectedVenta, setSelectedVenta] = useState<{ _id: string, cliente: string, comentario: string | null } | null>(null);

    // Función callback unificada para manejo de comentarios
    const handleShowCommentModal = (ventaId: string, comentario?: string | null, onSaveComment?: () => void) => {
        setVentaIdForComment(ventaId);
        setComentarioActual(comentario || null);
        setOnSaveComment(() => onSaveComment || (() => {})); // Wrapper para que sea una función
        setShowCommentModal(true);
    };

    const handleCloseCommentModal = () => {
        setShowCommentModal(false);
        setVentaIdForComment(null);
        setComentarioActual(null);
        setOnSaveComment(() => () => {});
    };
    const [isSaving, setIsSaving] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragOrigin, setDragOrigin] = useState<'pedidos' | 'conductores' | null>(null);
    const [dragSourceConductor, setDragSourceConductor] = useState<string | null>(null);
    const { control, setValue } = useForm<INuevaVentaSubmit>();

    const { data: sucursales, isLoading } = useQuery<ISucursalSelectable[]>({
        queryKey: ['sucursales'],
        queryFn: async () => {
            const response = await fetch(`/api/pedidos/asignacion/sucursales`);
            if (!response.ok) {
                throw new Error("Failed to fetch sucursales");
            }
            const data = await response.json();
            const localSucursalId = localStorage.getItem("sucursalId");
            if (!localSucursalId) {
                setValue("sucursalId", data.sucursales[0]?._id);
                localStorage.setItem("sucursalId", String(data.sucursales[0]?._id));
            } else {
                setValue("sucursalId", localSucursalId);
            }
            console.log("Fetched sucursales:", data.sucursales);
            return data.sucursales;
        }
    });

    const sucursalId = useWatch({
        control,
        name: 'sucursalId'
    });

    const qryClient = useQueryClient();

    // Queries para obtener datos de pedidos y conductores
    const { data: pedidos } = useQuery<IPedidoPorAsignar[]>({
        queryKey: ['pedidos-por-asignar', sucursalId],
        queryFn: async () => {
            if (!sucursalId) return [];
            const response = await fetch(`/api/pedidos/asignacion/porAsignar?sucursalId=${sucursalId}`);
            if (!response.ok) throw new Error('Failed to fetch pedidos');
            const data = await response.json();
            return data.pedidos;
        },
        enabled: !!sucursalId
    });

    const { data: conductores } = useQuery<IConductoresResponse[]>({
        queryKey: ['conductores', sucursalId],
        queryFn: async () => {
            if (!sucursalId) return [];
            const response = await fetch(`/api/pedidos/asignacion/conductores?sucursalId=${sucursalId}`);
            const data = await response.json();
            return data.conductores;
        },
        enabled: !!sucursalId
    });

    // Manejadores para @dnd-kit
    const handleDragStart = (event: DragStartEvent) => {
        console.log('🎯 DND-KIT DRAG START:', event.active.id);
        const pedidoId = event.active.id as string;
        setActiveId(pedidoId);
        
        // Detectar origen: si está en pedidos o en conductores
        const enPedidos = pedidos?.some(p => p._id === pedidoId);
        let conductorOrigen = null;
        const enConductores = conductores?.some(c => {
            const tienePedido = c.pedidos?.some(p => p._id === pedidoId);
            if (tienePedido) {
                conductorOrigen = c._id;
            }
            return tienePedido;
        });
        
        if (enPedidos && !enConductores) {
            setDragOrigin('pedidos');
            setDragSourceConductor(null);
            console.log('📋 Arrastrando desde PorAsignar');
        } else if (enConductores) {
            setDragOrigin('conductores');
            setDragSourceConductor(conductorOrigen);
            console.log('🚚 Arrastrando desde Conductor:', conductorOrigen);
        } else {
            setDragOrigin('pedidos'); // fallback
            setDragSourceConductor(null);
        }
        
        // Buscar el pedido para obtener el nombre del cliente
        const pedido = pedidos?.find(p => p._id === pedidoId);
        const clienteNombre = pedido?.clienteNombre || 'Cliente desconocido';
        
        console.log('📝 Cliente seleccionado:', { _id: pedidoId, cliente: clienteNombre });
        setSelectedVenta({ _id: pedidoId, cliente: clienteNombre, comentario: pedido?.comentario || null });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        console.log('🏁 DND-KIT DRAG END:', event);
        const { active, over } = event;
        
        setActiveId(null);
        setDragOrigin(null);
        setDragSourceConductor(null);
        // setDraggedPedido(null); // No usado actualmente
        
        if (!over) {
            console.log('❌ Drop missed - no valid drop zone');
            return;
        }

        const pedidoId = active.id as string;
        const dropZoneId = over.id as string;
        
        console.log(`🎯 Attempting drop: pedido ${pedidoId} -> ${dropZoneId}`);
        
        // Verificar si se está arrastrando a sí mismo
        if (dropZoneId.startsWith('conductor-')) {
            const targetConductorId = dropZoneId.replace('conductor-', '');
            if (dragOrigin === 'conductores' && dragSourceConductor === targetConductorId) {
                console.log('🚫 Auto-asignación detectada - mismo conductor. No se ejecuta acción.');
                return; // No hacer nada si es el mismo conductor
            }
        } else if (dropZoneId === 'reasignacion' && dragOrigin === 'pedidos') {
            console.log('🚫 Auto-asignación detectada - pedido ya está en PorAsignar. No se ejecuta acción.');
            return; // No hacer nada si ya está en por asignar
        }
        
        // Determinar el tipo de drop basado en el ID
        if (dropZoneId.startsWith('conductor-')) {
            // Drop en conductor
            const conductorId = dropZoneId.replace('conductor-', '');
            console.log('🚚 Drop on conductor:', conductorId);
            
            // Buscar el conductor para obtener su nombre
            const conductor = conductores?.find(c => c._id === conductorId);
            const conductorNombre = conductor?.nombre || 'Conductor desconocido';
            
            // Buscar el pedido para obtener el nombre del cliente
            const pedido = pedidos?.find(p => p._id === pedidoId);
            const clienteNombre = pedido?.clienteNombre || 'Cliente desconocido';
            
            console.log('👤 Chofer seleccionado:', { _id: conductorId, nombre: conductorNombre });
            console.log('📝 Cliente para asignar:', { _id: pedidoId, cliente: clienteNombre });
            
            setSelectedChofer({ _id: conductorId, nombre: conductorNombre });
            setSelectedVenta({ _id: pedidoId, cliente: clienteNombre, comentario: pedido?.comentario || null });
            setShowConfirmModal(true);
        } else if (dropZoneId === 'en-transito') {
            // Drop en tránsito - solo mostrar toast de éxito
            console.log('🚚 Drop on en-transito');
            toast.success('¡Pedido movido a En Tránsito!');
        } else if (dropZoneId === 'reasignacion') {
            // Drop para reasignación (desde conductores a por asignar)
            console.log('🔄 Drop for reassignment');
            
            // Buscar el pedido para obtener el nombre del cliente
            const pedido = pedidos?.find(p => p._id === pedidoId);
            const clienteNombre = pedido?.clienteNombre || 'Cliente desconocido';
            
            console.log('🔄 Pedido para reasignar:', { _id: pedidoId, cliente: clienteNombre });
            setSelectedVenta({ _id: pedidoId, cliente: clienteNombre, comentario: pedido?.comentario || null });
            setShowReasignacionModal(true);
        }
    };

    return (
        <SessionProvider>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <main className="w-full mt-2 h-screen overflow-hidden">
                {!isLoading && sucursales && sucursales.length > 0 && (
                    <div className="flex justify-center mb-2">
                        <div className="flex">
                            {sucursales.map((sucursal, idx) => {
                                const isActive = sucursalId === sucursal._id;
                                const isFirst = idx === 0;
                                const isLast = idx === sucursales.length - 1;
                                return (
                                    <button
                                        key={String(sucursal._id)}
                                        className={`
                                        flex items-center px-5 py-2 font-semibold
                                        ${isFirst && isLast ? "rounded-md" : ""}
                                        ${isFirst && !isLast ? "rounded-r-none rounded-l-md" : ""}
                                        ${isLast && !isFirst ? "rounded-l-none rounded-r-md" : ""}
                                        ${!isFirst && !isLast ? "" : ""}
                                        ${isActive
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-blue-100"}
                                        border-0
                                        ${!isFirst ? "-ml-px" : ""}
                                        transition-colors
                                        relative
                                    `}
                                        onClick={() => {
                                            if (isActive) return;
                                            setValue("sucursalId", sucursal._id);
                                            localStorage.setItem("sucursalId", String(sucursal._id));
                                        }}
                                        type="button"
                                    >
                                        <span>{sucursal.nombre}</span>
                                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-blue-600 rounded-full border border-blue-200">
                                            {sucursal.ventasActivas || 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                {!isLoading && (!sucursales || sucursales.length === 0) && (
                    <div className="flex justify-center items-center h-12">
                        {isSaving
                            ? <Loader texto="Cargando sucursales..." />
                            : <p className="text-white py-2 bg-red-500 rounded px-4">No tienes sucursales asignadas.</p>}
                    </div>
                )}
                {!isLoading && sucursales && sucursales.length > 0 && <div className="grid grid-cols-12 h-[calc(100vh-40px)] gap-4 px-4 overflow-hidden">
                    {/* ORDENES / EN ESPERA */}
                    <div className="col-span-7 flex flex-col md:flex-row gap-4">
                        <PorAsignar
                            control={control}
                            onShowCommentModal={handleShowCommentModal}
                            setShowDetalleOrdenModal={setShowDetalleOrdenModal}
                        />
                        <Conductores
                            control={control}
                            onShowCommentModal={handleShowCommentModal}
                            setShowDetalleOrdenModal={setShowDetalleOrdenModal}
                        />
                    </div>

                    {sucursalId && 
                        <EnTransito 
                            sucursalId={sucursalId} 
                            onShowCommentModal={handleShowCommentModal}/>}
                </div>}

                <ConfirmModal
                    show={showConfirmModal}
                    loading={isSaving}
                    title="Confirmar Asignación de pedido"
                    confirmationQuestion={<div>
                        <p>Se asignará el pedido de </p>
                        <p><strong>{selectedVenta?.cliente}</strong></p>
                        <p>al chofer <strong>{selectedChofer?.nombre}</strong>?</p>
                    </div>}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setSelectedVenta(null);
                        setSelectedChofer(null);
                    }} // Cierra el modal
                    onConfirm={() => {
                        setIsSaving(true);
                        const assignPedido = async () => {
                            try {
                                const response = await fetch("/api/pedidos/asignacion", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        ventaId: selectedVenta,
                                        choferId: selectedChofer,
                                    }),
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || "Error al asignar el pedido");
                                }
                                toast.success("Pedido asignado con éxito");
                                await Promise.all([
                                    qryClient.invalidateQueries({ queryKey: ['pedidos-por-asignar', sucursalId] }),
                                    qryClient.invalidateQueries({ queryKey: ['conductores', sucursalId] }),
                                    qryClient.invalidateQueries({ queryKey: ['cargamentos-despacho'] })
                                ]);                                
                                setIsSaving(true);
                            } catch (error) {
                                console.error("Error al asignar el pedido:", error);
                                if (error instanceof Error) {
                                    toast.error(error.message || "Error al asignar el pedido");
                                } else {
                                    toast.error("Error al asignar el pedido");
                                }
                            } finally {
                                setShowConfirmModal(false); // Cierra el modal después de confirmar
                                setIsSaving(false);
                                setSelectedVenta(null);
                                setSelectedChofer(null);
                            }
                        };
                        assignPedido();
                    }}
                    confirmationLabel="ASIGNAR"
                />

                <ConfirmModal
                    show={showReasignacionModal}
                    title="Confirmar operación crítica"
                    confirmationQuestion={`¿Estás seguro de deshacer la asignación de este pedido?`}
                    loading={isSaving}
                    onClose={() => {
                        setShowReasignacionModal(false);
                        setSelectedChofer(null);
                        setSelectedVenta(null);
                    }} // Cierra el modal
                    onConfirm={() => {
                        setIsSaving(true);
                        const deshacerAsignarPedido = async () => {
                            try {
                                const response = await fetch("/api/pedidos/reasignacion", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        ventaId: selectedVenta?._id,
                                        choferId: selectedChofer?._id,
                                    }),
                                });

                                if (!response.ok) {
                                    const errorData = await response.json();
                                    throw new Error(errorData.error || "Error al deshacer la asignación del pedido");
                                }
                                toast.success("Pedido listo para asignar. Invalidating queries...");
                                await Promise.all([
                                    qryClient.invalidateQueries({ queryKey: ['conductores', sucursalId] }),
                                    qryClient.invalidateQueries({ queryKey: ['pedidos-por-asignar', sucursalId] })
                                ]);                                
                                setSelectedChofer(null);                                
                            } catch (error) {
                                if (error instanceof Error) {
                                    toast.error(error.message || "Error al deshacer la asignación del pedido");
                                } else {
                                    toast.error("Error al deshacer la asignación del pedido");
                                }
                            } finally {
                                setShowReasignacionModal(false); // Cierra el modal después de confirmar                            
                                setIsSaving(false);
                            }
                        };
                        deshacerAsignarPedido();
                    }}
                    confirmationLabel="DESASIGNAR"
                />

                <CommentModal
                    ventaId={ventaIdForComment}
                    comentarioInicial={comentarioActual}
                    show={showCommentModal}
                    onSaveComment={onSaveComment}
                    onClose={handleCloseCommentModal} />
                
                <InformacionDeOrden
                    ventaId={selectedVenta?._id || null}
                    show={showDetalleOrdenModal}
                    onClose={() => {
                        setShowDetalleOrdenModal(false);
                    }}
                    loading={isSaving}
                />

                <Toaster />
                
                <DragOverlay>
                    {activeId ? (
                        <div className={`pl-2 pr-4 border rounded-lg shadow-lg opacity-90 cursor-grabbing ${
                            dragOrigin === 'conductores' 
                                ? 'bg-green-600 text-white transform -rotate-2' 
                                : 'bg-teal-500 text-white transform rotate-2'
                        }`}>
                            {(() => {
                                // Buscar en pedidos primero
                                let pedido = pedidos?.find(p => p._id === activeId);
                                
                                // Si no está en pedidos, buscar en conductores
                                if (!pedido && dragOrigin === 'conductores') {
                                    for (const conductor of (conductores || [])) {
                                        const pedidoEnConductor = conductor.pedidos?.find(p => p._id === activeId);
                                        if (pedidoEnConductor) {
                                            pedido = {
                                                _id: pedidoEnConductor._id,
                                                clienteNombre: pedidoEnConductor.nombreCliente,
                                                items: pedidoEnConductor.items
                                            } as IPedidoPorAsignar;
                                            break;
                                        }
                                    }
                                }
                                
                                if (!pedido) return <div>Cargando...</div>;
                                
                                return (
                                    <div className="py-2">
                                        <p className="text-md font-bold uppercase">{pedido.clienteNombre}</p>
                                        <p className={`text-xs ${
                                            dragOrigin === 'conductores' ? 'text-green-200' : 'text-gray-200'
                                        }`}>
                                            {pedido.items?.[0] ? `${pedido.items[0].cantidad}x ${pedido.items[0].nombre}` : 'Sin items'}
                                            {pedido.items && pedido.items.length > 1 && ` +${pedido.items.length - 1} más`}
                                        </p>
                                        {dragOrigin === 'conductores' && (
                                            <p className="text-xs text-green-300 font-semibold">
                                                ← Reasignando
                                            </p>
                                        )}
                                    </div>
                                );
                            })()} 
                        </div>
                    ) : null}
                </DragOverlay>
                </main>
            </DndContext>
            <Nav />
        </SessionProvider>
    );
}