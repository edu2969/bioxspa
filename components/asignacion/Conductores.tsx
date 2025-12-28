"use client";

import React from 'react';
import { GoCopilot } from 'react-icons/go';
import { RiZzzFill } from 'react-icons/ri';
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import { TIPO_ORDEN } from '@/app/utils/constants';
import Loader from '../Loader';
import type { IConductoresResponse, IPedidoConductor } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { Control, useWatch } from 'react-hook-form';
import { INuevaVentaSubmit } from '../pedidos/types';
import { useDroppable, useDraggable } from '@dnd-kit/core';




// Componente para pedidos individuales dentro de conductores
const PedidoEnConductor = ({ pedido, choferId, onShowDetalle, onShowCommentModal, indexPedido }: {
    pedido: IPedidoConductor; // TODO: crear interfaz específica
    choferId: string;
    onShowDetalle: (show: boolean) => void;
    onShowCommentModal: (show: boolean) => void;
    indexPedido: number;
}) => {
    const {
        attributes: dragAttributes,
        listeners: dragListeners,
        setNodeRef: setDragRef,
        transform,
        isDragging
    } = useDraggable({
        id: pedido._id
    });

    const dragStyle = {
        // No aplicar transform para que quede anclado
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div 
            ref={setDragRef}
            style={dragStyle}
            {...dragAttributes}
            {...dragListeners}
            key={`pedido_chofer_${choferId}_${indexPedido}`} 
            className="cursor-pointer bg-green-600 rounded shadow-md py-1 pl-2 pr-10 mb-2 mt-2"
            onClick={() => { onShowDetalle(true); }}
        >
            <div className="flex w-full">
                <div className='w-full'>
                    <p className="font-md uppercase font-bold text-nowrap overflow-hidden text-ellipsis whitespace-nowrap w-11/12">{pedido.nombreCliente}</p>
                    {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-green-800 rounded-sm bg-green-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                </div>
                <div className={`${pedido.comentario ? 'text-green-300' : 'text-green-800'} w-1/12`}>
                    <div className="relative">
                        <div className="mr-2 cursor-pointer" onClick={(e) => { 
                            e.stopPropagation(); 
                            onShowCommentModal(true); 
                        }}>
                            {!pedido.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                        </div>
                        {pedido.comentario && <div className="absolute top-[22px] left-[22px] w-[15px] h-[15px] rounded-full bg-red-600"></div>}
                    </div>
                </div>
            </div>
            <ul className="list-disc ml-4 -mt-4">
                {pedido.items?.map((item: unknown, indexItem: number) => <li key={`item_en_espera_${indexItem}`}>{(item as any).cantidad}x {(item as any).nombre}</li>)}
            </ul>
        </div>
    );
};

export default function Conductores({
    control,
    setShowDetalleOrdenModal,
    setShowCommentModal,
} : {
    control: Control<INuevaVentaSubmit>;
    setShowDetalleOrdenModal: (show: boolean) => void;
    setShowCommentModal: (show: boolean) => void;
}) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setComentario = () => {}; // Función placeholder
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

    // Componente individual de conductor con @dnd-kit
    const ConductorItem = ({ chofer, index }: { chofer: IConductoresResponse, index: number }) => {
        const { setNodeRef, isOver } = useDroppable({
            id: `conductor-${chofer._id}`,
            disabled: !chofer.checklist
        });

        return (
            <div 
                ref={setNodeRef}
                key={`en_espera_${index}`}
                className={`text-white relative p-2 rounded-lg mb-2 transition-all duration-200 ${
                    !chofer.checklist ? 'bg-neutral-400' : 'bg-green-500'
                } ${
                    isOver && chofer.checklist ? 'border-2 border-dashed border-yellow-400 bg-green-400 scale-105' : 'border'
                }`}
                data-id={`choferId_${chofer._id}`}
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
                {chofer.pedidos.length ? chofer.pedidos.map((pedido: unknown, indexPedido: number) => (
                    <PedidoEnConductor 
                        key={`pedido_chofer_${chofer._id}_${indexPedido}`}
                        pedido={pedido as any} // TODO: tipar correctamente
                        choferId={chofer._id}
                        onShowDetalle={setShowDetalleOrdenModal}
                        onShowCommentModal={setShowCommentModal}
                        indexPedido={indexPedido}
                    />
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
        );
    };

    return (<div className="relative w-1/2 border rounded-lg p-4 bg-rose-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto pt-14">
            <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                CONDUCTORES
            </div>
            {isLoading ? <Loader texto="Cargando conductores..." /> : conductores && conductores.map((chofer, index) => 
                <ConductorItem key={`conductor_${index}`} chofer={chofer} index={index} />
            )}
        </div>);
}