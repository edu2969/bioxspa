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

    const nombreChofer = (choferId) => {
        const chofer = choferes.find((chofer) => chofer._id === choferId);
        return chofer ? chofer.nombre : "Desconocido";
    }

    const getResumenCarga = (items = []) => {
        const resumen = {};
        if (!Array.isArray(items)) return [];

        items.forEach((item) => {
            // item.subcategoriaCatalogoId es un objeto poblado
            const sub = item.subcategoriaCatalogoId;
            if (!sub || !sub._id) return;

            const key = sub._id;
            if (!resumen[key]) {
                resumen[key] = {
                    subcategoriaCatalogoId: key,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sinSifon,
                    esIndustrial: sub.categoriaCatalogoId?.esIndustrial || false,
                    esMedicinal: sub.categoriaCatalogoId?.esMedicinal || false,
                    elemento: sub.categoriaCatalogoId?.elemento || "",
                    multiplicador: 1,
                };
            } else {
                resumen[key].multiplicador += 1;
            }
        });

        return Object.values(resumen);
    };

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
            setEnTransito(data.flotaEnTransito.map((ruta) => {
                return {
                    ...ruta,
                    resumenCarga: getResumenCarga(ruta.cargaItemIds)
                };
            }));
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
        console.log("index", index);
        const baseTop = 36;
        const baseLeft = 42;

        const verticalIncrement = 3;

        const top = baseTop + (index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + (index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: '14px', height: '78px' };
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
                            <Link href="/modulos/pedidos/nuevo" className="relative ml-auto -mt-2">
                                <button className="flex items-center bg-blue-500 text-white h-12 w-12 rounded hover:bg-blue-600 transition-colors font-semibold">
                                    <FaCartPlus size={38} className="pl-0.5 ml-0.5" />
                                </button>
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
                                            {pedido.items.map((item, index2) => (<li key={`item_${index2}`}>{item.cantidad}x {item.nombre}</li>))}
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
                            <div
                                key={`en_espera_${index}`}
                                className="p-2 border rounded-lg mb-2 bg-gray-100"
                                data-id={`choferId_${chofer._id}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "rgb(209 213 219)"; // Tailwind gray-300
                                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgb(243 244 246)"; // Tailwind gray-100
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "rgb(243 244 246)"; // Tailwind gray-100
                                    e.currentTarget.style.boxShadow = "none";
                                    if (selectedPedido) {
                                        setSelectedChofer(chofer._id);
                                        setShowConfirmModal(true);
                                    }
                                }}
                            >
                                <div className="font-bold uppercase flex">
                                    <GoCopilot size="1.5rem" /><span className="ml-2">{chofer.nombre}</span>
                                </div>
                                {chofer.pedidos.length ? chofer.pedidos.map((pedido, indexPedido) => <div className="bg-gray-200 rounded shadow-md p-1 mb-2"
                                    onDragStart={() => {
                                        setSelectedChofer(chofer._id);
                                        setSelectedVenta(pedido.items[0].ventaId);
                                        console.log("Venta seleccionada:", pedido.items[0].ventaId);
                                    }}
                                    draggable="true" key={`pedidos_chofer_${indexPedido}`}>
                                    <p className="font-md upper</div>case font-bold">{pedido.nombreCliente}</p>
                                    <ul className="list-disc ml-4">
                                        {pedido.items?.map((item, indexItem) => <li key={`item_en_espera_${indexItem}`}>{item.cantidad}x {item.nombre}</li>)}
                                    </ul>
                                </div>) : <div className="relative w-32">
                                    <div className="relative -top-8 left-64 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-tr-md rounded-bl-md flex items-center">
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
                        EN TRÁNSITO
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
                            <div
                                key={`ruta_${index}`}
                                data-id={ruta._id}
                                className="relative w-full border rounded-lg px-4 bg-gray-100 shadow-md mb-4 h-64 pt-4"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "#333333";
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                                }}
                                onDrop={(e) => {
                                    alert(`SOLTADO en camión ${ruta.vehiculoId.patent}`);
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "green";
                                }}
                            >
                                <Image className="absolute top-4 left-0 ml-8" src="/ui/camion.png" alt={`camion_atras_${index}`} width={247} height={191} style={{ width: '247px', height: '191px' }} priority />
                                <div className="absolute top-0 left-0 ml-10 mt-2 w-full h-fit">
                                    {Array.from({ length: ruta.cargaItemIds.length }, (_, i) => ruta.cargaItemIds.length - i - 1).map(index => {
                                        const elem = ruta.cargaItemIds[index].subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                                        const elementos = ["o2", "co2", "n2o", "ar", "he", "aligal", "aire alphagaz", "n2 (liquido)", "n2", "atal", "arcal", "c2h2", ];
                                        const colores = ["verde", "azul", "rojo", "amarillo", "azul", "rojo", "amarillo", "verde", "rojo", "rojo", "azul", "azul", "rojo"];
                                        const color = colores[elementos.indexOf(elem.toLowerCase())] || "";
                                        return (
                                        <Image
                                            key={index}
                                            src={`/ui/tanque_biox${color.length > 1 ? "_" + color : ""}.png`}
                                            alt={`tank_${index}`}
                                            width={14 * 2}
                                            height={78 * 2}
                                            className="absolute"
                                            style={calculateTubePosition(index)}
                                            priority={false}
                                        />
                                    )})}
                                </div>
                                <Image className="absolute top-4 left-0 ml-8" src="/ui/camion_front.png" alt="camion" width={247} height={191} style={{ width: '247px', height: '191px' }} />
                                <div className="absolute ml-16 mt-6" style={{ transform: "translate(60px, 34px) skew(0deg, -20deg)" }}>
                                    <div className="ml-4 text-slate-800">
                                        <p className="text-xl font-bold">{ruta.vehiculoId.patente}</p>
                                        <p className="text-xs">{ruta.vehiculoId.marca}</p>
                                        <div className="flex items-center mb-2">
                                            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                                            <span className="text-xs font-semibold text-green-700">En ruta</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 flex items-center ml-4">
                                    <BsGeoAltFill size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                    <p className="text-xs text-gray-500 ml-2">{ruta.ruta.find(r => !r.fechaArribo).direccionDestinoId.nombre}</p>
                                </div>
                                <div className="ml-72">
                                    <p className="text-xs">Conductor</p>
                                    <p className="text-lg uppercase font-bold -mt-1 mb-2">{ruta.choferId.name}</p>
                                    <div></div>
                                    <div className="flex flex-wrap">
                                        {ruta.resumenCarga?.map((item, idx) => (
                                            <div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                                <b>{item.multiplicador}</b>x {item.elemento.toUpperCase()} {item.cantidad}{item.unidad}
                                                {item.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                                {item.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                            </div>
                                        ))}
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
                            fetchPedidos();
                        } catch (error) {
                            toast.error(error.message || "Error al deshacer la asignación del pedido");
                        } finally {
                            setShowReasignacionModal(false); // Cierra el modal después de confirmar                            
                            setLoading(false);
                            setLoadingPanel(true);
                            setSelectedVenta(null);
                            setSelectedChofer(null);
                            socket.emit("update-pedidos", { room: "room-pedidos", userId: selectedChofer });
                        }
                    };
                    deshacerAsignarPedido();
                }}
                confirmationLabel="ASIGNAR"
            />

            <ToastContainer />
        </main>
    );
}