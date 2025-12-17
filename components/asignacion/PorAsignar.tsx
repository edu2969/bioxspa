"use client";

import React, { useCallback, useState, memo } from 'react';
import Link from 'next/link';
import { BiTask } from 'react-icons/bi';
import { FaCartPlus, FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import { TIPO_ESTADO_VENTA, TIPO_ORDEN } from '@/app/utils/constants';
import Loader from '../Loader';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MdDragIndicator } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { IPedidoPorAsignar } from '@/types/types';
import { Control, useWatch } from 'react-hook-form';
import { INuevaVentaSubmit } from '../pedidos/types';

dayjs.locale('es');
dayjs.extend(relativeTime);

export default function PorAsignar({
    control,
    onShowDetalle,
    selectedVentaId,
    setShowReasignacionModal,
}: {
    control: Control<INuevaVentaSubmit>;
    onShowDetalle: (pedido: IPedidoPorAsignar) => void;
    selectedVentaId: string | null;
    setShowReasignacionModal: (show: boolean) => void;
}) {
    
    const [redirecting, setRedirecting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [expandido, setExpandido] = useState<{ [key:number]: boolean }>({});

    const sucursalId = useWatch({
        control,
        name: 'sucursalId'
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
    
    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);
            if (!selectedVentaId) return;
            setShowReasignacionModal(true);
        },
        [selectedVentaId, setShowReasignacionModal]
    );

    const onSelectPedido = (pedidoId: string) => {
        console.log("Pedido seleccionado para reasignar:", pedidoId);
        // Aquí puedes manejar la lógica de selección del pedido para reasignación
    }

    const PedidoItem = memo(function PedidoItem({ pedido, index }: { pedido: IPedidoPorAsignar, index: number }) {
        const isExpanded = !!expandido[index];
        const items = pedido.items || [];
        const mostrarItems = isExpanded ? items : items.slice(0, 1);
        const itemsCount = items.length;

        return (
            <div
                key={`pedido_${index}`}
                className={`pl-2 mr-1 border rounded-lg mb-2 ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-400'} cursor-pointer flex items-start relative`}
                draggable={pedido.estado === TIPO_ESTADO_VENTA.por_asignar && !pedido.despachoEnLocal}
                onDragStart={() => onSelectPedido(pedido._id)}
                onClick={() => onShowDetalle(pedido)}
                onTouchStart={(e) => { console.log("TOUCH START", e.currentTarget); }}
                onTouchMove={(e) => { console.log("TOUCH MOVE", e.currentTarget); }}
                onTouchEnd={(e) => { console.log("TOUCH END", e.currentTarget); }}
            >
                <div className="w-full">
                    <p className="text-md font-bold uppercase w-full -mb-1">{pedido.clienteNombre}</p>
                    {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-teal-100 text-xs bg-neutral-900 rounded px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                    {pedido.despachoEnLocal && <span className="text-teal-800 text-xs bg-white rounded-sm px-2 ml-2 font-bold">RETIRO EN LOCAL</span>}
                    <p className={`text-xs ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'text-gray-200' : 'text-teal-500'} ml-2`}>{dayjs(pedido.fecha).format('DD/MM/YYYY HH:mm')} {dayjs(pedido.fecha).fromNow()}</p>
                    <ul className="w-full list-disc pl-4 mt-2">
                        <div className="w-full relative right-2" style={{
                            maxHeight: isExpanded ? `${itemsCount * 2.2}em` : "2.2em",
                            transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
                            overflow: "hidden"
                        }}>
                            {mostrarItems.map((item, i) => (
                                <li key={i} className="w-full flex items-center">
                                    <div className={`${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-gray-100' : 'bg-gray-800'} rounded-full h-2 w-2 mr-2`}></div>{item.cantidad}x {item.nombre}
                                </li>
                            ))}
                            {itemsCount > 1 && (
                                <button className="absolute top-0 right-0 text-blue-500 ml-1 text-xs z-10 bg-white px-1" type="button" style={{ borderRadius: 4 }}
                                    onClick={(e) => { e.stopPropagation(); setExpandido(prev => ({ ...prev, [index]: !prev[index] })); }}>
                                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                </button>
                            )}
                        </div>
                    </ul>
                </div>
                {(pedido.estado === TIPO_ESTADO_VENTA.por_asignar && !pedido.despachoEnLocal) && (
                    <div className="absolute top-2 right-2 text-gray-500">
                        <MdDragIndicator size="1.5rem" />
                    </div>
                )}
            </div>
        );
    });

    return (
        <div className={`relative w-1/2 border rounded-lg pl-2 pt-4 pr-1 bg-teal-100 shadow-md h-[calc(100vh-64px)] ${isDragOver ? 'border-2 border-dashed border-blue-500 bg-teal-200' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            <div className="flex items-center mb-4">
                <div className="absolute -top-0 -left-0 bg-neutral-200 text-black text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                    ÓRDENES
                </div>
                <Link href="/modulos/pedidos/nuevo" className="relative ml-auto -mt-2" onClick={() => setRedirecting(true)}>
                    <button className="flex items-center bg-blue-500 text-white h-10 rounded hover:bg-blue-600 transition-colors font-semibold px-3 mr-3"
                        disabled={redirecting}>
                        <FaCartPlus size={32} className="pl-0.5 mr-2" /> NUEVO
                        {redirecting && <div className="absolute -top-0 -right-0 w-full h-full pt-1 pl-4"><Loader texto="" /></div>}
                    </button>
                </Link>
            </div>
            <div className="h-[calc(100vh-150px)] overflow-y-scroll">
                {isLoading ? <Loader texto="Cargando pedidos..." /> : (pedidos && pedidos.length === 0) ? (
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
