"use client";
import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback } from 'react';
import { BsGeoAltFill } from 'react-icons/bs';
import { MdDragIndicator } from 'react-icons/md';
import { GoCopilot } from 'react-icons/go';
import { useEffect, useState } from "react";
import dayjs from 'dayjs';
import { RiZzzFill } from 'react-icons/ri';
import { ConfirmModal } from './modals/ConfirmModal';
import 'dayjs/locale/es';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { socket } from "@/lib/socket-client";
import { FaCartPlus } from 'react-icons/fa';
import {  TIPO_ESTADO_RUTA_DESPACHO } from '@/app/utils/constants';
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import Loader from './Loader';
import { getColorEstanque } from '@/lib/uix';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);

export default function AsignacionPanel({ session }) {
    const [pedidos, setPedidos] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [enTransito, setEnTransito] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showReasignacionModal, setShowReasignacionModal] = useState(false);
    const [selectedChofer, setSelectedChofer] = useState(null);
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [selectedVenta, setSelectedVenta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPanel, setLoadingPanel] = useState(true);
    const [redirecting, setRedirecting] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(0);
    const [comentario, setComentario] = useState(null);

    const nombreChofer = (choferId) => {
        const chofer = choferes.find((chofer) => chofer._id === choferId);
        return chofer ? chofer.nombre : "Desconocido";
    }

    const fetchPedidos = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion");
            if (!response.ok) {
                throw new Error("Failed to fetch pedidos");
            }
            const data = await response.json();
            console.log("Fetched pedidos:", data);
            setPedidos(data.pedidos);
            setChoferes(data.choferes);
            setEnTransito(data.flotaEnTransito);
            setLoadingPanel(false);
        } catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    }, [setPedidos, setChoferes, setEnTransito, setLoadingPanel]);

    useEffect(() => {
        fetchPedidos();

        socket.on("update-pedidos", () => {
            fetchPedidos();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, [fetchPedidos]);

    useEffect(() => {
        console.log("Pedidos:", pedidos);
    }, [pedidos]);

    // Efecto para unirse a la sala al cargar el componente
    useEffect(() => {
        // Verifica si hay sesión y el socket está conectado
        if (session?.user?.id && socket.connected) {
            console.log("Re-uniendo a room-pedidos después de posible recarga");
            socket.emit("join-room", {
                room: "room-pedidos",
                userId: session.user.id
            });
        }

        // Evento para manejar reconexiones del socket
        const handleReconnect = () => {
            if (session?.user?.id) {
                console.log("Socket reconectado, uniendo a sala nuevamente");
                socket.emit("join-room", {
                    room: "room-pedidos",
                    userId: session.user.id
                });
            }
        };

        // Escucha el evento de reconexión
        socket.on("connect", handleReconnect);

        return () => {
            socket.off("connect", handleReconnect);
        };
    }, [session]);

    function calculateTubePosition(index) {
        const baseTop = 22;
        const baseLeft = 14;
        const verticalIncrement = 3.2;
        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 2; // Ajuste horizontal con perspectiva
        return { top, left, width: '14px', height: '78px' };
    }

    function calculateUploadTubePosition(index) {
        const baseTop = 76;
        const baseLeft = 96;
        const verticalIncrement = 3.2;
        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 2;
        return { top, left, width: '14px', height: '78px' };
    }

    const onSaveComment = async () => {
        console.log("POST", {
            ventaId: selectedVenta,
            comentario,
            showCommentModal
        });
        setLoading(true);
        try {
            const response = await fetch(`/api/ventas/comentar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ventaId: selectedVenta,
                    comentario
                })
            });

            const data = await response.json();
            if (data.ok) {
                toast.success("Comentario guardado con éxito");
                if (showCommentModal === 1) {
                    setChoferes(prevChoferes => prevChoferes.map(chofer => {
                        // Buscar si el chofer tiene el pedido con el selectedVenta
                        const tienePedido = chofer.pedidos.some(pedido => pedido._id === selectedVenta);
                        if (tienePedido) {
                            return {
                                ...chofer,
                                pedidos: chofer.pedidos.map(pedido =>
                                    pedido._id === selectedVenta
                                        ? { ...pedido, comentario }
                                        : pedido
                                )
                            };
                        }
                        return chofer;
                    }));
                }
                if (showCommentModal === 2) {
                    setEnTransito(prev =>
                        prev.map(ruta => ({
                            ...ruta,
                            ventaIds: Array.isArray(ruta.ventaIds)
                                ? ruta.ventaIds.map(venta =>
                                    venta._id === selectedVenta
                                        ? { ...venta, comentario }
                                        : venta
                                )
                                : ruta.ventaIds
                        }))
                    );
                }
                showCommentModal(0);
            } else {
                toast.error(`Error al guardar el comentario: ${data.error}`);
            }
        } catch (error) {
            console.error("Error en onSaveComment:", error);
        } finally {
            setLoading(false);
            setShowCommentModal(0);
            socket.emit("update-pedidos", {
                room: "room-pedidos",
                userId: session.user.id
            });
            setComentario(null);
            setSelectedVenta(null);
        }
    }

    const onCloseComment = () => {
        setShowCommentModal(0);
        setSelectedVenta(null);
        setComentario(null);
    }

    const getCilindrosDescarga = (ruta) => {
        if (!ruta || !Array.isArray(ruta.ventaIds) || !Array.isArray(ruta.ruta) || ruta.ruta.length === 0) return [];
        const ultimaDireccionId = ruta.ruta[ruta.ruta.length - 1].direccionDestinoId?._id || ruta.ruta[ruta.ruta.length - 1].direccionDestinoId;
        const venta = ruta.ventaIds.find(v => String(v.direccionDespachoId) === String(ultimaDireccionId));
        if (!venta || !Array.isArray(venta.detalles)) return [];
        const elementos = [];
        venta.detalles.forEach(detalle => {
            const cantidad = Number(detalle.cantidad) || 0;
            // Buscar el elemento en la cargaItemIds si existe, si no, usar el subcategoriaCatalogoId directamente
            let elemento = null;
            const carga = Array.isArray(ruta.cargaItemIds)
                ? ruta.cargaItemIds.find(
                    item =>
                        String(item.subcategoriaCatalogoId?._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId?._id || detalle.subcategoriaCatalogoId)
                )
                : null;
            if (carga && carga.subcategoriaCatalogoId && carga.subcategoriaCatalogoId.categoriaCatalogoId) {
                elemento = carga.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
            } else if (detalle.subcategoriaCatalogoId && detalle.subcategoriaCatalogoId.categoriaCatalogoId) {
                elemento = detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
            } else {
                elemento = detalle.elemento || "?";
            }
            for (let i = 0; i < cantidad; i++) {
                elementos.push(elemento);
            }
        });
        return elementos;
    }

    return (
        <main className="mt-10 h-screen overflow-hidden">
            <div className={`grid grid-cols-12 h-[calc(100vh-40px)] gap-4 p-4 overflow-hidden ${loadingPanel ? "opacity-50" : ""}`}>
                <div className="col-span-7 flex flex-col md:flex-row gap-4">
                    <div className="relative w-1/2 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = "rgb(209 213 219)";
                            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "white";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = "white";
                            e.currentTarget.style.boxShadow = "none";
                            console.log("PArams", selectedChofer, selectedPedido, selectedVenta);
                            if (selectedVenta) {
                                setShowReasignacionModal(true);
                            }
                        }}
                    >
                        <div className="flex items-center mb-4">
                            <div className="absolute -top-0 -left-0 bg-gray-700 text-white text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                                PEDIDOS
                            </div>
                            <Link href="/modulos/pedidos/nuevo" className="relative ml-auto -mt-2" onClick={() => setRedirecting(true)}>
                                <button className="flex items-center bg-blue-500 text-white h-10 rounded hover:bg-blue-600 transition-colors font-semibold px-3"
                                    disabled={redirecting}>
                                    <FaCartPlus size={32} className="pl-0.5 mr-2" /> NUEVO
                                </button>
                                {redirecting && <div className="absolute -top-0 -right-0 w-full h-full pt-1 pl-4">
                                    <div className="absolute -top-0 -right-0 w-full h-full bg-white opacity-70"></div>
                                    <Loader texto="" />
                                </div>}
                            </Link>
                        </div>
                        {pedidos.length === 0 ? (
                            <div
                                className="flex items-center justify-center"
                                style={{ height: "calc(100vh - 200px)" }}>
                                <p className="text-gray-500 text-lg font-semibold">SIN PEDIDOS</p>
                            </div>
                        ) : (
                            pedidos.map((pedido, index) => (
                                <div key={`pedido_${index}`}
                                    className="p-2 border rounded-lg mb-2 bg-gray-100 cursor-pointer flex items-start relative"
                                    draggable
                                    onDragStart={() => setSelectedPedido(pedido._id)}
                                >
                                    <div>
                                        <p className="text-md font-bold uppercase w-full">{pedido.clienteNombre}</p>
                                        <p className="text-xs text-gray-500 ml-2">{dayjs(pedido.createdAt).fromNow()}</p>
                                        <ul className="list-disc ml-4 mt-2">
                                            {pedido.items.map((item) => (<li key={`pedido_${index}_item_${item._id}`}>{item.cantidad}x {item.nombre}</li>))}
                                        </ul>
                                    </div>
                                    <div className="absolute top-2 right-2 text-gray-500">
                                        <MdDragIndicator size="1.5rem" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="relative w-1/2 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto pt-14">
                        <div className="absolute -top-0 -left-0 bg-gray-700 text-white text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                            EN ESPERA
                        </div>
                        {choferes.map((chofer, index) => (
                            <div key={`en_espera_${index}`}
                                className={`relative p-2 border rounded-lg mb-2 ${!chofer.checklist ? 'bg-gray-100' : 'bg-green-100'}`}
                                data-id={`choferId_${chofer._id}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = chofer.checklist ? "rgb(220 252 231)" : "rgb(243 244 246)"; // Tailwind green-100 o gray-100
                                    e.currentTarget.style.boxShadow = chofer.checklist
                                        ? "0 4px 6px rgba(0, 0, 0, 0.1)"
                                        : "0 4px 12px 0 rgba(239, 68, 68, 0.5)"; // rojo-500
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = chofer.checklist ? "rgb(220 252 231)" : "rgb(243 244 246)"; // Tailwind green-100 o gray-100
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = chofer.checklist ? "rgb(220 252 231)" : "rgb(243 244 246)"; // Tailwind green-100 o gray-100
                                    e.currentTarget.style.boxShadow = "none";
                                    if (!chofer.checklist) {
                                        toast.warning("El chofer no tiene checklist completo, no se puede asignar.");
                                        return;
                                    };
                                    if (selectedPedido) {
                                        setSelectedChofer(chofer._id);
                                        setShowConfirmModal(true);
                                    }
                                }}
                            >
                                <div className="font-bold uppercase flex">
                                    <GoCopilot size="1.5rem" /><span className="ml-2">{chofer.nombre}</span>
                                </div>
                                {!chofer.checklist && (
                                    <div className="flex items-center text-red-600 text-xs font-semibold">
                                        <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2"></span>
                                        Sin checklist
                                    </div>
                                )}
                                {chofer.pedidos.length ? chofer.pedidos.map((pedido, indexPedido) => <div key={`pedido_chofer_${chofer._id}_${indexPedido}`} className="bg-green-300 rounded shadow-md py-1 pl-2 pr-10 mb-2 mt-2"
                                    onDragStart={() => {
                                        setSelectedChofer(chofer._id);
                                        setSelectedVenta(pedido.items[0].ventaId);
                                    }}
                                    draggable="true">
                                    <div className="flex w-full">
                                        <p className="font-md uppercase font-bold text-nowrap overflow-hidden text-ellipsis whitespace-nowrap w-11/12">{pedido.nombreCliente}</p>
                                        <div className={`${pedido.comentario ? 'text-green-500' : 'text-gray-400'} w-1/12`}>
                                            <div className="cursor-pointer w-full ml-4" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedVenta(pedido.items[0].ventaId);
                                                setComentario(pedido.comentario);
                                                setShowCommentModal(1);
                                            }}>
                                                {!pedido.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                                            </div>
                                        </div>
                                    </div>

                                    <ul className="list-disc ml-4 -mt-4">
                                        {pedido.items?.map((item, indexItem) => <li key={`item_en_espera_${indexItem}`}>{item.cantidad}x {item.nombre}</li>)}
                                    </ul>
                                </div>) : <div className="absolute w-32 -top-0 right-0">
                                    <div className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-tr-md rounded-bl-md flex items-center">
                                        <RiZzzFill size="1rem" className="mr-1" />
                                        <p>SIN PEDIDOS</p>
                                    </div>
                                </div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* EN TRÁNSITO */}
                <div className="relative col-span-5 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto overflow-x-hidden pt-12">
                    <div className="absolute -top-0 -left-0 bg-gray-700 text-white text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                        EN TRÁNSITO ({enTransito.length})
                    </div>
                    {enTransito.length === 0 ? (
                        <div
                            className="flex items-center justify-center"
                            style={{ height: "calc(100vh - 200px)" }}
                        >
                            <p className="text-gray-500 text-lg font-semibold">NADIE EN RUTA</p>
                        </div>
                    ) : (
                        enTransito.map((ruta, index) => (
                            <div className="w-full border rounded-lg bg-gray-100 shadow-md mb-4 pt-4" key={`ruta_${index}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "rgb(209 213 219)";
                                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                                }}
                                onDrop={(e) => {
                                    alert(`SOLTADO en camión ${ruta.vehiculoId.patent}`);
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                                }}>
                                <div className="flex">
                                    <div className="w-1/2">
                                        <div
                                            data-id={ruta._id}
                                            className="relative h-56"
                                        >
                                            <Image className="absolute top-0 left-0 ml-2" src="/ui/camion.png" alt={`camion_atras_${index}`} width={247} height={191} style={{ width: '247px', height: '191px' }} priority />
                                            <div className="absolute top-0 left-0 ml-10 mt-2 w-full h-fit">
                                                {ruta.estado != TIPO_ESTADO_RUTA_DESPACHO.regreso && Array.from({ length: ruta.cargaItemIds.length }, (_, i) => ruta.cargaItemIds.length - i - 1).map(index => {
                                                    const elem = ruta.cargaItemIds[index].subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                                                    return (
                                                        <Image
                                                            key={index}
                                                            src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                                            alt={`tank_${index}`}
                                                            width={14 * 2}
                                                            height={78 * 2}
                                                            className={`absolute ${ruta.cargaItemIds[index].entregado ? "opacity-20" : ""}`}
                                                            style={calculateTubePosition(index)}
                                                            priority={false}
                                                        />
                                                    )
                                                })}
                                            </div>
                                            <Image className="absolute top-0 left-0 ml-2" src="/ui/camion_front.png" alt="camion" width={247} height={191} style={{ width: '247px', height: '191px' }} />
                                            <div className="absolute ml-16 mt-6" style={{ transform: "translate(60px, 34px) skew(0deg, -20deg)" }}>
                                                <div className="ml-4 text-slate-800">
                                                    <p className="text-xl font-bold">{ruta.vehiculoId.patente}</p>
                                                    <p className="text-xs">{ruta.vehiculoId.marca}</p>
                                                    <div className={`flex items-center mb-2 ${ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? 'text-green-700' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'text-orange-500' : 'text-gray-500'}`}>
                                                        {ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta && <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>}
                                                        {(ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga
                                                            || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) && <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>}
                                                        {ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso && <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>}
                                                        <span className="text-xs font-semibold">{ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? 'EN RUTA'
                                                            : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada ? 'DESCARGA'
                                                                : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso ? 'REGRESO' : 'OTRO'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga
                                                || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) && <div className="absolute top-6 left-8 ml-2 mt-2 w-full">
                                                    {getCilindrosDescarga(ruta, index).map((elem, index) => {                                                        
                                                        return (
                                                            <Image
                                                                key={index}
                                                                src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                                                alt={`tank_${index}`}
                                                                width={14 * 3}
                                                                height={78 * 3}
                                                                className={`absolute ${ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada ? "" : "opacity-40"}`}
                                                                style={calculateUploadTubePosition(index)}
                                                                priority={false}
                                                            />
                                                        )
                                                    })}
                                                </div>}
                                        </div>                                        
                                        <div className="flex mb-2">
                                            <BsGeoAltFill size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                            <p className="text-xs text-gray-500 ml-2">{ruta.ruta[ruta.ruta.length - 1].direccionDestinoId.nombre || '??'}</p>
                                        </div>
                                    </div>

                                    <div className="w-1/2">
                                        <div className="w-full">
                                            <p className="text-xs">Conductor</p>
                                            <p className="text-lg uppercase font-bold -mt-1 mb-2">{ruta.choferId.name}</p>
                                            {Array.isArray(ruta.ventaIds) && ruta.ventaIds.map((venta, idxVenta) => (
                                                <div key={venta._id || idxVenta} className="border border-blue-400 rounded-lg mb-2 pl-2 pr-6 py-1 bg-white/80 shadow">
                                                    <div className="flex font-bold text-blue-800 text-xs mb-1">
                                                        <span className="uppercase pr-10 w-11/12">{venta.clienteId?.nombre || "Desconocido"}</span>
                                                        <div className={`${venta.comentario ? 'text-blue-500 ' : 'text-gray-500 '} w-1/12`}>
                                                            <div className="mr-2 cursor-pointer" onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedVenta(venta._id);
                                                                setComentario(venta.comentario);
                                                                setShowCommentModal(2);
                                                            }}>
                                                                {!venta.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap -mt-6">
                                                        {/* Mostrar cada carga de la venta */}
                                                        {Array.isArray(venta.detalles) && venta.detalles.map((detalle, idxDetalle) => {
                                                            // Buscar el item de carga correspondiente por subcategoriaCatalogoId
                                                            const carga = Array.isArray(ruta.cargaItemIds)
                                                                ? ruta.cargaItemIds.find(
                                                                    (item) =>
                                                                        item.subcategoriaCatalogoId &&
                                                                        detalle.subcategoriaCatalogoId &&
                                                                        String(item.subcategoriaCatalogoId._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId._id || detalle.subcategoriaCatalogoId)
                                                                )
                                                                : null;
                                                            // Si no hay carga, mostrar igual el elemento con datos mínimos
                                                            const sub = carga?.subcategoriaCatalogoId || {};
                                                            const cat = sub.categoriaCatalogoId || {};
                                                            return (
                                                                <div key={idxDetalle} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1 flex items-center bg-blue-50">
                                                                    <b>{detalle.cantidad}</b>x {cat.elemento?.toUpperCase() || "?"} {sub.cantidad}{sub.unidad}
                                                                    {sub.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                                                    {cat.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                                                    {cat.esMedicinal && <span className="bg-green-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">MED</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {loadingPanel && (
                    <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                        <p className="text-xl font-bold">CARGANDO PANEL</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                show={showConfirmModal}
                loading={loading}
                title="Confirmar Asignación"
                confirmationQuestion={`¿Estás seguro de asignar este pedido a ${nombreChofer(selectedChofer)}?`}
                onClose={() => {
                    const item = document.querySelector(`[data-id="choferId_${selectedChofer}"]`);
                    if (item) {
                        item.style.backgroundColor = "#F3F4F6";
                        item.style.transform = "scale(1)";
                        item.style.boxShadow = "none";
                    }
                    setShowConfirmModal(false);
                    setSelectedPedido(null);
                    setSelectedChofer(null);
                }} // Cierra el modal
                onConfirm={() => {
                    setLoading(true);
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
                            socket.emit("update-pedidos", { room: "room-pedidos", userId: selectedChofer });
                            toast.success("Pedido asignado con éxito");
                            setLoadingPanel(true);
                            fetchPedidos();
                        } catch (error) {
                            console.error("Error al asignar el pedido:", error);
                            toast.error(error.message || "Error al asignar el pedido");
                        } finally {
                            setShowConfirmModal(false); // Cierra el modal después de confirmar
                            setLoading(false);
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
                loading={loading}
                onClose={() => {
                    setShowReasignacionModal(false);
                    setSelectedVenta(null);
                    setSelectedChofer(null);
                }} // Cierra el modal
                onConfirm={() => {
                    setLoading(true);
                    const deshacerAsignarPedido = async () => {
                        try {
                            const response = await fetch("/api/pedidos/reasignacion", {
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
                                throw new Error(errorData.error || "Error al deshacer la asignación del pedido");
                            }
                            socket.emit("update-pedidos", { room: "room-pedidos", userId: selectedChofer });
                            toast.success("Pedido listo para asignar");
                            setLoadingPanel(true);
                            setSelectedVenta(null);
                            setSelectedChofer(null);
                            socket.emit("update-pedidos", { room: "room-pedidos", userId: selectedChofer });
                            fetchPedidos();
                        } catch (error) {
                            toast.error(error.message || "Error al deshacer la asignación del pedido");
                        } finally {
                            setShowReasignacionModal(false); // Cierra el modal después de confirmar                            
                            setLoading(false);
                        }
                    };
                    deshacerAsignarPedido();
                }}
                confirmationLabel="DESHASIGNAR"
            />

            {showCommentModal > 0 && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-1/4 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-left">
                        <h2 className="w-full flex justify-center text-xl font-bold mb-2">Comentario</h2>
                        <textarea
                            id="comentario"
                            rows={4}
                            onChange={(e) => setComentario(e.target.value)}
                            className="w-full border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Escribe tu comentario aquí..."
                            value={comentario}
                        />
                        <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button
                                onClick={onSaveComment}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {loading ? <div><Loader texto="ACTUALIZANDO" /></div> : "ACTUALIZAR"}
                            </button>
                            <button
                                onClick={onCloseComment}
                                disabled={loading}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>}

            <ToastContainer />
        </main>
    );
}