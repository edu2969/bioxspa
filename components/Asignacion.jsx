"use client";

import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useRef } from 'react';
import { BsGeoAltFill } from 'react-icons/bs';
import { MdDragIndicator } from 'react-icons/md';
import { GoCopilot } from 'react-icons/go';
import { useEffect, useState } from "react";
import { RiZzzFill } from 'react-icons/ri';
import { ConfirmModal } from './modals/ConfirmModal';
import 'dayjs/locale/es';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { socket } from "@/lib/socket-client";
import { FaCartPlus, FaChevronDown, FaChevronUp, FaRegCheckCircle, FaClock } from 'react-icons/fa';
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_ORDEN } from '@/app/utils/constants';
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import Loader from './Loader';
import { getColorEstanque } from '@/lib/uix';
import { FaTruckFast } from 'react-icons/fa6';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { BiTask } from 'react-icons/bi';
import { useForm } from 'react-hook-form';
dayjs.locale('es');
dayjs.extend(relativeTime);

export default function Asignacion({ session }) {
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
    const [detalleExpandido, setDetalleExpandido] = useState(null);
    const pedidosScrollRef = useRef(null);
    const [cargandoMas, setCargandoMas] = useState(false);
    const [showDetalleOrdenModal, setShowDetalleOrdenModal] = useState(false);
    const [sucursales, setSucursales] = useState([]);
    const { setValue, getValues } = useForm();

    const nombreChofer = (choferId) => {
        const chofer = choferes.find((chofer) => chofer._id === choferId);
        return chofer ? chofer.nombre : "Desconocido";
    }

    const fetchPedidos = useCallback(async (sucursalId) => {
        try {
            if (sucursalId) {
                const response = await fetch(`/api/pedidos/asignacion?sucursalId=${sucursalId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch pedidos");
                }
                const data = await response.json();
                console.log("Fetched pedidos:", data);
                setPedidos(data.pedidos);
                setChoferes(data.choferes);
                setEnTransito(data.flotaEnTransito);
            }
            setLoadingPanel(false);
        } catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    }, [setPedidos, setChoferes, setEnTransito, setLoadingPanel]);

    const fetchSucursales = useCallback(async () => {
        try {
            const response = await fetch(`/api/pedidos/asignacion/sucursales`);
            if (!response.ok) {
                throw new Error("Failed to fetch sucursales");
            }
            const data = await response.json();
            console.log("Fetched sucursales:", data);
            setSucursales(data.sucursales);
            if (data.sucursales.length === 1) {
                setValue("sucursalId", data.sucursales[0]._id);
                fetchPedidos(data.sucursales[0]._id);
            }
        } catch (error) {
            console.error("Error fetching sucursales:", error);
        }
    }, [setSucursales, fetchPedidos, setValue]);

    useEffect(() => {
        fetchSucursales();
        const sucursalId = localStorage.getItem("sucursalId") || null;
        if (sucursalId) {
            setValue("sucursalId", sucursalId);
        }
        fetchPedidos(sucursalId);

        socket.on("update-pedidos", () => {
            fetchSucursales();
            fetchPedidos(sucursalId);
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, [fetchPedidos, fetchSucursales, setValue]);

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

    const offsetByModel = (vehiculo) => {
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        console.log("OFFSET", marca, modelo);
        if (!marca || !modelo) {
            return {
                baseTop: 28,
                baseLeft: 76,
                scaleFactor: 1.5,
                verticalIncrement: 4
            };
        }
        const offsets = {
            "hyundai_porter": [-8, 32, 1.5],
            "ford_ranger": [-28, 106, 1.5],
            "mitsubishi_l200": [28, 76, 1.5],
            "volkswagen_constellation": [28, 76, 1.5],
            "volkswagen_delivery": [28, 76, 1.5],
            "kia_frontier": [28, 76, 1.5],
            "ford_transit": [28, 76, 1.5],
            "desconocido_desconocido": [28, 76, 1.5],
        }
        const data = offsets[marca + "_" + modelo] || offsets["desconocido_desconocido"];
        console.log("DATA", data);
        return {
            baseTop: data[0],
            baseLeft: data[1],
            scaleFactor: data[2]
        };
    }

    const sizeByModel = (vehiculo) => {
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        if (!marca || !modelo) {
            return { width: 247, height: 191 };
        }
        const sizes = {
            "hyundai_porter": [247, 173],
            "ford_ranger": [300, 200],
            "mitsubishi_l200": [247, 191],
            "volkswagen_constellation": [300, 200],
            "volkswagen_delivery": [300, 200],
            "kia_frontier": [247, 191],
            "ford_transit": [300, 200],
            "desconocido_desconocido": [247, 191],
        }
        const size = sizes[marca + "_" + modelo] || sizes["desconocido_desconocido"];
        return { width: size[0], height: size[1] };
    }

    function calculateTubePosition(vehiculo, index) {
        const offsets = offsetByModel(vehiculo);
        const baseTop = offsets.baseTop; //22
        const baseLeft = offsets.baseLeft; //76
        const verticalIncrement = 5;
        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 2; // Ajuste horizontal con perspectiva
        return { top, left, width: '14px', height: '78px' };
    }

    function calculateUploadTubePosition(index) {
        const baseTop = 86;
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

    const onCloseDetalleVenta = () => {
        setShowDetalleOrdenModal(false);
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

    const getVentaActual = (rd) => {
        if (!rd || !Array.isArray(rd.ruta) || rd.ruta.length === 0 || !Array.isArray(rd.ventaIds)) return null;
        const index = rd.ruta.findIndex(r => r.fechaArribo === null);
        const lastDireccionId = rd.ruta[index != -1 ? index : rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
        const venta = rd.ventaIds.find(v => v.direccionDespachoId === lastDireccionId);
        return venta;
    }

    const cargaActual = (rutaDespacho) => {
        if (!rutaDespacho || !Array.isArray(rutaDespacho.cargaItemIds)) return [];

        let venta = getVentaActual(rutaDespacho);
        console.log("VENTA", venta);

        // Obtén los IDs de los items descargados según historialCarga
        const descargados = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1]?.itemMovidoIds || [];
        const estadoRuta = rutaDespacho.estado;
        return rutaDespacho.cargaItemIds.map(item => {            
            let estado = {}

            // Si el item está en el historial de descarga, está entregado
            if (descargados.some(id => id === item._id)) {
                if(venta && venta.tipo === TIPO_ORDEN.traslado) {
                    estado.cargado = estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada;
                } else {
                    estado.entregado = estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
                }
            } else if (
                (rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga) &&
                venta &&
                venta.detalles.some(
                    det => String(det.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId._id)
                )
            ) {
                // Solo los items que pertenecen a la venta de la última dirección están "descargando"
                estado.descargando = true;
            } else {
                estado.cargado = true;
            }

            return {
                elemento: item.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
                ...estado
            };
        });       
    }

    const handlePedidosScroll = (e) => {
        if (cargandoMas) return; // Evita múltiples cargas simultáneas
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Detecta si el scroll llegó al fondo (con un margen de 10px)
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            cargarMasPedidos();
        }
    };

    const cargarMasPedidos = async () => {
        setCargandoMas(true);
        const ultimaFecha = pedidos.length ? pedidos[pedidos.length - 1].fecha : new Date();
        await fetch(`/api/ventas/cargarMas?fecha=${new Date(ultimaFecha).toISOString()}`).then(async (response) => {
            if (response.ok) {
                const data = await response.json();
                console.log("DATA", data);
                // Actualiza la lista de pedidos con los nuevos datos
                if (Array.isArray(data.pedidos)) {
                    setPedidos((prev) => [...prev, ...data.pedidos]);
                }
            }
            setCargandoMas(false);
        });
    }

    const imagenVehiculo = (vehiculo) => {
        const defecto = { url: "desconocido_desconocido", width: 247, height: 191 };
        if (!vehiculo) return defecto;
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        const imagen = `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase();
        return {
            url: imagen,
            ...sizeByModel(vehiculo)
        } || defecto;
    }

    const getOpacityEstanque = (index) => {
        return index == 99;
    }

    const getVentaActiva = (ruta) => {
        if (!ruta || !Array.isArray(ruta.ventaIds) || !Array.isArray(ruta.ruta) || ruta.ruta.length === 0) return null;
        const ultimaDireccionId = ruta.ruta[ruta.ruta.length - 1].direccionDestinoId?._id || ruta.ruta[ruta.ruta.length - 1].direccionDestinoId;
        return ruta.ventaIds.find(v => String(v.direccionDespachoId) === String(ultimaDireccionId)) || null;
    }

    const getTextoEstado = (ruta) => {
        if (!ruta) return "OTRO";
        return ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? 'EN RUTA'
            : getVentaActiva(ruta)?.tipo === TIPO_ORDEN.traslado ? 'RETIRANDO'
                : (ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) ? 'DESCARGA'
                    : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.carga ? 'CARGA'
                        : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada ? 'CARGA CONFIRMADA'
                            : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso ? 'REGRESANDO' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.terminado ? 'TERMINADO' : 'OTRO';
    }

    return (
        <main className="w-full mt-2 h-screen overflow-hidden">
            {sucursales.length > 0 && (
                <div className="flex justify-center mb-2">
                    <div className="flex">
                        {sucursales.map((sucursal, idx) => {
                            const isActive = getValues("sucursalId") === sucursal._id;
                            const isFirst = idx === 0;
                            const isLast = idx === sucursales.length - 1;
                            return (
                                <button
                                    key={sucursal._id}
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
                                        localStorage.setItem("sucursalId", sucursal._id);
                                        setLoadingPanel(true);
                                        fetchPedidos(sucursal._id);
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
            {sucursales.length === 0 && (
                <div className="flex justify-center items-center h-12">
                    {loadingPanel
                        ? <Loader texto="Cargando sucursales..." />
                        : <p className="text-white py-2 bg-red-500 rounded px-4">No tienes sucursales asignadas.</p>}
                </div>
            )}
            <div className={`grid grid-cols-12 h-[calc(100vh-40px)] gap-4 px-4 overflow-hidden ${loadingPanel ? "opacity-50" : ""}`}>
                {/* ORDENES / EN ESPERA */}
                <div className="col-span-7 flex flex-col md:flex-row gap-4">
                    {/* ORDENES*/}
                    <div className="relative w-1/2 border rounded-lg pl-2 pt-4 pr-1 bg-teal-100 shadow-md h-[calc(100vh-64px)]"
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
                            <div className="absolute -top-0 -left-0 bg-neutral-200 text-black text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                                ÓRDENES
                            </div>
                            <Link href="/modulos/pedidos/nuevo" className="relative ml-auto -mt-2" onClick={() => setRedirecting(true)}>
                                <button className="flex items-center bg-blue-500 text-white h-10 rounded hover:bg-blue-600 transition-colors font-semibold px-3 mr-3"
                                    disabled={redirecting}>
                                    <FaCartPlus size={32} className="pl-0.5 mr-2" /> NUEVO
                                </button>
                                {redirecting && <div className="absolute -top-0 -right-0 w-full h-full pt-1 pl-4">
                                    <div className="absolute -top-0 -right-0 w-full h-full bg-white opacity-70"></div>
                                    <Loader texto="" />
                                </div>}
                            </Link>
                        </div>
                        <div className="h-[calc(100vh-150px)] overflow-y-scroll"
                            ref={pedidosScrollRef}
                            onScroll={handlePedidosScroll}
                        >

                            {pedidos.length === 0 ? (
                                <div
                                    className="flex flex-col items-center justify-center"
                                    style={{ height: "calc(100vh - 200px)" }}>
                                    <BiTask size="6rem" className="mr-1" />
                                    <p className="text-gray-500 text-lg font-semibold">SIN ÓRDENES</p>
                                </div>
                            ) : (
                                pedidos.map((pedido, index) => (
                                    <div key={`pedido_${index}`}
                                        className={`pl-2 mr-1 border rounded-lg mb-2 ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-400'} cursor-pointer flex items-start relative`}
                                        draggable={pedido.estado === TIPO_ESTADO_VENTA.por_asignar && !pedido.despachoEnLocal}
                                        onDragStart={() => setSelectedPedido(pedido._id)}
                                        onClick={() => { setShowDetalleOrdenModal(true) }}
                                    >
                                        <div className="w-full">
                                            <p className="text-md font-bold uppercase w-full -mb-1">{pedido.clienteNombre}</p>
                                            {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-teal-100 text-xs bg-neutral-900 rounded px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                                            {pedido.despachoEnLocal && <span className="text-teal-800 text-xs bg-white rounded-sm px-2 ml-2 font-bold">RETIRO EN LOCAL</span>}
                                            <p className={`text-xs ${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'text-gray-200' : 'text-teal-500'} ml-2`}>{dayjs(pedido.fecha).format('DD/MM/YYYY HH:mm')} {dayjs(pedido.fecha).fromNow()}</p>
                                            <ul className="w-full list-disc pl-4 mt-2">
                                                {(() => {
                                                    const items = pedido.items || [];
                                                    const expandido = detalleExpandido === `${index}`;
                                                    const mostrarItems = expandido ? items : items.slice(0, 1);
                                                    const itemsCount = items.length;

                                                    return (
                                                        <div
                                                            className="w-full relative right-2"
                                                            style={{
                                                                maxHeight: expandido ? `${itemsCount * 2.2}em` : "2.2em",
                                                                transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
                                                                overflow: "hidden"
                                                            }}
                                                        >
                                                            {mostrarItems.map((item, i) => {
                                                                const detalleTexto = `${item.cantidad}x ${item.nombre}`;
                                                                return (
                                                                    <li key={i} className="w-full flex items-center">
                                                                        <div className={`${pedido.estado === TIPO_ESTADO_VENTA.por_asignar ? 'bg-gray-100' : 'bg-gray-800'} rounded-full h-2 w-2 mr-2`}></div>{detalleTexto}
                                                                    </li>
                                                                );
                                                            })}
                                                            {itemsCount > 1 && (
                                                                <button
                                                                    className="absolute top-0 right-0 text-blue-500 ml-1 text-xs z-10 bg-white px-1"
                                                                    type="button"
                                                                    style={{ borderRadius: 4 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDetalleExpandido(expandido ? null : `${index}`);
                                                                    }}
                                                                >
                                                                    {expandido ? <FaChevronUp /> : <FaChevronDown />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </ul>
                                        </div>
                                        {(pedido.estado === TIPO_ESTADO_VENTA.por_asignar && !pedido.despachoEnLocal) && (
                                            <div className="absolute top-2 right-2 text-gray-500">
                                                <MdDragIndicator size="1.5rem" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {pedidos.length > 24 && <div className="flex justify-center items-center mt-2 h-12">
                                <Loader texto="Cargando más..." />
                            </div>}
                        </div>
                    </div>
                    {/* CONDUCTORES */}
                    <div className="relative w-1/2 border rounded-lg p-4 bg-rose-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto pt-14">
                        <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                            CONDUCTORES
                        </div>
                        {choferes.map((chofer, index) => (
                            <div key={`en_espera_${index}`}
                                className={`text-white relative p-2 border rounded-lg mb-2 ${!chofer.checklist ? 'bg-neutral-400' : 'bg-green-500'}`}
                                data-id={`choferId_${chofer._id}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (chofer.checklist) {
                                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
                                    }
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();                                    
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
                                    <div className="flex items-center text-red-600 text-xs font-semibold mt-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2"></span>
                                        Sin checklist
                                    </div>
                                )}
                                {chofer.pedidos.length ? chofer.pedidos.map((pedido, indexPedido) => <div key={`pedido_chofer_${chofer._id}_${indexPedido}`} className="bg-green-600 rounded shadow-md py-1 pl-2 pr-10 mb-2 mt-2"
                                    onDragStart={() => {
                                        setSelectedChofer(chofer._id);
                                        setSelectedVenta(pedido.tipo === TIPO_ORDEN.traslado ? pedido._id : pedido.items[0].ventaId);
                                    }}
                                    draggable="true">
                                    <div className="flex w-full">
                                        <div className='w-full'>
                                            <p className="font-md uppercase font-bold text-nowrap overflow-hidden text-ellipsis whitespace-nowrap w-11/12">{pedido.nombreCliente}</p>
                                            {pedido.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-green-800 rounded-sm bg-green-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                                        </div>
                                        <div className={`${pedido.comentario ? 'text-green-300' : 'text-green-800'} w-1/12`}>
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
                                </div>) : <div>
                                    <div className={`absolute w-32 top-0 right-0 ${chofer.checklist ? 'bg-green-600' : 'bg-neutral-500'} text-white text-xs font-bold px-2 py-1 rounded-tr-md rounded-bl-md flex items-center`}>
                                        <RiZzzFill size="1rem" className="mr-1" />
                                        <p>SIN ÓRDENES</p>
                                    </div>
                                    {chofer.checklist && <div className="flex items-center text-green-200 text-xs font-semibold mt-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-2"></span>
                                        Listo para asignar
                                    </div>}
                                </div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* EN TRÁNSITO */}
                <div className="relative col-span-5 border rounded-lg p-4 bg-blue-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden pt-12">
                    <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
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
                                    alert(`SOLTADO en camión ${ruta.vehiculoId.patente}`);
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                                }}>
                                <div className="flex">
                                    <div className="w-1/2">
                                        <div
                                            data-id={ruta._id}
                                            className="relative h-56"
                                        >
                                            <Image className="absolute top-0 left-0 ml-2" src={`/ui/${imagenVehiculo(ruta.vehiculoId).url}.png`} alt={`camion_atras_${index}`} width={imagenVehiculo(ruta.vehiculoId).width} height={imagenVehiculo(ruta.vehiculoId).height} priority />
                                            <div className="absolute top-0 left-0 ml-10 mt-2 w-full h-fit">
                                                {cargaActual(ruta).reverse().map((item, index) => {
                                                    const elem = item.elemento;
                                                    return (
                                                        <Image
                                                            key={index}
                                                            src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                                            alt={`tank_${index}`}
                                                            width={14 * 2}
                                                            height={78 * 2}
                                                            className={`absolute ${item.descargando ? "opacity-40" : item.entregado ? "opacity-0" : "opacity-100"}`}
                                                            style={calculateTubePosition(ruta.vehiculoId, cargaActual(ruta).length - index - 1)}
                                                            priority
                                                        />
                                                    )
                                                })}
                                            </div>
                                            <Image className="absolute top-0 left-0 ml-2" src={`/ui/${imagenVehiculo(ruta.vehiculoId).url}_front.png`} alt="camion" width={imagenVehiculo(ruta.vehiculoId).width} height={imagenVehiculo(ruta.vehiculoId).height} priority/>
                                            <div className="absolute top-46 right-6">
                                                <div className="flex flex-col items-end ml-4 text-slate-800">
                                                    <div className="bg-white rounded p-0.5 mt-32 w-26">
                                                        <div className="flex text-slate-800 border-black border-2 px-1 py-0 rounded">
                                                            <p className="text-lg font-bold">{ruta?.vehiculoId?.patente.substring(0, 2)}</p>
                                                            <Image className="inline-block mx-0.5 py-2" src="/ui/escudo.png" alt="escudo chile" 
                                                                width={12} height={9} priority
                                                                style={ { "width": "auto", "height": "auto" } }/>
                                                            <p className="text-lg font-bold">{ruta?.vehiculoId?.patente.substring(2)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs">{ruta.vehiculoId.marca}&nbsp;<small>{ruta.vehiculoId.modelo}</small></p>
                                                    <div className={`flex items-center mb-2 ${ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? 'text-green-700' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'text-orange-500' : 'text-gray-500'}`}>
                                                        {ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta && <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>}
                                                        {(ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga
                                                            || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) && <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2"></span>}
                                                        {ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso && <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>}
                                                        <span className="text-xs font-semibold">{getTextoEstado(ruta)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga
                                                || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) && <div className="absolute top-6 left-8 ml-2 mt-2 w-full">
                                                    {getCilindrosDescarga(ruta).reverse().map((elem, index) => {
                                                        return (
                                                            <Image
                                                                key={index}
                                                                src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                                                alt={`tank_${index}`}
                                                                width={14 * 3}
                                                                height={78 * 3}
                                                                className={`absolute ${getOpacityEstanque(getCilindrosDescarga(ruta).length - index - 1) ? "" : "opacity-40"}`}
                                                                style={calculateUploadTubePosition(getCilindrosDescarga(ruta).length - index - 1)}
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
                                                <div key={venta._id || idxVenta} className={`border rounded-lg mb-2 pl-2 pr-6 py-1 shadow ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'border-green-500 bg-green-50' : 'border-blue-400 bg-white/80'} min-h-12`}>
                                                    <div className={`flex font-bold text-xs mb-1 ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'text-green-600' : 'text-blue-700'}`}>
                                                        {venta.estado === TIPO_ESTADO_VENTA.entregado && <FaRegCheckCircle size="1rem" />}
                                                        {venta.estado === TIPO_ESTADO_VENTA.reparto && <FaTruckFast size="1rem" />}
                                                        <div className="w-full">
                                                            <p className="uppercase pr-10 w-11/12 pl-1">{venta.clienteId?.nombre || "Desconocido"}</p>
                                                            {venta.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-blue-800 rounded-sm bg-blue-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                                                        </div>
                                                        <div className={`${venta.comentario ? 'text-blue-500 ' : 'text-gray-500 '} w-1/12`}>
                                                            <div className="relative">
                                                                <div className="mr-2 cursor-pointer" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedVenta(venta._id);
                                                                    setComentario(venta.comentario);
                                                                    setShowCommentModal(2);
                                                                }}>
                                                                    {!venta.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                                                                </div>
                                                                {venta.comentario && <div className="absolute top-[22px] left-[22px] w-[15px] h-[15px] rounded-full bg-red-600"></div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap -mt-6">
                                                        {/* Mostrar cada carga de la venta */}
                                                        {Array.isArray(venta.detalles) && venta.detalles.filter(detalle => {
                                                            return ruta.cargaItemIds.some(
                                                                (item) =>
                                                                    item.subcategoriaCatalogoId &&
                                                                    detalle.subcategoriaCatalogoId &&
                                                                    String(item.subcategoriaCatalogoId._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId._id || detalle.subcategoriaCatalogoId)
                                                            );
                                                        }).map((detalle, idxDetalle) => {
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
                        <p className="text-xl font-bold">Cargando asignaciones</p>
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
                        item.style.backgroundColor = "rgb(34 197 94)";
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
                            let sucursalId = localStorage.getItem("sucursalId") || null;
                            if (!sucursalId) {
                                sucursalId = getValue("sucursalId");
                            }
                            fetchPedidos(sucursalId);
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
                            let sucursalId = localStorage.getItem("sucursalId") || null;
                            if (!sucursalId) {
                                sucursalId = getValue("sucursalId");
                            }
                            fetchPedidos(sucursalId);
                        } catch (error) {
                            toast.error(error.message || "Error al deshacer la asignación del pedido");
                        } finally {
                            setShowReasignacionModal(false); // Cierra el modal después de confirmar                            
                            setLoading(false);
                        }
                    };
                    deshacerAsignarPedido();
                }}
                confirmationLabel="DESASIGNAR"
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

            {showDetalleOrdenModal && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-1/4 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-left">
                        <div className="flex justify-between items-center mb-4">
                            <button className="flex-1 text-center py-2 font-semibold rounded-tl-md border-b-2 border-blue-600 bg-blue-50 text-blue-700 focus:outline-none">
                                Operaciones
                            </button>
                            <button className="flex-1 text-center py-2 font-semibold border-b-2 border-gray-200 bg-gray-50 text-gray-500 focus:outline-none">
                                Historial
                            </button>
                            <button className="flex-1 text-center py-2 font-semibold rounded-tr-md border-b-2 border-gray-200 bg-gray-50 text-gray-500 focus:outline-none">
                                Mensajería
                            </button>
                        </div>                       
                        <div className="flex flex-row items-start justify-center gap-3 mb-6 h-64 overflow-y-auto">
                            {/* Trazado vertical con checks y tiempos a la izquierda */}
                            <div className="flex flex-row items-start">
                                {/* Tiempos a la izquierda */}
                                <div className="flex flex-col items-end mr-2">
                                    {/* Ejemplo de tiempos, reemplaza por tus datos dinámicos */}
                                    {[
                                        { tiempo: "15min" },
                                        { tiempo: "30min" },
                                        { tiempo: "10min" },
                                        { tiempo: "5min" },
                                        { tiempo: "20min" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col items-end justify-center h-16">
                                            <div className="flex items-center mt-8">
                                                <FaClock className="mr-1 text-gray-400" />
                                                <span className={`text-xs`}>{item.tiempo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Trazado vertical con checks */}
                                <div className="flex flex-col items-center mt-1 ml-2">
                                    {/* Estados, reemplaza por tus datos dinámicos */}
                                    {[0, 1, 2, 3, 4, 5].map((item, idx, arr) => (
                                        <React.Fragment key={idx}>
                                            {/* Punto con check */}
                                            <div className={`w-6 h-6 rounded-full bg-blue-700 border-4 border-blue-400 flex items-center justify-center`}>
                                                <svg className={`w-4 h-4 text-blue-400`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                                    <path stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            {/* Línea vertical excepto el último */}
                                            {idx < arr.length - 1 && (
                                                <div className={`w-2 h-[40px] bg-blue-400 mx-auto`} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            {/* Detalle de cada punto */}
                            <div className="flex flex-col items-start justify-start h-full ml-2 mt-1">
                                {/* Por asignar */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Por asignar</div>
                                        <div className="text-xs text-gray-500">12/06/2024 09:00</div>
                                    </div>
                                </div>
                                {/* Cargado */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Cargado</div>
                                        <div className="text-xs text-gray-500">por Juan Perez</div>
                                        <div className="text-xs text-gray-500">12/06/2024 09:15</div>
                                    </div>
                                </div>
                                {/* Arribo */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Arribo</div>
                                        <div className="text-xs text-gray-500">Empresa S.A.</div>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <BsGeoAltFill className="mr-1" /> 12/06/2024 09:45
                                        </div>
                                    </div>
                                </div>
                                {/* Recibe */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Recibe</div>
                                        <div className="text-xs text-gray-500">Pedro Soto 12.345.678-9</div>                                        
                                        <div className="text-xs text-gray-500">12/06/2024 09:55</div>
                                    </div>
                                </div>
                                {/* Descarga */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Descarga</div>
                                        <div className="text-xs text-gray-500">12/06/2024 10:00</div>
                                    </div>
                                </div>
                                {/* Retorno */}
                                <div className="h-16">
                                    <div className="flex flex-col h-16">
                                        <div className="font-bold">Retorno</div>
                                        <div className="text-xs text-gray-500">12/06/2024 10:20</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button
                                onClick={onCloseDetalleVenta}
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