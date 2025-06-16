"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MdCleaningServices, MdOutlineKeyboardDoubleArrowUp } from "react-icons/md";
import Loader from "./Loader";
import { FaClipboardCheck, FaFlagCheckered, FaUndo } from "react-icons/fa";
import { socket } from "@/lib/socket-client";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { FaBuildingFlag, FaHouseFlag, FaMapLocationDot, FaRoadCircleCheck, FaTruckArrowRight } from "react-icons/fa6";
import { BsFillGeoAltFill, BsQrCodeScan } from "react-icons/bs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LuFlagOff } from "react-icons/lu";
import { getNUCode } from "@/lib/nuConverter";
import { TbHomeShare } from "react-icons/tb";

export default function Despacho({ session }) {
    const [rutaDespacho, setRutaDespacho] = useState(null);
    const [vehiculos, setVehiculos] = useState([]);
    const [resumenCarga, setResumenCarga] = useState([]);
    const [loadingState, setLoadingState] = useState(-2);
    const [scanMode, setScanMode] = useState(false);
    const hiddenInputRef = useRef(null);
    
    function calculateTubePosition(index) {
        const baseTop = 36;
        const baseLeft = 66;
        const scaleFactor = 1.5;

        const verticalIncrement = 3;

        const top = baseTop + (index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + (index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
    }

    function calculateUploadTubePosition(index) {
        const baseTop = 176;
        const baseLeft = 156;
        const scaleFactor = 1.5;

        const verticalIncrement = 3;

        const top = baseTop + (index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + (index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
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
                    restantes: 0
                };
            } else {
                resumen[key].multiplicador += 1;
            }
        });

        return Object.values(resumen);
    };

    const handleScanMode = () => {
        toast.info(`Modo escaneo ${scanMode ? "desactivado" : "activado"}`, {
            position: "top-center",
        });
        setScanMode(!scanMode);
    };

    const getResumenDescarga = (rd) => {
        // If no rutaDespacho or no items, return empty array
        if (!rd || !Array.isArray(rd.cargaItemIds)) return [];

        // Find the current destination from the route
        if (!rd.ruta || rd.ruta.length === 0) return [];

        // Get current route that hasn't been delivered yet (no fechaArribo)
        const currentRoute = rd.ruta[rd.ruta.length - 1];

        // Find which client corresponds to this destination
        const currentClient = rd.ventaIds?.find(venta => {
            const clientDestId = venta.clienteId.direccionId._id;
            const routeDestId = typeof currentRoute.direccionDestinoId === 'object'
                ? currentRoute.direccionDestinoId._id
                : currentRoute.direccionDestinoId;

            return clientDestId === routeDestId;
        });

        if (!currentClient) return [];

        // Group items by subcategory and client
        const itemsBySubcategory = {};

        // First pass: count total items for each subcategory
        rd.cargaItemIds.forEach((item) => {
            const sub = item.subcategoriaCatalogoId;
            if (!sub || !sub._id) return;

            // Check if this item belongs to the current client's orders
            const itemClientId = item.ventaId?.clienteId || currentClient.clienteId._id;
            if (itemClientId !== currentClient.clienteId._id) return;

            const key = sub._id;

            if (!itemsBySubcategory[key]) {
                itemsBySubcategory[key] = {
                    subcategoriaCatalogoId: sub,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sinSifon,
                    esIndustrial: sub.categoriaCatalogoId?.esIndustrial || false,
                    esMedicinal: sub.categoriaCatalogoId?.esMedicinal || false,
                    elemento: sub.categoriaCatalogoId?.elemento || "",
                    multiplicador: 0,
                    restantes: 0,
                    clienteId: currentClient.clienteId._id,
                    clienteNombre: currentClient.clienteId.nombre
                };
            }
            
            // Increment the total count (multiplicador)
            itemsBySubcategory[key].multiplicador += 1;
            
            // If not marked as downloaded, increment the remaining count
            if (!item.descargado) {
                itemsBySubcategory[key].restantes += 1;
            }
        });

        return Object.values(itemsBySubcategory);
    };

    const isCompleted = (rd) => {
        const descarga = getResumenDescarga(rd);
        if (descarga.length === 0) return false;
        return descarga.every((item) => item.restantes <= 0);
    }

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
                setRutaDespacho({ ...rutaDespacho, ...nuevaRuta });
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
                if (data.rutaDespacho && data.rutaDespacho.cargaItemIds && data.rutaDespacho.cargaItemIds.length > 0) {
                    setResumenCarga(getResumenCarga(data.rutaDespacho.cargaItemIds));
                }
                if (data.rutaDespacho && data.rutaDespacho.ruta && data.rutaDespacho.ruta.length > 0) {
                    // Ensure each route has complete direccionDestinoId from the corresponding client
                    const enrichedRuta = data.rutaDespacho.ruta.map(r => {
                        // Try to find matching client from ventaIds
                        const matchingVenta = data.rutaDespacho.ventaIds.find(venta =>
                            venta.clienteId.direccionId._id === r.direccionDestinoId
                        );

                        console.log("Matching venta for ruta:", r, matchingVenta);

                        // If found, use client's complete direccionId, otherwise keep original with fallback name
                        return {
                            ...r,
                            direccionDestinoId: matchingVenta.clienteId.direccionId
                        };
                    });

                    setRutaDespacho({
                        ...data.rutaDespacho,
                        ruta: enrichedRuta
                    });
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
                    direccionId: rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId
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

    const handleHeLlegado = () => {
        console.log("He llegado");
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.descarga);
    };

    const handleConfirmarDestino = () => {
        const postConfirmarDestino = async () => {
            try {
                setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.descarga);
                const response = await fetch("/api/pedidos/confirmarArribo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rutaId: rutaDespacho._id
                    }),
                });

                const data = await response.json();
                if (data.ok) {
                    // Update the rutaDespacho state
                    const now = new Date();
                    const updatedRuta = [...rutaDespacho.ruta];
                    const rutaIndex = updatedRuta.findIndex(r => r.fechaArribo === null);

                    if (rutaIndex >= 0) {
                        updatedRuta[rutaIndex].fechaArribo = now;
                    }

                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
                        ruta: updatedRuta
                    });

                    toast.success("Arribo confirmado correctamente");
                    socket.emit("update-pedidos", {
                        userId: session.user.id
                    });
                } else {
                    toast.error(data.error || "Error al confirmar el arribo");
                }
            } catch (error) {
                console.error("Error al confirmar el arribo:", error);
                toast.error("Error de conexión al confirmar el arribo");
            } finally {
                setLoadingState(-1);
            }
        }
        postConfirmarDestino();
    }

    const handleCrregirDestino = () => {
        setRutaDespacho({
            ...rutaDespacho,
            estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
            ruta: rutaDespacho.ruta.filter(r => r.fechaArribo)
        });
    }

    const postDescarga = async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada);
        if (!isCompleted(rutaDespacho)) {
            console.log("Eeeeepa!");
            return;
        }

        const response = await fetch("/api/pedidos/confirmarDescarga", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al guardar el cargamento: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Descarga confirmado con éxito`, {
                position: "top-center",
            });
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            setRutaDespacho({
                ...rutaDespacho,
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada,
            });
        }
    }

    const descargarItem = useCallback(async (codigo) => {
        // Encontrar el item que corresponde al código escaneado
        const itemIndex = rutaDespacho.cargaItemIds.findIndex(
            cargaItem => cargaItem.codigo === codigo
        );

        if (itemIndex === -1) {
            toast.error(`El código ${codigo} no corresponde a ningún item de esta entrega`, {
                position: "top-center",
            });
            return;
        }

        // Verificar si el item ya ha sido descargado
        if (rutaDespacho.cargaItemIds[itemIndex].descargado) {
            toast.warn(`El item con código ${codigo} ya ha sido descargado`, {
                position: "top-center",
            });
            return;
        }

        // Crear una copia profunda del rutaDespacho para modificarlo
        const rutaDespachoActualizado = { 
            ...rutaDespacho,
            cargaItemIds: [...rutaDespacho.cargaItemIds]
        };

        // Marcar el item como descargado
        rutaDespachoActualizado.cargaItemIds[itemIndex] = {
            ...rutaDespachoActualizado.cargaItemIds[itemIndex],
            descargado: true
        };
        setRutaDespacho(rutaDespachoActualizado);

        toast.success(`Item ${codigo} descargado correctamente`, {
            position: "top-center",
        });

        setLoadingState(-1);
    }, [rutaDespacho, setRutaDespacho]);

    const handleGoingBackToBase = async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.regreso);

        const response = await fetch("/api/pedidos/volverABase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al marcar el regreso: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Regreso informado con éxito`, {
                position: "top-center",
            });
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            setRutaDespacho({
                ...rutaDespacho,
                estado: TIPO_ESTADO_RUTA_DESPACHO.regreso,
            });
            setLoadingState(-1);
        }
    }

    const handleFinish = async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.terminado);
        const response = await fetch("/api/pedidos/terminarRuta", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al terminar la ruta: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Ruta terminada con éxito`, {
                position: "top-center",
            });
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            setRutaDespacho(null);
            setLoadingState(-2);
        }
    }

    useEffect(() => {
        const handleTextInput = (e) => {            
            if (scanMode) {
                const codigo = e.data;
                const scanItem = async () => {                    
                    descargarItem(codigo);
                }
                scanItem();
            }
        }

        const inputElement = hiddenInputRef.current;
        if (inputElement) {
            // textInput event (supported by some mobile browsers)
            inputElement.addEventListener('textInput', handleTextInput);

            inputElement.focus();
        }

        return () => {
            if (inputElement) {
                inputElement.removeEventListener('textInput', handleTextInput);
            }
        };
    }, [scanMode, descargarItem]);

    // Mantener el foco en el input oculto para capturar eventos
    useEffect(() => {
        if (!scanMode) return;
        const keepFocus = setInterval(() => {
            if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
                hiddenInputRef.current.focus();
            }
        }, 300);

        return () => clearInterval(keepFocus);
    }, [scanMode]);

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
            <div className={`${loadingState == -2 || !rutaDespacho || loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? "opacity-20" : ""}`}>
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
                    {Array.from({ length: rutaDespacho?.cargaItemIds.length }, (_, i) => rutaDespacho.cargaItemIds.length - i - 1).map(index => {
                        const elem = rutaDespacho?.cargaItemIds[index].subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                        const elementos = ["o2", "co2", "n2o", "ar", "he", "aligal", "aire alphagaz", "n2 (liquido)", "n2", "atal", "arcal", "c2h2",];
                        const colores = ["verde", "azul", "rojo", "amarillo", "azul", "rojo", "amarillo", "verde", "rojo", "rojo", "azul", "azul", "rojo"];
                        const color = colores[elementos.indexOf(elem.toLowerCase())] || "";
                        return (
                            <Image
                                key={index}
                                src={`/ui/tanque_biox${color.length > 1 ? "_" + color : ""}.png`}
                                alt={`tank_${index}`}
                                width={14 * 4}
                                height={78 * 4}
                                className={`absolute ${rutaDespacho.cargaItemIds[index].descargado ? "opacity-30" : ""}`}
                                style={calculateTubePosition(index)}
                                priority={false}
                            />
                        )
                    })}
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
                {rutaDespacho && rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga && <div className="absolute top-6 left-8 ml-2 mt-2 w-full">
                    {Array.from({ length: rutaDespacho?.cargaItemIds.length }, (_, i) => rutaDespacho.cargaItemIds.length - i - 1).map(index => {
                        const elem = rutaDespacho?.cargaItemIds[index].subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                        const elementos = ["o2", "co2", "n2o", "ar", "he", "aligal", "aire alphagaz", "n2 (liquido)", "n2", "atal", "arcal", "c2h2",];
                        const colores = ["verde", "azul", "rojo", "amarillo", "azul", "rojo", "amarillo", "verde", "rojo", "rojo", "azul", "azul", "rojo"];
                        const color = colores[elementos.indexOf(elem.toLowerCase())] || "";
                        return (
                            <Image
                                key={index}
                                src={`/ui/tanque_biox${color.length > 1 ? "_" + color : ""}.png`}
                                alt={`tank_${index}`}
                                width={14 * 3}
                                height={78 * 3}
                                className={`absolute ${rutaDespacho.cargaItemIds[index].descargado ? "" : "opacity-40"}`}
                                style={calculateUploadTubePosition(index)}
                                priority={false}
                            />
                        )
                    })}
                </div>}
            </div>

            {loadingState != -2 && rutaDespacho && <div className="w-full absolute bottom-0 right-0 flex items-center justify-center">


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
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga)
                    && (<div className="w-full text-center mt-4 mx-6">

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta && loadingState != TIPO_ESTADO_RUTA_DESPACHO.descarga && <div><button
                            className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md mb-4 h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'opacity-50' : ''}`}
                            onClick={() => handleHeLlegado()}>
                            <FaFlagCheckered className="mt-1 mr-2" /><span>HE LLEGADO</span>
                            {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga &&
                                <div className="absolute -mt-1">
                                    <Loader texto="" />
                                </div>
                            }
                        </button></div>}

                        {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga && <div className="w-full mb-4">
                            <FaBuildingFlag size="9rem" className="text-green-500 mb-4 mx-auto" />
                            <div>
                                <p className="text-center text-xl font-bold mb-4">Confirma que has llegado a</p>
                                <BsFillGeoAltFill size="1.75rem" className="inline-block mr-2" />
                                <span className="text-2xl">{rutaDespacho.ruta?.find(r => !r.fechaArribo).direccionDestinoId.nombre || "un destino"}</span>
                            </div>
                            <button
                                className={`w-full flex justify-center mt-4 py-3 px-8 bg-gray-400 text-white font-bold rounded-lg shadow-md h-12`}
                                onClick={handleCrregirDestino}>
                                <LuFlagOff className="mt-1 mr-2" /><span>ES OTRO DESTINO</span>
                            </button>
                            <button
                                className={`w-full flex justify-center mt-4 py-3 px-8 bg-green-400 text-white font-bold rounded-lg shadow-md h-12`}
                                onClick={handleConfirmarDestino}>
                                <FaBuildingFlag className="mt-1 mr-2" /><span>CONFIRMO</span>
                            </button>
                        </div>}

                        {loadingState != TIPO_ESTADO_RUTA_DESPACHO.descarga 
                        && (rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ||
                            rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
                        && <div className="flex flex-row items-start justify-center gap-4 mb-6">
                            <div className="flex flex-col items-center mt-1 ml-2">
                                <FaFlagCheckered className="text-xl mb-4" />
                                <div className="h-4" />
                                {/* Línea y puntos */}
                                <FaTruckArrowRight className="text-xl mt-1" />
                            </div>
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
                                                    console.log("SETEADO", {
                                                        ...rutaDespacho, ruta: [{
                                                            direccionDestinoId: selectedVenta.clienteId.direccionId,
                                                        }]
                                                    });
                                                    setRutaDespacho({
                                                        ...rutaDespacho, ruta: [{
                                                            direccionDestinoId: selectedVenta.clienteId.direccionId,
                                                        }]
                                                    });
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
                        </div>}

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino && <div className="flex flex-row items-center justify-center">
                            <button className="flex w-full justify-center py-3 px-4 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer mb-4"
                                onClick={handleIniciarViaje}>
                                {loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? <Loader texto=""/> : <div className="flex"><FaFlagCheckered className="mt-1 mr-3" /><span>INICIAR VIAJE</span></div>}
                            </button>
                        </div>}

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga && (
                            <ul className="flex-1 flex flex-wrap items-center justify-center mt-2 mb-20">
                                {getResumenDescarga(rutaDespacho).map((item, idx) => (
                                    <li
                                        key={`item_${idx}`}
                                        className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${idx === 0 ? 'rounded-t-lg' : idx === getResumenDescarga(rutaDespacho).length - 1 ? 'rounded-b-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                    >
                                        <div className="w-full flex items-left">
                                            <div className="flex">
                                                <div>
                                                    <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(item.subcategoriaCatalogoId.categoriaCatalogoId.elemento)}</div>
                                                    {item.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                    {item.subcategoriaCatalogoId.categoriaCatalogoId.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                                </div>
                                                <div className="font-bold text-xl ml-2">
                                                    <span>
                                                        {(() => {
                                                            const elem = item.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                                                            let match = elem.match(/^([a-zA-Z]*)(\d*)$/);
                                                            if (!match) {
                                                                match = [null, (elem ?? item.subcategoriaCatalogoId.categoriaCatalogoId.nombre.split(" ")[0]), ''];
                                                            }
                                                            const [, p1, p2] = match;
                                                            return (
                                                                <>
                                                                    {p1 ? p1.toUpperCase() : ''}
                                                                    {p2 ? <small>{p2}</small> : ''}
                                                                </>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-2xl orbitron ml-2"><b>{item.subcategoriaCatalogoId.cantidad}</b> <small>{item.subcategoriaCatalogoId.unidad}</small></p>
                                        </div>
                                        <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{item.multiplicador - item.restantes} <small>/</small> {item.multiplicador}</div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga && <div className="absolute bottom-3 flex w-full pr-8">
                            <button className={`absolute h-12 w-12 mr-3 flex text-sm border border-gray-300 rounded-lg p-1 mb-4 ${(scanMode && !isCompleted(rutaDespacho)) ? 'bg-green-500 cursor-pointer' : isCompleted() ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 cursor-pointer'} text-white hover:${(scanMode && !isCompleted()) ? 'bg-green-300 cursor-pointer' : isCompleted() ? 'bg-gray-400' : 'bg-sky-700 cursor-pointer'} transition duration-300 ease-in-out`}
                                onClick={() => {
                                    handleScanMode();
                                }}>
                                <BsQrCodeScan className="text-4xl" />
                                {scanMode && !isCompleted() && <div className="absolute top-2 left-2">
                                    <Loader texto="" />
                                </div>}
                            </button>
                            <button className={`w-full ml-16 mr-4 h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${isCompleted(rutaDespacho) ? 'bg-green-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                disabled={!isCompleted(rutaDespacho)}                            
                                onClick={postDescarga}>
                                <FaRoadCircleCheck className="text-4xl pb-0" />
                                <p className="ml-2 mt-1 text-lg">FIN DESCARGA</p>
                                {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada && 
                                    <div className="absolute mt-1"><Loader texto="" /></div>}
                            </button>
                        </div>}
                    </div>
                    )}


                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada && <div className="w-full px-6 mb-4 bg-white mx-auto">
                    <button
                        className={`w-full flex justify-center mt-4 py-3 bg-green-400 text-white font-bold rounded-lg shadow-md h-12`}
                        onClick={handleGoingBackToBase}>
                        <TbHomeShare className="text-2xl mt-0 mr-2" /><span>REGRESO A BASE</span>
                    </button>
                    <button
                        className={`w-full flex justify-center mt-4 py-3 bg-red-400 text-white font-bold rounded-lg shadow-md h-12`}
                        onClick={() => {
                            setRutaDespacho({
                                ...rutaDespacho,
                                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
                            })
                        }}>
                        <FaUndo className="mt-1 mr-2" /><span>ME FALTA CARGA</span>
                    </button>
                </div>}

            </div>}

            {rutaDespacho && rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso && loadingState == -1 && <div className="absolute bottom-4 flex w-full px-4">
                <button
                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'opacity-50' : ''}`}
                    onClick={() => handleFinish()}>
                    <FaHouseFlag className="mt-1 mr-2" /><span>HE REGRESADO</span>
                    {loadingState == TIPO_ESTADO_RUTA_DESPACHO.terminado &&
                        <div className="absolute -mt-1">
                            <Loader texto="" />
                        </div>
                    }
                </button>
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

            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
            />
        </div>
    );
}
