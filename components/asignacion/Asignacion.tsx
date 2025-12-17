"use client";

import React, { useCallback } from 'react'; // Agregado useMemo para cálculos pesados
import { ConfirmModal } from '../modals/ConfirmModal';
import Loader from '../Loader';
import { useState } from "react";
import PorAsignar from './PorAsignar';
import Conductores from './Conductores';
import EnTransito from './EnTransito';
import InformacionDeOrden from './InformacionDeOrden';
import { useForm, useWatch } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { INuevaVentaSubmit } from '../pedidos/types';

interface ISucursalSelectable {
    _id: string;
    nombre: string;
    ventasActivas: number;
}

export default function Asignacion() {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReasignacionModal, setShowReasignacionModal] = useState(false);
    const [selectedChofer, setSelectedChofer] = useState<string | null>(null);
    const [selectedPedido, setSelectedPedido] = useState<string | null>(null);
    const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [comentario, setComentario] = useState<string | null>(null);
    const [showDetalleOrdenModal, setShowDetalleOrdenModal] = useState(false);
    const { control,setValue, getValues } = useForm<INuevaVentaSubmit>();
    
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

    const onSaveComment = useCallback(async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/ventas/comentar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ventaId: selectedVentaId,
                    comentario
                })
            });

            const data = await response.json();
            if (data.ok) {
                toast.success("Comentario guardado con éxito");
                setShowCommentModal(false);
            } else {
                toast.error(`Error al guardar el comentario: ${data.error}`);
            }
        } catch (error) {
            console.error("Error en onSaveComment:", error);
        } finally {
            setIsSaving(false);
            setShowCommentModal(false);
            setComentario(null);
            setSelectedVentaId(null);
        }
    }, [selectedVentaId, comentario, setIsSaving]);

    const onCloseComment = useCallback(() => {
        setShowCommentModal(false);
        setSelectedVentaId(null);
        setComentario(null);
    }, [setShowCommentModal, setSelectedVentaId, setComentario]);

    const onCloseDetalleVenta = useCallback(() => {
        setShowDetalleOrdenModal(false);
    }, [setShowDetalleOrdenModal]);
    
    const sucursalId = useWatch({
        control,
        name: 'sucursalId'
    });

    return (  
        <main className="w-full mt-2 h-screen overflow-hidden">
            {!isLoading && sucursales && sucursales.length > 0 && (
                <div className="flex justify-center mb-2">
                    <div className="flex">
                        {sucursales.map((sucursal, idx) => {
                            const isActive = getValues("sucursalId") === sucursal._id;
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
                        onShowDetalle={(pedido) => {
                            console.log("IGNORADO pedido", pedido);
                            setShowDetalleOrdenModal(true);
                        }}
                        selectedVentaId={selectedVentaId}
                        setShowReasignacionModal={setShowReasignacionModal}
                    />
                    <Conductores 
                        control={control}
                        selectedPedido={selectedPedido} 
                        setSelectedChofer={setSelectedChofer} 
                        setShowConfirmModal={setShowConfirmModal} 
                        setSelectedVenta={(ventaId: string) => {
                            console.log("setSelectedVenta", ventaId);
                        }}
                        setShowDetalleOrdenModal={setShowDetalleOrdenModal} 
                        setComentario={() => {}}
                        setShowCommentModal={setShowCommentModal}
                    />
                </div>

                {sucursalId && <EnTransito sucursalId={sucursalId} 
                    setShowCommentModal={setShowCommentModal} />}
            </div>}

            <ConfirmModal
                show={showConfirmModal}
                loading={isSaving}
                title="Confirmar Asignación"
                confirmationQuestion={`¿Estás seguro de asignar este pedido?`}
                onClose={() => {
                    setShowConfirmModal(false);
                    setSelectedPedido(null);
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
                                    ventaId: selectedPedido,
                                    choferId: selectedChofer,
                                }),
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || "Error al asignar el pedido");
                            }
                            toast.success("Pedido asignado con éxito");
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
                            setSelectedPedido(null);
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
                                    choferId: selectedChofer,
                                }),
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || "Error al deshacer la asignación del pedido");
                            }
                            toast.success("Pedido listo para asignar");
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

            {showCommentModal && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="mt-3 text-left">
                    <h2 className="w-full flex justify-center text-xl font-bold mb-2">Comentario</h2>
                    <textarea
                        id="comentario"
                        rows={4}
                        onChange={(e) => setComentario(e.currentTarget.value)}
                        className="w-full border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Escribe tu comentario aquí..."
                        value={comentario || ""}
                    />
                    <div className={`mt-4 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            onClick={onSaveComment}
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {isSaving ? <div><Loader texto="ACTUALIZANDO" /></div> : "ACTUALIZAR"}
                        </button>
                        <button
                            onClick={onCloseComment}
                            disabled={isSaving}
                            className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>}

            {showDetalleOrdenModal && <InformacionDeOrden
                rutaDespachoId={null}                
                onClose={onCloseDetalleVenta}
                loading={isSaving}
            />}

            <Toaster />
        </main>
    );
}