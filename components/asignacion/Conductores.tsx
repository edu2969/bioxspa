"use client";

import React, { useEffect } from 'react';
import { GoCopilot } from 'react-icons/go';
import { RiZzzFill } from 'react-icons/ri';
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import { TIPO_ORDEN } from '@/app/utils/constants';
import Loader from '../Loader';
import toast from 'react-hot-toast';
import type { IConductoresResponse } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { Control, useWatch } from 'react-hook-form';
import { INuevaVentaSubmit } from '../pedidos/types';

export default function Conductores({
    control,
    selectedVentaId,
    setSelectedChofer,
    setShowConfirmModal,
    setSelectedVentaId,
    setShowDetalleOrdenModal,
    setComentario,
    setShowCommentModal
} : {
    control: Control<INuevaVentaSubmit>;
    selectedVentaId: string | null;
    setSelectedChofer: (choferId: string) => void;
    setShowConfirmModal: (show: boolean) => void;
    setSelectedVentaId: (ventaId: string) => void;
    setShowDetalleOrdenModal: (show: boolean) => void;
    setComentario: (comentario: string) => void;
    setShowCommentModal: (show: boolean) => void;
}) {
    const sucursalId = useWatch({
        name: 'sucursalId',
        control
    });

    const { data: conductores, isLoading } = useQuery({
        queryKey: ['conductores', sucursalId],
        queryFn: async (): Promise<IConductoresResponse[]> => {
            const response = await fetch(`/api/pedidos/asignacion/conductores?sucursalId=${sucursalId}`);
            const data = await response.json();
            console.log("Conductores fetched:", data);
            return data.conductores;
        }
    });

    return (<div className="relative w-1/2 border rounded-lg p-4 bg-rose-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto pt-14">
            <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                CONDUCTORES
            </div>
            {isLoading ? <Loader texto="Cargando conductores..." /> : conductores && conductores.map((chofer, index) => (
                <div key={`en_espera_${index}`}
                    className={`text-white relative p-2 border rounded-lg mb-2 ${!chofer.checklist ? 'bg-neutral-400' : 'bg-green-500'}`}
                    data-id={`choferId_${chofer._id}`}
                    onDragOver={(e) => { e.preventDefault(); if (chofer.checklist) e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)"; }}
                    onDragLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                    onDrop={(e) => { 
                        e.preventDefault(); 
                        e.currentTarget.style.boxShadow = "none"; 
                        if (!chofer.checklist) { 
                            toast.error("El chofer no tiene checklist completo, no se puede asignar."); 
                            return; 
                        }                        
                        setSelectedChofer(chofer._id);
                        setShowConfirmModal(true);
                    }}
                    onTouchMove={(e) => { if (chofer.checklist) e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)"; }}
                    onTouchEnd={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                    <div className="font-bold uppercase flex">
                        <GoCopilot size="1.5rem" /><span className="ml-2">{chofer.nombre}</span>
                    </div>
                    {!chofer.checklist && (
                        <div className="flex items-center text-red-600 text-xs font-semibold mt-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2"></span>
                            Sin checklist
                        </div>
                    )}
                    {chofer.pedidos.length ? chofer.pedidos.map((pedido, indexPedido) => (
                        <div key={`pedido_chofer_${chofer._id}_${indexPedido}`} className="cursor-pointer bg-green-600 rounded shadow-md py-1 pl-2 pr-10 mb-2 mt-2"
                            onDragStart={() => { setSelectedChofer(chofer._id); setSelectedVentaId(pedido._id); }}
                            onClick={() => { setShowDetalleOrdenModal(true); }}
                            draggable="true">
                            <div className="flex w-full">
                                <div className='w-full'>
                                    <p className="font-md uppercase font-bold text-nowrap overflow-hidden text-ellipsis whitespace-nowrap w-11/12">{pedido.nombreCliente}</p>
                                    {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-green-800 rounded-sm bg-green-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                                </div>
                                <div className={`${pedido.comentario ? 'text-green-300' : 'text-green-800'} w-1/12`}>
                                    <div className="relative">
                                        <div className="mr-2 cursor-pointer" onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setSelectedVentaId(pedido._id); 
                                            setComentario(pedido.comentario); 
                                            setShowCommentModal(true); 
                                        }}>
                                            {!pedido.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                                        </div>
                                        {pedido.comentario && <div className="absolute top-[22px] left-[22px] w-[15px] h-[15px] rounded-full bg-red-600"></div>}
                                    </div>
                                </div>
                            </div>
                            <ul className="list-disc ml-4 -mt-4">
                                {pedido.items?.map((item, indexItem) => <li key={`item_en_espera_${indexItem}`}>{item.cantidad}x {item.nombre}</li>)}
                            </ul>
                        </div>
                    )) : (
                        <div>
                            <div className={`absolute w-32 top-0 right-0 ${chofer.checklist ? 'bg-green-600' : 'bg-neutral-500'} text-white text-xs font-bold px-2 py-1 rounded-tr-md rounded-bl-md flex items-center`}>
                                <RiZzzFill size="1rem" className="mr-1" />
                                <p>SIN ÓRDENES</p>
                            </div>
                            {chofer.checklist && <div className="flex items-center text-green-200 text-xs font-semibold mt-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-2"></span>
                                Listo para asignar
                            </div>}
                        </div>
                    )}
                </div>
            ))}
        </div>);
}