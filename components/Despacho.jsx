"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MdOutlineKeyboardDoubleArrowUp } from "react-icons/md";
import Loader from "./Loader";
import { FaClipboardCheck, FaFlagCheckered, FaPrint } from "react-icons/fa";
import { socket } from "@/lib/socket-client";
import { TIPO_CHECKLIST, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, USER_ROLE } from "@/app/utils/constants";
import { FaBuildingFlag, FaHouseFlag, FaMapLocationDot, FaRoadCircleCheck, FaTruckFast } from "react-icons/fa6";
import { BsFillGeoAltFill, BsQrCodeScan } from "react-icons/bs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LuFlagOff } from "react-icons/lu";
import { getNUCode } from "@/lib/nuConverter";
import { TbFlagCheck, TbHomeShare } from "react-icons/tb";
import CheckList from './CheckList';
import { useOnVisibilityChange } from '@/components/uix/useOnVisibilityChange';    
import { getColorEstanque } from "@/lib/uix";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";

export default function Despacho({ session }) {
    const [rutaDespacho, setRutaDespacho] = useState(null);
    const [vehiculos, setVehiculos] = useState([]);
    const [resumenCarga, setResumenCarga] = useState([]);
    const [loadingState, setLoadingState] = useState(-2);
    const [scanMode, setScanMode] = useState(false);
    const hiddenInputRef = useRef(null);
    const temporalRef = useRef(null);
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const [loadingChecklist, setLoadingChecklist] = useState(false);
    const [checkListPassed, setCheckListPassed] = useState(true);
    const [endingChecklist, setEndingChecklist] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    
    const fetchEstadoChecklist = async () => {
        try {
            setLoadingChecklist(true);
            const response = await fetch('/api/users/checklist', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                console.log("CHECKLISTS --->", data.checklists);
                // Busca si existe un checklist del tipo vehiculo aprobado hoy
                setCheckListPassed(
                    Array.isArray(data.checklists) &&
                    data.checklists.find(
                        checklist => checklist.tipo === TIPO_CHECKLIST.vehiculo && checklist.aprobado
                    ) !== undefined
                );
            } else {
                toast.error("Error al obtener el estado del checklist. Por favor, inténtelo más tarde.");
            }
        } catch (error) {
            console.error('Error fetching checklist status:', error);
        } finally {
            setLoadingChecklist(false);
        }
    }

    useEffect(() => {
        if (
            session &&
            session.user &&
            (session.user?.role === USER_ROLE.conductor ||
                session.user?.role === USER_ROLE.supervisor ||
                session.user?.role === USER_ROLE.supplier)
        ) {
            fetchEstadoChecklist();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const onFinish = (checklist) => {
        console.log("DESPACHO ---> onFinish called with checklist:", checklist);
        setEndingChecklist(true);
        checklist.tipo = TIPO_CHECKLIST.vehiculo;
        if(vehiculos.length === 1) {
            checklist.vehiculoId = vehiculos[0]._id;
        }
        fetch('/api/users/checklist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(checklist),
        })
        .then(async (res) => {
            setCheckListPassed(res.passed);
            setLoadingChecklist(false);
            if(res.ok) {
                socket.emit("update-pedidos", {
                    userId: session.user.id
                });
            }
            if(!res.passed) {
                setCheckListPassed(true);
            }
        })
        .catch((err) => {
            console.error('Error al guardar el checklist:', err);
            toast.error("Error al guardar el checklist. Por favor, inténtelo más tarde.", {
                position: "top-center"
            });
        })
        .finally(() => {
            setEndingChecklist(false);
        })
    };

    function calculateTubePosition(index) {
        const baseTop = 28;
        const baseLeft = 76;
        const scaleFactor = 1.5;

        const verticalIncrement = 4;

        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
    }

    function calculateUploadTubePosition(index) {        
        const baseTop = 146;
        const baseLeft = 176;
        const scaleFactor = 1.5;

        const verticalIncrement = 4;

        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

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

    const getResumenDescarga = (rd) => {
        // Validaciones básicas
        if (!rd || !Array.isArray(rd.cargaItemIds) || !rd.ruta || rd.ruta.length === 0 || !rd.ventaIds || rd.ventaIds.length === 0) return [];

        // Dirección destino actual
        const currentRoute = rd.ruta[rd.ruta.length - 1];
        const currentDireccionId = currentRoute.direccionDestinoId?._id || currentRoute.direccionDestinoId;

        // Filtra la venta que corresponde a la dirección actual
        const currentVenta = rd.ventaIds.find(venta =>
            venta.direccionDespachoId?.toString() === currentDireccionId?.toString()
        );
        if (!currentVenta || !Array.isArray(currentVenta.detalles)) return [];

        // Agrupa por subcategoria los detalles de la venta actual
        const resumen = {};

        currentVenta.detalles.forEach(detalle => {
            const sub = detalle.subcategoriaCatalogoId;
            if (!sub || !sub._id) return;
            const key = sub._id;

            if (!resumen[key]) {
                resumen[key] = {
                    subcategoriaCatalogoId: sub,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sinSifon,
                    esIndustrial: sub.categoriaCatalogoId?.esIndustrial || false,
                    esMedicinal: sub.categoriaCatalogoId?.esMedicinal || false,
                    elemento: sub.categoriaCatalogoId?.elemento || "",
                    multiplicador: 0,
                    restantes: 0,
                    clienteId: currentVenta.clienteId._id,
                    clienteNombre: currentVenta.clienteId.nombre
                };
            }
            resumen[key].multiplicador += detalle.cantidad;
        });

        // Calcula los restantes por subcategoria, solo para los items físicos que coinciden con la dirección y subcategoria
        Object.keys(resumen).forEach(key => {
            // Filtra solo los items que corresponden a la venta actual (por dirección de despacho)
            const itemsDeVentaActual = rd.cargaItemIds.filter(item => {
            // El item debe ser de la subcategoria actual
            return item.subcategoriaCatalogoId?._id === key;
            });

            // Busca el multiplicador (cantidad) de la venta actual para esta subcategoria
            const detalleVenta = currentVenta.detalles.find(det => det.subcategoriaCatalogoId?._id === key);
            const multiplicadorVenta = detalleVenta ? detalleVenta.cantidad : 0;

            // Restantes son los items de la venta actual que no han sido descargados, pero no puede exceder el multiplicador de la venta
            const noDescargados = itemsDeVentaActual.filter(item => !item.descargado).length;
            resumen[key].restantes = Math.max(0, multiplicadorVenta - (itemsDeVentaActual.length - noDescargados));
        });

        console.log("RESUMEN DESCARGA --->", Object.values(resumen));

        return Object.values(resumen);
    };

    const getClientedescarga = (rd) => {
        if (!rd || !Array.isArray(rd.ruta) || rd.ruta.length === 0 || !Array.isArray(rd.ventaIds)) return null;
        const lastDireccionId = rd.ruta[rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
        const venta = rd.ventaIds.find(v => String(v.direccionDespachoId) === String(lastDireccionId));
        if (!venta || !venta.clienteId) return null;
        return venta.clienteId;
    }

    const isCompleted = (rd) => {
        const descarga = getResumenDescarga(rd);
        if (descarga.length === 0) return false;
        return descarga.every((item) => item.restantes <= 0);
    }

    const fetchRutaAsignada = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer");
            const data = await response.json();
            if (data.ok) {
                console.log("Ruta asignada:", data.rutaDespacho);
                setRutaDespacho(data.rutaDespacho);
                if (data.rutaDespacho && data.rutaDespacho.cargaItemIds && data.rutaDespacho.cargaItemIds.length > 0) {
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
                if (rutaDespacho.ventaIds.length === 1 && rutaDespacho.ventaIds[0].clienteId.direccionesDespacho.length == 1) {
                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
                        ruta: [{
                            direccionDestinoId: rutaDespacho.ventaIds[0].clienteId.direccionesDespacho[0].direccionId,
                            fechaArribo: null,
                        }]
                    });
                } else {
                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: rutaDespacho.ruta?.filter(r => !r.fechaArribo).length < rutaDespacho.ventaIds.length
                        ? TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                        : TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                    });
                    setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino);
                }
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
                    direccionId: rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId._id
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

    const handleHeLlegado = async () => {
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
            ruta: rutaDespacho.ruta.map((r, idx) => idx === rutaDespacho.ruta.length ? { ...r, fechaArribo: null } : r)
        });
    }

    const postDescarga = async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada);

        // Encuentra la última dirección de la ruta
        const lastRoute = rutaDespacho.ruta[rutaDespacho.ruta.length - 1];
        const lastDireccionId = lastRoute.direccionDestinoId?._id || lastRoute.direccionDestinoId;

        // Busca la venta correspondiente a esa dirección
        const venta = rutaDespacho.ventaIds.find(
            v => String(v.direccionDespachoId) === String(lastDireccionId)
        );

        if (!venta) {
            toast.error("No se encontró la venta para la dirección actual.", {
                position: "top-center",
            });
            setLoadingState(-1);
            return;
        }

        // Filtra los items escaneados (descargados) para esa venta
        const scanCodes = rutaDespacho.cargaItemIds
            .filter(item => {
                // El item debe estar marcado como descargado
                if (!item.descargado) return false;
                // El item debe pertenecer a la venta actual (por subcategoria)
                return venta.detalles.some(
                    det => String(det.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId._id)
                );
            })
            .map(item => item._id);

        if (!isCompleted(rutaDespacho)) {
            console.log("Eeeeepa!");
            setLoadingState(-1);
            return;
        }

        const response = await fetch("/api/pedidos/confirmarDescarga", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id,
                scanCodes
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al guardar el cargamento: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Descarga confirmada con éxito`, {
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
        const direccionActualId = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId._id;
        const ventaActual = rutaDespacho.ventaIds.find(
            v => v.direccionDespachoId === direccionActualId
        );
        const subcategorias = ventaActual?.detalles.map(det => det.subcategoriaCatalogoId._id) || [];
        
        // Encontrar el item que corresponde al código escaneado
        const itemIndex = rutaDespacho.cargaItemIds.findIndex(
            cargaItem => cargaItem.codigo === codigo && subcategorias.includes(cargaItem.subcategoriaCatalogoId._id)
        );

        if (itemIndex === -1) {
            toast.error(`Código ${codigo} no pertenece a ésta entrega`, {
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
                if (codigo === "x") {
                    setScanMode(false);
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (temporalRef.current)
                            temporalRef.current.focus();
                    }, 0);
                    return;
                }
                descargarItem(codigo);
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
    }, [scanMode, descargarItem, temporalRef]);

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

    useOnVisibilityChange(() => {
        const fetch = async () => {
            setLoadingState(-2);
            fetchRutaAsignada();
        }
        fetch('/api/ventas/lastUpdate')
            .then(res => res.json())
            .then(data => {
                if (data.ok && data.updatedAt) {
                    const updatedAt = new Date(data.updatedAt);
                    if (updatedAt > lastUpdate) {
                        setLastUpdate(updatedAt);
                        fetch();
                    }
                }
            })
            .catch(() => {});
    });

    const getDireccionById = (direccionDespachoId) => {
        if (!rutaDespacho || !rutaDespacho.ventaIds) return null;
        for (const venta of rutaDespacho.ventaIds) {
            const cliente = venta.clienteId;
            if (!cliente?.direccionesDespacho) continue;
            for (const dir of cliente.direccionesDespacho) {
                if (dir.direccionId && dir.direccionId._id === direccionDespachoId) {
                    return dir.direccionId;
                }
            }
        }
        return null;
    }

    // Devuelve el estado visual de cada cilindro en el camión según historial de carga y estado actual
    const cargaActual = (rutaDespacho) => {
        if (!rutaDespacho || !Array.isArray(rutaDespacho.cargaItemIds)) return [];

        // Determina la última dirección de la ruta
        const ultimaDireccionId = rutaDespacho.ruta?.length
            ? rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId?._id || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId
            : null;

        // Busca la venta correspondiente a esa dirección
        const ventaActual = rutaDespacho.ventaIds?.find(
            v => String(v.direccionDespachoId) === String(ultimaDireccionId)
        );

        // Obtén los IDs de los items descargados según hitorialCarga
        const descargadosSet = new Set();
        if (Array.isArray(rutaDespacho.hitorialCarga)) {
            rutaDespacho.hitorialCarga.forEach(hist => {
                if (!hist.esCarga && Array.isArray(hist.itemMovidoIds)) {
                    hist.itemMovidoIds.forEach(id => descargadosSet.add(id));
                }
            });
        }

        return rutaDespacho.cargaItemIds.map(item => {
            let estado = "cargado"; // default

            // Si el item está en el historial de descarga, está entregado
            if (descargadosSet.has(item._id)) {
                estado = "entregado";
            } else if (
                rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga &&
                ventaActual &&
                ventaActual.detalles.some(
                    det => String(det.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId._id)
                )
            ) {
                // Solo los items que pertenecen a la venta de la última dirección están "descargando"
                estado = "descargando";
            }

            return {
                elemento: item.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
                estado
            };
        });
    }

    useEffect(() => {
        console.log("Ruta despacho actualizada:", rutaDespacho);
    }, [rutaDespacho]);

    return (
        <div className="w-full h-dvh overflow-hidden">
            
            <div className={`w-full ${loadingState == -2 || !rutaDespacho || loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga || !rutaDespacho.vehiculoId ? "opacity-20" : ""}`}>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <Image
                        className="absolute top-6 left-4"
                        src="/ui/camion.png"
                        alt="camion_atras"
                        width={355}
                        height={275}
                        style={{ width: "90%", height: "auto" }}
                        priority
                    />
                    <div className="absolute top-6 mt-2 w-full">
                        {cargaActual(rutaDespacho).reverse().map((item, index) => {
                            console.log("Item cargado:", item);
                            // Deducción de descargado usando hitorialCarga                                                        
                            const elem = item.elemento;
                            return (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                    alt={`tank_${index}`}
                                    width={14 * 4}
                                    height={78 * 4}
                                    className={`absolute ${item.estado === "descargando" ? "opacity-40" : item.estado === "entregado" ? "opacity-0" : "opacity-100"}`}
                                    style={calculateTubePosition(rutaDespacho?.cargaItemIds.length - index - 1)}
                                    priority={false}
                                />
                            );
                        })}
                    </div>
                    <Image
                        className="absolute top-6"
                        src="/ui/camion_front.png"
                        alt="camion"
                        width={328}
                        height={254}
                        style={{ width: "90%", height: "auto" }}
                    />
                    {rutaDespacho && rutaDespacho.vehiculoId && <div className="absolute top-20 left-40 mt-8" style={{ transform: "translate(0px, 0px) skew(0deg, -20deg) scale(1.5)" }}>
                        <div className="ml-6 text-slate-800">
                            <p className="text-xs font-bold">{rutaDespacho.vehiculoId.patente || ""}</p>
                            <p className="text-xs">{rutaDespacho.vehiculoId.marca || ""}</p>
                        </div>
                    </div>}

                    {rutaDespacho && (rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada) && <div className="absolute top-6 left-0 mt-2 w-full">
                        {getCilindrosDescarga(rutaDespacho).reverse().map((elemento, index) => { 
                            return (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${getColorEstanque(elemento)}.png`}
                                    alt={`tank_${index}`}
                                    width={14 * 3}
                                    height={78 * 3}
                                    className={`absolute ${rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada ? "" : "opacity-40"}`}
                                    style={calculateUploadTubePosition(getCilindrosDescarga(rutaDespacho).length - index - 1)}
                                    priority={false}
                                />
                            )
                        })}
                    </div>}
                </div>
            </div>
            

            {loadingState != -2 && rutaDespacho && <div className="w-full absolute bottom-0 right-0 flex items-center justify-center">


                {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada) && (
                        <div className="w-full py-2 px-2 border rounded-t-xl shadow-lg bg-white mx-2 -mb-1">
                            <MdOutlineKeyboardDoubleArrowUp className="text-gray-400 mx-auto -mt-1 mb-1" style={{ transform: "scaleX(6)" }} />
                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && <div className="py-4 text-center">
                                <div className="py-4">
                                    <Loader texto="EN PROCESO DE CARGA" />
                                </div>                                
                                <p className="mx-auto my-4 px-4">{rutaDespacho.encargado} esta cargando. Pronto podrás iniciar tu viaje.</p>                                
                            </div>}

                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada && <div className="w-full">
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
                                <button className={`w-full text-center h-10 px-4 bg-green-400 text-white rounded-lg shadow-md cursor-pointer mb-4 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada ? "opacity-50 cursor-not-allowed" : ""}`}
                                    onClick={handleCargaConfirmada}>
                                    {loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada 
                                        ? <div className="mt-0"><Loader texto="CONFIRMANDO" /></div> 
                                        : <div className="flex justify-center"><FaFlagCheckered className="mt-1 mr-3" /><span className="mt-0">CONFIRMAR CARGA</span></div>}
                                </button>
                            </div>}
                        </div>
                    )}

                {rutaDespacho.estado >= TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                    && rutaDespacho.estado < TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada
                    && (<div className="w-full text-center mt-4 mx-6">

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta && loadingState != TIPO_ESTADO_RUTA_DESPACHO.descarga && <div><button
                            className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md mb-4 h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'opacity-50' : ''}`}
                            onClick={() => handleHeLlegado()}>
                            <FaFlagCheckered className="mt-1 mr-2" /><span>HE LLEGADO</span>
                            {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga &&
                                <div className="absolute -mt-1">
                                    <Loader texto="REPORTANDO" />
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
                            && (rutaDespacho.estado >= TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada &&
                                rutaDespacho.estado <= TIPO_ESTADO_RUTA_DESPACHO.en_ruta) 
                            && <div className="flex flex-row items-start justify-center gap-3 mb-6">
                                <div className="flex flex-col items-center mt-1 ml-2">
                                    <TbFlagCheck className="text-xl mb-4 w-6" />
                                    {/* Línea y puntos */}
                                    {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="h-12" key={`ruta_${indexRuta}`}>
                                        <div className="h-4" />
                                        {ruta.fechaArribo ? <TbFlagCheck className="text-xl mt-1" /> : <FaTruckFast className="text-xl mt-1 w-6" />}
                                        </div>))}
                                </div>
                                <div className="flex flex-col items-center justify-start h-full">
                                    {/* Camino vertical */}                                    
                                    <div className="flex flex-col items-center mt-1">
                                        {/* Punto lleno */}
                                        <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                                        {/* Línea vertical */}
                                        {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="w-6" key={`ruta_${indexRuta}`}>
                                        <div className="w-2 h-10 bg-blue-400 -mt-1 -mb-2 mx-auto" />
                                        {/* Punto hueco */}
                                        <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-400" /></div>))}
                                    </div>
                                </div>
                                <div className="w-full text-left -mt-3">
                                    <div className="w-full flex mt-1 h-12 items-center">
                                        <BsFillGeoAltFill size="1.1rem" className="w-4"/><span className="text-sm ml-2">Barros Arana</span>
                                    </div>
                                    {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div key={`ruta_${indexRuta}`} className="flex mt-1 h-12 items-center overflow-hidden">
                                        <BsFillGeoAltFill size="1.1rem" className="w-4"/>
                                        <span className="text-xs ml-2 w-36">{ruta.direccionDestinoId.nombre.split(",").slice(0, 3).join(",")}</span>
                                        {indexRuta == rutaDespacho.ruta.length - 1 && <button
                                            className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
                                            onClick={() => {
                                                const destino = `${ruta.direccionDestinoId.latitud},${ruta.direccionDestinoId.longitud}`;
                                                // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                                                window.open(
                                                    `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
                                                    "_blank"
                                                );
                                            }}
                                        >
                                            <FaMapLocationDot className="w-7 -ml-0.5" size="1.5rem" />
                                        </button>}
                                    </div>))}
                                </div>
                            </div>}

                    {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                        || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada) 
                        && rutaDespacho.ruta.length < rutaDespacho.ventaIds.length && (
                            <div className="flex mt-1">
                                <select
                                    className="border rounded-md shadow-sm w-full py-2 px-1 mb-2"
                                    onChange={(e) => {
                                        const direccionId = e.target.value;
                                        if (!direccionId) {
                                            setRutaDespacho({
                                                ...rutaDespacho,
                                                ruta: rutaDespacho.ruta.slice(0, -1)
                                            });
                                        } else {
                                            const rutaSinArriboIdx = rutaDespacho.ruta.findIndex(r => r.fechaArribo === null);
                                            if (rutaSinArriboIdx !== -1) {
                                                // Si existe una ruta con fechaArribo null, actualiza su direccionDestinoId
                                                setRutaDespacho({
                                                    ...rutaDespacho,
                                                    ruta: rutaDespacho.ruta.map((r, idx) =>
                                                        idx === rutaSinArriboIdx
                                                            ? { ...r, direccionDestinoId: getDireccionById(direccionId) }
                                                            : r
                                                    )
                                                });
                                            } else {
                                                // Si no existe, agrega una nueva
                                                setRutaDespacho({
                                                    ...rutaDespacho,
                                                    ruta: [
                                                        ...rutaDespacho.ruta,
                                                        { direccionDestinoId: getDireccionById(direccionId), fechaArribo: null }
                                                    ]
                                                });
                                            }
                                        }
                                    }}
                                >
                                    <option value="">{rutaDespacho.ruta.some(r => r.fechaArribo === null) ? "Cambiar tu selección" : "Selecciona un destino"}</option>
                                    {rutaDespacho.ventaIds
                                        .flatMap(venta =>
                                            venta.clienteId.direccionesDespacho
                                                .filter(dir => {
                                                    // Excluir direcciones ya entregadas (fechaArribo != null en la ruta)
                                                    const entregada = rutaDespacho.ruta.some(
                                                        r => r.direccionDestinoId._id === dir.direccionId._id && r.fechaArribo != null
                                                    );
                                                    // Excluir si ya está en la ruta pendiente de entrega
                                                    const yaEnRutaPendiente = rutaDespacho.ruta.some(
                                                        r => r.direccionDestinoId._id === dir.direccionId._id && r.fechaArribo == null
                                                    );
                                                    return !entregada && !yaEnRutaPendiente;
                                                })
                                                .map(dir => ({
                                                    ventaId: venta._id,
                                                    clienteNombre: venta.clienteId.nombre,
                                                    direccion: dir
                                                }))
                                        )
                                        .map(({ ventaId, clienteNombre, direccion }) => (
                                            <option key={`venta_${ventaId}_dir_${direccion._id}`} value={direccion.direccionId._id}>
                                                {clienteNombre}|{direccion.direccionId.nombre}
                                            </option>
                                        ))}
                                </select>
                            </div>)}

                        {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                            || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                            || rutaDespacho.ventaIds.filter(v => v.estado === TIPO_ESTADO_VENTA.entregado).length === rutaDespacho.ruta?.length) && <div className="flex flex-row items-center justify-center">
                            <button className={`flex w-full justify-center h-10 px-4 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer mb-4 ${loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta || rutaDespacho.ruta.length == 0 || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].fechaArribo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleIniciarViaje}
                                disabled={rutaDespacho.ruta.length == 0 || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].fechaArribo}>
                                {loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? <div className="mt-1"><Loader texto="INICIANDO" /></div> : <div className="flex"><FaFlagCheckered className="mt-3 mr-3" />
                                    <span className="mt-2">INICIAR VIAJE</span>
                                </div>}
                            </button>
                        </div>}                        

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga && (<>
                            <div className="w-full flex justify-center mb-2">
                                {(() => {
                                    const cliente = getClientedescarga(rutaDespacho);
                                    // Busca la venta actual por dirección
                                    const currentDireccionId = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId?._id || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId;
                                    const ventaActual = rutaDespacho.ventaIds.find(v => String(v.direccionDespachoId) === String(currentDireccionId));
                                    return (
                                        <div className="w-full flex items-center justify-between px-2 py-1 border border-gray-300 rounded-lg bg-white">
                                            <div className="w-10/12">
                                                <p className="text-xs font-bold text-gray-500 truncate">{cliente?.nombre || "Sin cliente"}</p>
                                                <p className="flex text-xs text-gray-500">
                                                    {/* Si tienes teléfono, agrégalo aquí */}
                                                </p>
                                            </div>
                                            <div className={`w-2/12 flex justify-end ${ventaActual?.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                                                <div className="mr-2 cursor-pointer mt-0" onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast.info(`${ventaActual?.comentario || "Sin comentarios"}`);
                                                }}>
                                                    {!ventaActual?.comentario
                                                        ? <VscCommentDraft size="1.75rem" />
                                                        : <VscCommentUnresolved size="1.75rem" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <ul className="flex-1 flex flex-wrap items-center justify-center mt-2 mb-20">                                
                                {getResumenDescarga(rutaDespacho).map((item, idx) => (
                                    <li
                                        key={`item_${idx}`}
                                        className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && getResumenDescarga(rutaDespacho).length != 1) ? 'rounded-t-lg' : (idx === getResumenDescarga(rutaDespacho).length - 1 && getResumenDescarga(rutaDespacho).length != 1) ? 'rounded-b-lg' : getResumenDescarga(rutaDespacho).length === 1 ? 'rounded-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
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
                        </>)}

                        {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga && (!inputTemporalVisible ? <div className="absolute bottom-3 flex w-full pr-8">
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
                        </div> :
                            <div className="w-full pb-4">
                                <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
                                <input
                                    ref={temporalRef}
                                    type="text"
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            console.log("Código temporal ingresado:", e.target.value);
                                            setInputTemporalVisible(false);
                                            descargarItem(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>)}
                    </div>)}


                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada && <div className="w-full px-6 py-4 bg-white mx-auto">
                    <h2 className="text-xl font-bold mb-4">Datos de facturación</h2>
                    <div className="flex flex-col md:flex-row text-left">
                        <label htmlFor="rut" className="text-xs">RUT:</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                            placeholder="RUT (opcional)*"                                    
                        />
                        <label htmlFor="nombre" className="text-xs mt-4">Nombre quien recibe:</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                            placeholder="Nombre quien recibe"                                    
                        />
                        <button
                            className={`relative w-full flex items-center bg-gray-400 text-white font-bold rounded-lg px-6 py-2 shadow-md justify-center mt-4 transition-all duration-200 ${loadingState === TIPO_ESTADO_RUTA_DESPACHO.imprimiendo ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={loadingState === TIPO_ESTADO_RUTA_DESPACHO.imprimiendo}
                            onClick={async () => {
                                setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.imprimiendo);
                                // Aquí va la lógica de impresión, por ejemplo:
                                // await imprimirFactura();                                
                                setRutaDespacho({
                                    ...rutaDespacho,
                                    estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                                })                                    
                                setLoadingState(-1);
                            }}
                        >
                            <FaPrint className="mr-2" /><span>Imprimir factura</span>
                            {loadingState === TIPO_ESTADO_RUTA_DESPACHO.imprimiendo && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="absolute inset-0 bg-white opacity-70 rounded-lg"></div>
                                    <Loader texto="" />
                                </div>
                            )}
                        </button>
                    </div>
                </div>}

                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino && rutaDespacho.ruta.filter(r => r.fechaArribo != null).length == rutaDespacho.ventaIds.length && <div className="w-full px-6 mb-4 bg-white mx-auto">
                    <button
                        className={`w-full flex justify-center mt-4 py-3 bg-green-400 text-white font-bold rounded-lg shadow-md h-12`}
                        onClick={handleGoingBackToBase}>
                        <TbHomeShare className="text-2xl mt-0 mr-2" /><span>REGRESO A BASE</span>
                    </button>
                </div>}

                {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso && loadingState == -1 && <div className="absolute bottom-4 flex w-full px-4">
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

            </div>}


            {loadingState == -1 && !rutaDespacho && (
                <div className="w-full py-6 px-12 mt-64 bg-white mx-auto">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                    <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
                </div>
            )}

            {loadingState == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center z-10">
                <div className="absolute w-full h-screen bg-white/80"></div>
                <div className="flex items-center justify-center bg-white roounded-lg shadow-lg p-4 z-20 text-xl">
                    <Loader texto="CARGANDO PEDIDOS" />
                </div>
            </div>}

            <ToastContainer />

            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
            />


            {vehiculos?.length > 0 && !loadingChecklist && !checkListPassed && <CheckList session={session} onFinish={onFinish} vehiculos={vehiculos} tipo={TIPO_CHECKLIST.vehiculo} loading={endingChecklist}/>}
        </div>
    );
}
