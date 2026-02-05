"use client";

import React, { useState, memo } from 'react';
import Link from 'next/link';
import { BiTask } from 'react-icons/bi';
import { FaCartPlus } from 'react-icons/fa6';
import { TIPO_ESTADO_VENTA, TIPO_ORDEN } from '@/app/utils/constants';
import Loader from '../Loader';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MdDragIndicator } from 'react-icons/md';
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IPedidoPorAsignar } from '@/types/types';
import { Control, useWatch } from 'react-hook-form';
import { INuevaVentaSubmit } from '../pedidos/types';
import { useDraggable, useDroppable } from '@dnd-kit/core';

dayjs.locale('es');
dayjs.extend(relativeTime);

export default function PorAsignar({
    control,
    setShowDetalleOrdenModal,
    onShowCommentModal,
}: {
    control: Control<INuevaVentaSubmit>;
    setShowDetalleOrdenModal: (show: boolean, pedido?: IPedidoPorAsignar) => void;
    onShowCommentModal: (venta_id: string, comentario?: string | null, onSaveComment?: () => void) => void;
}) {
    const [redirecting, setRedirecting] = useState(false);
    const queryClient = useQueryClient();

    const sucursalId = useWatch({
        control,
        name: 'sucursal_id'
    })

    const { data: pedidos, isLoading } = useQuery<IPedidoPorAsignar[]>({
        queryKey: ['pedidos-por-asignar', sucursalId],
        queryFn: async () => {
            if (!sucursalId) return [];
            const response = await fetch(`/api/pedidos/asignacion/porAsignar?sucursalId=${sucursalId}`);
            if (!response.ok) throw new Error('Failed to fetch pedidos');
            const data = await response.json();
            console.log("Pedidos por asignar fetched:", data);
            return data.pedidos;
        },
        enabled: !!sucursalId
    })
    
    // Zona de drop para reasignación
    const { setNodeRef: setReasignRef, isOver: isReasignOver } = useDroppable({
        id: 'reasignacion'
    });

    const PedidoItem = memo(function PedidoItem({ pedido, index }: { pedido: IPedidoPorAsignar, index: number }) {
        // const isExpanded = !!expandido[index];
        const items = pedido.items || [];
        const isArrastrable = pedido.estado === TIPO_ESTADO_VENTA.por_asignar && !pedido.despacho_en_local;                

        // Hook de @dnd-kit para hacer el elemento draggable
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            isDragging,
        } = useDraggable({
            id: pedido.id,
            disabled: !isArrastrable
        });

        const style = {
            // No aplicar transform para que quede anclado
            opacity: isDragging ? 0.7 : 1,
        };

        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            console.log("CLICK!");
            if (!isDragging) {
                console.log("👆 CLICK EVENT");
                setShowDetalleOrdenModal(true, pedido);
            }
        };

        const handleCommentClick = (e: React.MouseEvent) => {            
            e.stopPropagation();
            if (!isDragging) {
                console.log("💬 COMMENT CLICK EVENT");
                const invalidateQueries = () => {
                    queryClient.invalidateQueries({ queryKey: ['pedidos-por-asignar', sucursalId] });
                };
                onShowCommentModal(pedido.id, pedido.comentario, invalidateQueries);
            }
        };

        return (
            <div
                ref={setNodeRef}
                style={style}
                key={`pedido_${index}`}
                className={`pl-2 mr-1 border rounded-lg mb-2 
                    ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-400'} 
                    ${isDragging ? 'shadow-lg' : ''} 
                    flex items-start relative transition-all duration-150
                    cursor-pointer
                `}
                onClick={handleClick}
            >
                <div className="w-full">
                    <p className="text-md font-bold uppercase w-full -mb-1">{pedido.cliente_nombre}</p>
                    {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-teal-100 text-xs bg-neutral-900 rounded px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                    {pedido.despacho_en_local && <span className="text-teal-800 text-xs bg-white rounded-sm px-2 ml-2 font-bold">RETIRO EN LOCAL</span>}
                    <p className={`text-xs ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'text-gray-200' : 'text-teal-500'} ml-2`}>
                        {dayjs(pedido.fecha).format('DD/MM/YYYY HH:mm')} {dayjs(pedido.fecha).fromNow()}
                    </p>
                    
                    <div className="w-full pl-4 mt-2">
                        {items.map((item, i) => (
                            <div key={i} className="w-full flex items-center">
                                <div className={`${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-gray-100' : 'bg-gray-800'} rounded-full h-2 w-2 mr-2`}></div>
                                {item.cantidad}x {item.nombre}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* ÁREA DE COMENTARIO */}
                <div className={`${pedido.comentario ? 'text-teal-200' : 'text-teal-300'} w-1/12 flex items-start pt-1`}>
                    <div className="relative right-6">
                        <div className="cursor-pointer" onClick={handleCommentClick}>
                            {!pedido.comentario ? <VscCommentDraft size="1.5rem" /> : <VscCommentUnresolved size="1.5rem" />}
                        </div>
                        {pedido.comentario && <div className="absolute top-[14px] left-[14px] w-[8px] h-[8px] rounded-full bg-red-600"></div>}
                    </div>
                </div>
                
                {/* ICONO INDICADOR DE DRAG */}
                {isArrastrable && (
                    <div 
                        className={`absolute top-1 right-1 text-gray-200 transition-all duration-150 cursor-grab hover:cursor-grab active:cursor-grabbing ${
                            isDragging ? 'animate-pulse' : ''
                        }`}
                        {...listeners}
                        {...attributes}
                    >
                        <MdDragIndicator size="1.2rem" />
                    </div>
                )}
            </div>
        );
    });

    return (
        <div 
            ref={setReasignRef}
            className={`relative w-1/2 rounded-lg pl-2 pt-4 pr-1 bg-teal-100 shadow-md h-[calc(100vh-64px)] border-2 ${
                isReasignOver ? 'border-dashed border-blue-500 bg-teal-200' : 'border-solid border-gray-300'
            }`}
        >
            <div className="flex items-center mb-4">
                <div className="absolute -top-0 -left-0 bg-neutral-200 text-black text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                    ÓRDENES
                </div>
                <Link href="/pages/pedidos/nuevo" className="relative ml-auto -mt-2" onClick={() => setRedirecting(true)}>
                    <button className={`flex items-center bg-blue-500 text-white h-10 rounded hover:bg-blue-600 transition-colors font-semibold px-3 mr-3 ${redirecting ? 'opacity-50 pointer-events-none' : ''}`} 
                    disabled={redirecting}>
                        <FaCartPlus size={32} className="pl-0.5 mr-2" /> NUEVO
                        {redirecting && <div className="absolute -top-0 -right-0 w-full h-full pt-1 pl-4"><Loader texto="" /></div>}
                    </button>
                </Link>
            </div>
            {/* CONTENEDOR DE SCROLL SIN INTERFERIR CON DRAG */}
            <div 
                className="h-[calc(100vh-150px)] overflow-y-auto"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#94a3b8 #e2e8f0'
                }}
            >
                {isLoading ? <div className="w-full h-3/4 flex flex-col items-center">
                    <Loader texto="Cargando pedidos..." />
                </div> : (pedidos && pedidos.length === 0) ? (
                    <div className="flex flex-col items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
                        <BiTask size="6rem" className="mr-1" />
                        <p className="text-gray-500 text-lg font-semibold">SIN ÓRDENES</p>
                    </div>
                ) : (
                    pedidos && pedidos.map((pedido, index) => 
                        <PedidoItem key={`pedido_${index}`} pedido={pedido} index={index} />)
                )}
            </div>
        </div>
    );
};