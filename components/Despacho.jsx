"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { MdCleaningServices, MdOutlineKeyboardDoubleArrowUp } from "react-icons/md";
import Loader from "./Loader";
import { FaClipboardCheck, FaFlagCheckered } from "react-icons/fa";
import { socket } from "@/lib/socket-client";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { FaMapLocationDot, FaTruckArrowRight } from "react-icons/fa6";
import { BsFillGeoAltFill } from "react-icons/bs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Despacho({ session }) {
    const [rutaDespacho, setRutaDespacho] = useState(null);
    const [vehiculos, setVehiculos] = useState([]);
    const [resumenCarga, setResumenCarga] = useState([]);
    const [loadingState, setLoadingState] = useState(-2);

    function calculateTubePosition(layerIndex, index) {
        const scaleFactor = 1.5; // Factor de escala basado en el tamaño triplicado del camión
        const baseTop = 18 * scaleFactor; // Escalar la posición inicial en el eje Y
        const baseLeft = 22 * scaleFactor; // Escalar la posición inicial en el eje X
        const verticalSpacing = -4.5 * scaleFactor; // Escalar el espaciado vertical entre tubos
        const horizontalSpacing = 3 * scaleFactor; // Escalar el espaciado horizontal entre columnas
        const perspectiveAngle = 55; // Ángulo de perspectiva en grados (sin cambios)
        const rowGroupSpacing = 9 * scaleFactor; // Escalar el espaciado adicional entre grupos de filas

        // Conversión del ángulo de perspectiva a radianes
        const angleInRadians = (perspectiveAngle * Math.PI) / 180;

        // Cálculo de desplazamiento en perspectiva
        const perspectiveOffset = layerIndex * Math.tan(angleInRadians) * scaleFactor;

        // Ajuste para separar los grupos de filas
        const groupOffset = layerIndex >= 3 ? rowGroupSpacing : 0;

        // Cálculo de las posiciones escaladas
        const top = baseTop + index * verticalSpacing + perspectiveOffset;
        const left = baseLeft + layerIndex * horizontalSpacing + perspectiveOffset + groupOffset;

        return { top, left, width: `${14 * scaleFactor}px`, height: `${78 * scaleFactor}px` }; // Escalar el tamaño de los tanques
    }

    // items corresponde a cargaItemIds del backend (ver route.js)
    // Retorna [{ subcategoriaCatalogoId, cantidad, sinSifon, esIndustrial, esMedicinal, elemento, multiplicador }]
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

    const vehiculoPorId = (id) => {
        if (id == null) return { patente: "", marca: "" };
        return vehiculos?.find((vehiculo) => vehiculo._id === id) || { patente: "", marca: "" };
    };

    const checkListVehiculo = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ vehiculoId: rutaDespacho.vehiculoId }),
            });
            const data = await response.json();
            console.log("Response from POST /api/pedidos/asignacion/chofer:", data);
            if (data.ok) {
                const nuevaRuta = {
                    estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                }
                if (rutaDespacho.ventaIds.length == 1) {
                    nuevaRuta.ruta = [{
                        direccionDestinoId: rutaDespacho.ventaIds[0].clienteId.direccionId
                    }];
                }
                setRutaDespacho({...rutaDespacho, ...nuevaRuta } );
                setLoadingState(-1);
            } else {
                toast.error("No se pudo asignar el vehiculo");
            }
        } catch (error) {
            console.log("Error in POST request:", error);
        }
    }, [rutaDespacho, setRutaDespacho]);

    const fetchRutaAsignada = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer");
            const data = await response.json();
            if (data.ok) {
                console.log("Data result:", data);
                setRutaDespacho(data.rutaDespacho);
                if(data.rutaDespacho && data.rutaDespacho.cargaItemIds && data.rutaDespacho.cargaItemIds.length > 0) {
                    setResumenCarga(getResumenCarga(data.rutaDespacho.cargaItemIds));
                }
                setVehiculos(data.vehiculos);
            } else {
                console.error("Error fetching rutaDespacho:", data.error);
            }
            setLoadingState(-1);
        } catch (error) {
            console.error("Error in fetchRutaAsignada:", error);
        }
    }, [setRutaDespacho, setLoadingState, setVehiculos]);

    const handleCargaConfirmada = useCallback(async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada);
        try {
            const response = await fetch("/api/pedidos/despacho/confirmarOrden", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            const data = await response.json();
            if (data.ok) {
                toast.success("Carga confirmada correctamente");
                setRutaDespacho({
                    ...rutaDespacho,
                    estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada,
                });
                socket.emit("update-pedidos", {
                    userId: session.user.id
                });
            } else {
                toast.error(data.error || "Error al confirmar la carga");
            }
        } catch (error) {
            console.error("Error al confirmar la carga:", error);
            toast.error("Error de conexión al confirmar la carga");
        } finally {
            setLoadingState(-1);
        }
    }, [rutaDespacho, setRutaDespacho, setLoadingState, session]);

    const handleIniciarViaje = useCallback(async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.en_ruta);
        try {
            const response = await fetch("/api/pedidos/iniciarViaje", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id,
                    direccionId: rutaDespacho.ruta.find(r => !r.fechaArribo).direccionDestinoId
                }),
            });

            const data = await response.json();
            if (data.ok) {
                toast.success("Viaje iniciado correctamente");
                setRutaDespacho({
                    ...rutaDespacho,
                    estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta
                });
                socket.emit("update-pedidos", {
                    userId: session.user.id
                });
            } else {
                toast.error(data.error || "Error al iniciar el viaje");
            }
        } catch (error) {
            console.error("Error al iniciar el viaje:", error);
            toast.error("Error de conexión al iniciar el viaje");
        } finally {
            setLoadingState(-1);
        }
    }, [setRutaDespacho, setLoadingState, rutaDespacho, session]);

    useEffect(() => {
        fetchRutaAsignada();
    }, [fetchRutaAsignada]);

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

    useEffect(() => {
        socket.on("update-pedidos", (data) => {
            console.log(">>>> Update pedidos", data, session);
            fetchRutaAsignada();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, [session, fetchRutaAsignada]);

    return (
        <div className="w-full h-screen overflow-hidden">
            {loadingState == -1 && rutaDespacho?.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && vehiculos.length >= 2 && <div className="w-full text-center">
                <select className="text-2xl font-bold mb-4 border rounded-lg bg-white shadow-sm w-1/3 mt-10"
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}>
                    <option>Selecciona un vehiculo</option>
                    {vehiculos.map((vehiculo) => (
                        <option key={`vehiculo_${vehiculo._id}`} value={vehiculo._id}>
                            {vehiculo.patente} - {vehiculo.marca}
                        </option>
                    ))}
                </select>
            </div>}
            <div className={`${loadingState == -2 || !rutaDespacho ? "opacity-20" : ""}`}>
                <Image
                    className="absolute top-6 left-8 ml-2"
                    src="/ui/camion.png"
                    alt="camion_atras"
                    width={355}
                    height={275}
                    style={{ width: "355px", height: "275px" }}
                    priority
                />
                <div className="absolute top-6 left-8 ml-2 mt-2 w-full">
                    {Array.from({ length: 6 }).map((_, layerIndex) => (
                        <div key={layerIndex} className="absolute flex" style={calculateTubePosition(layerIndex, 0)}>
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${(index + layerIndex * 6 > 40) ? '_verde' : (index + layerIndex * 6 > 20) ? '_azul' : ''}.png`}
                                    alt={`tank_${layerIndex * 6 + index}`}
                                    width={14 * 2}
                                    height={78 * 2}
                                    className="relative"
                                    style={calculateTubePosition(layerIndex, index)}
                                    priority={false}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <Image
                    className="absolute top-6 left-8 ml-2"
                    src="/ui/camion_front.png"
                    alt="camion"
                    width={355}
                    height={275}
                    style={{ width: "355px", height: "275px" }}
                />
                {rutaDespacho && rutaDespacho.vehiculoId && <div className="absolute top-20 left-52 ml-2 mt-10" style={{ transform: "translate(0px, 0px) skew(0deg, -20deg) scale(2)" }}>
                    <div className="ml-4 text-slate-800">
                        <p className="text-xs font-bold">{vehiculoPorId(rutaDespacho.vehiculoId).patente || ""}</p>
                        <p className="text-xs">{vehiculoPorId(rutaDespacho.vehiculoId).marca || ""}</p>
                    </div>
                </div>}
            </div>

            {loadingState == -1 && rutaDespacho && <div className="w-full absolute bottom-0 right-0 flex items-center justify-center">


                {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada) && (
                        <div className="w-full py-2 px-2 border rounded-t-xl shadow-lg bg-white mx-2 -mb-1">
                            <MdOutlineKeyboardDoubleArrowUp className="text-gray-400 mx-auto -mt-1 mb-1" style={{ transform: "scaleX(6)" }} />
                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && <div className="py-4">
                                <div className="py-4">
                                    <Loader texto="EN PROCESO DE CARGA" />
                                </div>
                                <div>
                                    <p className="mx-auto my-4 px-4">MARIO SOLAR esta cargando. Pronto podrás iniciar tu viaje.</p>
                                </div>
                            </div>}

                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada && <div>
                                <p className="text-center text-xl font-bold">CONFIRMA{`${loadingState == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada ? 'NDO' : ''}`} LA CARGA</p>
                                <div className="flex flex-col md:flex-row px-4 py-2">
                                    <div className="w-full md:w-1/3">
                                        <div className="flex flex-wrap text-gray-700 text-md">
                                            {resumenCarga.map((item, idx) => (
                                                <div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                                    <b>{item.multiplicador}</b>x {item.elemento.toUpperCase()} {item.cantidad}{item.unidad}
                                                    {item.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                                    {item.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button className={`flex w-full justify-center py-3 px-4 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer mb-4 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada ? "opacity-50 cursor-not-allowed" : ""}`}
                                    onClick={handleCargaConfirmada}>
                                    <FaFlagCheckered className="mt-1 mr-3" /><span>CONFIRMAR CARGA</span>
                                    {loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada &&
                                        <div className="absolute -mt-1"><Loader texto="" /></div>}
                                </button>
                            </div>}
                        </div>
                    )}

                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada && <div className="mb-8">
                    <div className="text-center bg-gray-200 py-2 px-4 rounded-xl shadow-lg">
                        <p className="text-xl font-bold text-gray-700 mb-4">INICIO DE DESPACHO</p>
                        <MdCleaningServices className="inline-block mr-2 mb-6 text-8xl" />
                        <div className="flex">
                            <input
                                onChange={() => {
                                    if (rutaDespacho.ventaIds.length > 1) {
                                        setRutaDespacho({ ...rutaDespacho, estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino });
                                        return;
                                    }
                                    checkListVehiculo();
                                }}
                                type="checkbox"
                                className="h-8 w-8 text-green-500 mx-auto"
                            />
                            <p className="w-72 text-left text-xl ml-4">Certifico que el interior del vehiculo está limpio</p>
                        </div>
                    </div>
                </div>}

                {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
                    && (<div className="text-center mt-4 mx-6">
                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta && <div><button
                            className="w-full flex justify-center mt-6 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md mb-4 h-12">
                            <FaFlagCheckered className="mt-1 mr-2" /><span>HE LLEGADO</span>
                        </button></div>}

                        <div className="flex flex-row items-start justify-center gap-4 mb-6">
                            {/* Columna 1: Iconos */}
                            <div className="flex flex-col items-center mt-1 ml-2">
                                <FaFlagCheckered className="text-xl mb-4" />
                                <div className="h-4" />
                                {/* Línea y puntos */}
                                <FaTruckArrowRight className="text-xl mt-1" />
                            </div>
                            {/* Columna 2: Camino vertical */}
                            <div className="flex flex-col items-center justify-start h-full">
                                {/* Camino vertical */}
                                <div className="flex flex-col items-center mt-1">
                                    {/* Punto lleno */}
                                    <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                                    {/* Línea vertical */}
                                    <div className="w-2 h-10 bg-blue-400 -mt-1 -mb-2" />
                                    {/* Punto hueco */}
                                    <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-400" />
                                </div>
                            </div>
                            {/* Columna 3: Direcciones */}
                            <div className="flex flex-col justify-start text-left mt-1">
                                <div className="flex mt-1">
                                    <BsFillGeoAltFill size="1.1rem" /><span className="text-sm ml-2">Barros Arana</span>
                                </div>
                                {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta) => (<div key={`ruta_${ruta._id}`} className="flex mt-2">
                                    <BsFillGeoAltFill size="1.1rem" className="w-8 h-8 mt-4" /><span className="text-sm ml-2 mt-3">
                                        {ruta.direccionDestinoId.nombre}</span>
                                    <button
                                        className="bg-blue-400 text-white font-bold rounded-lg shadow-md w-12 h-12"
                                        onClick={() => {
                                            const destino = `${ruta.direccionDestinoId.latitud},${ruta.direccionDestinoId.longitud}`;
                                            // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                                            window.open(
                                                `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
                                                "_blank"
                                            );
                                        }}
                                    >
                                        <FaMapLocationDot className="mt-0.5 mr-2 w-12" size="1.5rem" />
                                    </button>
                                </div>))}
                                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino && rutaDespacho.ruta.length == 0 && (
                                    <div className="flex mt-2">
                                        <select
                                            className="border rounded-lg shadow-sm w-full py-2 mt-3"
                                            onChange={(e) => {
                                                const selectedVentaId = e.target.value;
                                                const selectedVenta = rutaDespacho.ventaIds.find((venta) => venta._id === selectedVentaId);
                                                if (selectedVenta) {
                                                    console.log("SETEADO", { ...rutaDespacho, ruta: [{
                                                        direccionDestinoId: selectedVenta.clienteId.direccionId,
                                                    }] }); 
                                                    setRutaDespacho({ ...rutaDespacho, ruta: [{
                                                        direccionDestinoId: selectedVenta.clienteId.direccionId,
                                                    }] });
                                                }
                                            }}
                                        >
                                            <option value="">Selecciona un destino</option>
                                            {rutaDespacho.ventaIds.map((venta) => (
                                                <option key={`venta_${venta._id}`} value={venta._id}>
                                                    {venta.clienteId.nombre} - {venta.clienteId.direccionId.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>)}
                            </div>
                        </div>


                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino && <div className="flex flex-row items-center justify-center">
                            <button className="flex w-full justify-center py-3 px-4 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer mb-4"
                                onClick={handleIniciarViaje}>
                                {loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? <Loader texto="INICIANDO VIAJE" /> : <div className="flex"><FaFlagCheckered className="mt-1 mr-3" /><span>INICIAR VIAJE</span></div>}
                            </button>
                        </div>}
                    </div>
                    )}                 

                
            </div>}
            

            {loadingState == -1 && !rutaDespacho && (
                <div className="w-full py-6 px-12 mt-64 bg-white mx-auto">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                    <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
                </div>
            )}
            {loadingState == -2 && <div className="fixed w-full top-72 mt-16"><Loader texto="CARGANDO TUS PEDIDOS..." /></div>}
            <ToastContainer />
        </div>
    );
}
