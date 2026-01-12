"use client";

import React from 'react';
import { GoCopilot } from 'react-icons/go';
import { RiZzzFill } from 'react-icons/ri';
import Loader from '../Loader';
import type { IConductoresResponse, IPedidoConductor } from '@/types/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Control, useWatch } from 'react-hook-form';
import { INuevaVentaSubmit } from '../pedidos/types';
import { useDroppable } from '@dnd-kit/core';
import PedidoConductor from './conductores/PedidoConductor';

export default function Conductores({
    control,
    setShowDetalleOrdenModal,
    onShowCommentModal,
}: {
    control: Control<INuevaVentaSubmit>;
    setShowDetalleOrdenModal: (show: boolean, pedido?: IPedidoConductor) => void;
    onShowCommentModal: (ventaId: string, comentario?: string | null, onSaveComment?: () => void) => void;
}) {
    const sucursalId = useWatch({
        name: 'sucursalId',
        control
    });

    const queryClient = useQueryClient();

    const { data: conductores, isLoading } = useQuery({
        queryKey: ['conductores', sucursalId],
        queryFn: async (): Promise<IConductoresResponse[]> => {
            const response = await fetch(`/api/pedidos/asignacion/conductores?sucursalId=${sucursalId}`);
            const data = await response.json();
            console.log("Conductores fetched:", data);
            return data.conductores;
        }
    });

    const onSaveComment = () => {
        queryClient.invalidateQueries({ queryKey: ['conductores', sucursalId] });
    }

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
                className={`text-white relative p-2 rounded-lg mb-2 transition-all duration-200 ${!chofer.checklist ? 'bg-neutral-400' : 'bg-green-500'
                    } ${isOver && chofer.checklist ? 'border-2 border-dashed border-yellow-400 bg-green-400 scale-105' : 'border'
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
                    <PedidoConductor
                        key={`pedido_chofer_${chofer._id}_${indexPedido}`}
                        pedido={pedido as any} // TODO: tipar correctamente
                        choferId={chofer._id}
                        onSaveComment={onSaveComment}
                        onShowDetalle={() => setShowDetalleOrdenModal(true)}
                        onShowCommentModal={onShowCommentModal}
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