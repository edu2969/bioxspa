"use client";

import { useCallback, useEffect, useState } from "react";
import { BsFillGeoAltFill, BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import Loader from "./Loader";
import { socket } from "@/lib/socket-client";
import { FaClipboardCheck, FaPhoneAlt } from "react-icons/fa";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRef } from "react";
import dayjs from "dayjs";
import 'dayjs/locale/es';
import Image from "next/image";
import { getNUCode } from "@/lib/nuConverter";
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { VscCommentUnresolved, VscCommentDraft } from "react-icons/vsc";
import { getColorEstanque } from "@/lib/uix";
import { TIPO_ESTADO_ITEM_CATALOGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA, TIPO_ITEM_CATALOGO, TIPO_ORDEN } from "@/app/utils/constants";
import { LiaPencilAltSolid, LiaTimesSolid } from 'react-icons/lia';
import { IoIosWarning } from "react-icons/io";
import reproducirSonido from '@/app/utils/sounds';

export default function JefaturaDespacho({ session }) {
    const [cargamentos, setCargamentos] = useState([]);
    const [animating, setAnimating] = useState(false);
    const [scanMode, setScanMode] = useState(false);
    const [showModalCilindroErroneo, setShowModalCilindroErroneo] = useState(false);
    const [itemCatalogoEscaneado, setItemCatalogoEscaneado] = useState(null);
    const hiddenInputRef = useRef(null);
    const temporalRef = useRef(null);
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const [posting, setPosting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [moverCilindro, setMoverCilindro] = useState(false);
    const [corrigiendo, setCorrigiendo] = useState(false);
    const [alMenosUnEscaneado, setAlMenosUnEscaneado] = useState(false);
    const [showModalNombreRetira, setShowModalNombreRetira] = useState(false);
    const [nombreRetira, setNombreRetira] = useState("");
    const [rutRetiraNum, setRutRetiraNum] = useState("");
    const [rutRetiraDv, setRutRetiraDv] = useState("");
    const [modalConfirmarCargaParcial, setModalConfirmarCargaParcial] = useState(false);

    function getEstadoItemCatalogoLabel(value) {
        return {
            [TIPO_ESTADO_ITEM_CATALOGO.no_aplica]: "No aplica",
            [TIPO_ESTADO_ITEM_CATALOGO.en_mantenimiento]: "En mantenimiento",
            [TIPO_ESTADO_ITEM_CATALOGO.en_arriendo]: "En arriendo",
            [TIPO_ESTADO_ITEM_CATALOGO.en_garantia]: "En garantía",
            [TIPO_ESTADO_ITEM_CATALOGO.vacio]: "Vacío",
            [TIPO_ESTADO_ITEM_CATALOGO.en_llenado]: "En llenado",
            [TIPO_ESTADO_ITEM_CATALOGO.lleno]: "Lleno"
        }[value] || "Desconocido";
    }

    const postCargamento = async () => {
        if (!loadState().partial && !loadState().complete) {
            console.log("Eeeeepa!");
            return;
        }
        const response = await fetch(`/api/pedidos/despacho${cargamentos[0].rutaId ? "" : "/confirmarEntregaEnLocal"}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(cargamentos[0].rutaId ? {
                rutaId: cargamentos[0].rutaId
            } : {
                ventaId: cargamentos[0].ventas[0].ventaId,
                nombreRecibe: nombreRetira,
                rutRecibe: `${rutRetiraNum}-${rutRetiraDv}`
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al guardar el cargamento: ${errorData.error}`);
        } else {
            setAlMenosUnEscaneado(false);
            const detallesCompletados = cargamentos[0].ventas.every(venta =>
                venta.detalles.every(detalle =>
                    Array.isArray(detalle.itemCatalogoIds) &&
                    detalle.itemCatalogoIds.length >= detalle.multiplicador
                )
            );
            if (detallesCompletados) {
                handleRemoveFirst();
            } else if (cargamentos.length > 1) {
                if(cargamentos[0].rutaId == null) {
                    setCargamentos(prev => {
                        if (!prev.length) return prev;
                        const [first, ...rest] = prev;
                        // Si es retiro en local (rutaId == null)
                        let updatedFirst = first;
                        if (first.rutaId == null && first.ventas?.length > 0) {
                            const ventasActualizadas = first.ventas.map(venta => {
                                const codigosEscaneados = venta.detalles
                                    .flatMap(detalle => Array.isArray(detalle.itemCatalogoIds) ? detalle.itemCatalogoIds : []);
                                const entregas = Array.isArray(venta.entregasEnLocal) ? venta.entregasEnLocal : [];
                                const entregados = entregas.flatMap(e => Array.isArray(e.itemCargadoIds) ? e.itemCargadoIds : []);
                                const nuevosCodigos = codigosEscaneados.filter(codigo => !entregados.includes(codigo));
                                let nuevasEntregas = entregas;
                                if (nuevosCodigos.length > 0) {
                                    nuevasEntregas = [
                                        ...entregas,
                                        {
                                            nombreRecibe: first.nombreRetira || "",
                                            rutRecibe: first.rutRetira || "",
                                            itemCargadoIds: nuevosCodigos
                                        }
                                    ];
                                }
                                return {
                                    ...venta,
                                    entregasEnLocal: nuevasEntregas
                                };
                            });
                            updatedFirst = { ...first, ventas: ventasActualizadas };
                        }
                        // Solo actualiza el primero, el resto se mantiene igual
                        return [updatedFirst, ...rest];
                    });
                }
                if(cargamentos.length > 1) {
                    handleShowNext();
                }
            }
            handleRemoveFirst();
            toast.success(`Cargamento confirmado con éxito`);
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
        }
    }

    const handleRemoveFirst = async () => {
        if (animating) return; // Evita múltiples clics durante la animación
        setAnimating(true);
        setTimeout(() => {
            setCargamentos((prev) => prev.slice(1)); // Elimina el primer pedido después de la animación
            setAnimating(false);
            setScanMode(false);
        }, 1000);
    };

    const handleShowNext = () => {
        if (animating) return; // Evita múltiples clics durante la animación
        setAnimating(true);
        setTimeout(() => {
            setCargamentos((prev) => {
                if (prev.length <= 1) return prev;
                const [first, ...rest] = prev;
                return [...rest, first];
            });
            setAnimating(false);
            setScanMode(false);
        }, 1000); // Cambia el tiempo de la animación aquí
    }

    const handleScanMode = () => {
        setScanMode(!scanMode);
    };

    const loadState = () => {
        if (cargamentos.length === 0) return { complete: false, partial: false };
        const cargamento = cargamentos[0];
        const requiereQuienRecibe = cargamento?.retiroEnLocal ? (cargamento?.nombreRetira && cargamento?.rutRetira) : true;

        // Si hay al menos una venta de traslado
        const tieneTraslado = cargamento.ventas.some(v => v.tipo === TIPO_ORDEN.traslado);

        // Para traslado: solo es válido si items es un arreglo vacío
        if (tieneTraslado) {
            const itemsRetirados = Array.isArray(cargamento.items) && cargamento.items.length === 0;
            if (itemsRetirados && requiereQuienRecibe) {
                return { complete: true };
            }
            return {
                partial: false // No hay parcial para traslado
            };
        }

        // Para ventas normales
        const detallesCompletos = cargamento.ventas.every(venta =>
            venta.detalles.every(detalle => detalle.restantes === 0)
        );
        const itemsRetirados = !Array.isArray(cargamento.items) || cargamento.items.length === 0;

        if (detallesCompletos && itemsRetirados && requiereQuienRecibe) {
            return { complete: true };
        }
        return {
            partial: cargamentos.length > 0
                && requiereQuienRecibe
                && alMenosUnEscaneado
                && !itemsRetirados
        };
    }

    const [loadingCargamentos, setLoadingCargamentos] = useState(true);

    const fetchCargamentos = async () => {
        const response = await fetch("/api/pedidos/despacho");
        const data = await response.json();
        const carga = data.cargamentos;
        console.log("CARGAMENTOS", carga);

        // Actualiza scanCodes en los detalles correspondientes según subcategoriaCatalogoId de cada item en carga.items
        if (Array.isArray(carga) && carga.length > 0 && Array.isArray(carga[0].items)) {
            const items = carga[0].items;
            const ventas = carga[0].ventas;
            items.forEach(item => {
                ventas.forEach(venta => {
                    venta.detalles?.forEach(detalle => {
                        if (detalle.subcategoriaId === item.subcategoriaCatalogoId) {
                            if (!Array.isArray(detalle.itemCatalogoIds)) {
                                detalle.itemCatalogoIds = [];
                            }
                            if (!detalle.itemCatalogoIds.includes(item.itemId)) {
                                detalle.itemCatalogoIds.push(item.itemId);
                            }
                        }
                    });
                });
            });
        }

        setCargamentos(carga);

        // Determinar si hay elementos escaneados pero no entregados
        if (Array.isArray(carga) && carga.length > 0) {
            let hayEscaneadosNoEntregados = false;

            // Verificar si hay ventas en preparación (ya escaneadas pero no confirmadas)
            const algunoPorProcesar = carga[0].ventas?.some(v => v.estado === TIPO_ESTADO_VENTA.preparacion
                || v.tipo === TIPO_ORDEN.traslado);

            if (algunoPorProcesar) {
                hayEscaneadosNoEntregados = true;
            } else {
                // Verificar si hay itemCatalogoIds escaneados en los detalles
                const hayItemsEscaneados = carga[0].ventas?.some(venta =>
                    venta.detalles?.some(detalle =>
                        Array.isArray(detalle.itemCatalogoIds) && detalle.itemCatalogoIds.length > 0
                    )
                );

                // Para retiro en local, verificar si hay items escaneados que no están en entregasEnLocal
                if (carga[0].retiroEnLocal && hayItemsEscaneados) {
                    const hayNoEntregados = carga[0].ventas?.some(venta => {
                        const codigosEscaneados = venta.detalles
                            .flatMap(detalle => Array.isArray(detalle.itemCatalogoIds) ? detalle.itemCatalogoIds : []);

                        const entregas = Array.isArray(venta.entregasEnLocal) ? venta.entregasEnLocal : [];
                        const entregados = entregas.flatMap(e => Array.isArray(e.itemCargadoIds) ? e.itemCargadoIds : []);

                        // Hay códigos escaneados que no están en los entregados
                        return codigosEscaneados.some(codigo => !entregados.includes(codigo));
                    });

                    hayEscaneadosNoEntregados = hayNoEntregados;
                } else {
                    // Para rutas normales, si hay items escaneados significa que no han sido entregados
                    hayEscaneadosNoEntregados = hayItemsEscaneados;
                }
            }

            setAlMenosUnEscaneado(hayEscaneadosNoEntregados);
            console.log("Hay elementos escaneados no entregados?", hayEscaneadosNoEntregados);
        }

        setLoadingCargamentos(false);
    }

    const moverItem = useCallback(
        async (item, codigo) => {
            console.log("MOVIENDO ITEM", item);
            const cargamentoActual = cargamentos[0];
            if (!cargamentoActual) return false;

            // Verifica si el código ya fue escaneado en cualquier detalle de cualquier venta del primer cargamento
            if (item.tipo === TIPO_ITEM_CATALOGO.cilindro) {
                const codigoYaEscaneado = cargamentoActual.ventas.some(venta =>
                    venta.detalles.some(detalle =>
                        Array.isArray(detalle.itemCatalogoIds) && detalle.itemCatalogoIds.includes(item.itemId)
                    )
                );
                if (codigoYaEscaneado) {
                    toast.warn(`CODIGO ${codigo} ya escaneado`);
                    setScanMode(false);
                    reproducirSonido('/sounds/error_01.mp3');
                    return;
                }
            }

            // --- TIPO ORDEN: TRASLADO ---
            // Si la venta es de tipo traslado, el flujo es diferente
            const ventaTraslado = cargamentoActual.ventas.find(v => v.tipo === TIPO_ORDEN.traslado);
            if (ventaTraslado) {
                // El item debe estar en cargamentoActual.items
                const idxItem = cargamentoActual.items.findIndex(i => i._id === item.itemId);
                if (idxItem === -1) {
                    toast.warn(`CODIGO ${codigo} no corresponde a este traslado`);
                    setScanMode(false);
                    setShowModalCilindroErroneo(true);
                    reproducirSonido('/sounds/error_01.mp3');
                    return;
                }

                // Llama a la API de descarga (igual que Conductor.jsx)
                const response = await fetch("/api/cilindros/descargar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rutaDespachoId: cargamentoActual.rutaId,
                        codigo
                    }),
                });

                if (response.ok) {
                    // Elimina el item de cargamentoActual.items y suma a detalles de la venta
                    setCargamentos((prev) => {
                        if (!prev.length) return prev;
                        const newCargamentos = [...prev];
                        const currentCargamento = { ...newCargamentos[0] };

                        // Quitar el item de items (camión visual)
                        currentCargamento.items = currentCargamento.items.filter(i => i._id !== item.itemId);

                        // Buscar la venta de traslado
                        const ventas = [...currentCargamento.ventas];
                        const ventaIdx = ventas.findIndex(v => v.tipo === TIPO_ORDEN.traslado);
                        if (ventaIdx !== -1) {
                            const detalles = Array.isArray(ventas[ventaIdx].detalles) ? [...ventas[ventaIdx].detalles] : [];

                            // Buscar si ya existe un detalle para esta subcategoría
                            let detalleIdx = detalles.findIndex(
                                d => d.subcategoriaId === item.subcategoria._id ||
                                     (typeof d.subcategoriaId === "object" && d.subcategoriaId?._id === item.subcategoria._id)
                            );

                            // Si existe, actualiza el detalle sumando el itemId a itemCatalogoIds y ajustando los contadores
                            if (detalleIdx !== -1) {
                                const detalle = { ...detalles[detalleIdx] };
                                // Evitar duplicados
                                const itemCatalogoIds = Array.isArray(detalle.itemCatalogoIds)
                                    ? [...detalle.itemCatalogoIds]
                                    : [];
                                if (!itemCatalogoIds.includes(item.itemId)) {
                                    itemCatalogoIds.push(item.itemId);
                                }
                                // Actualiza multiplicador y restantes
                                const multiplicador = (detalle.multiplicador || 0) + 1;
                                const restantes = Math.max((detalle.restantes || 1) - 1, 0);

                                detalles[detalleIdx] = {
                                    ...detalle,
                                    itemCatalogoIds,
                                    multiplicador,
                                    restantes,
                                };
                            } else {
                                // Si no existe, crea un nuevo detalle para esta subcategoría
                                detalles.push({
                                    ...item,
                                    subcategoriaId: item.subcategoria._id,
                                    itemCatalogoIds: [item.itemId],
                                    restantes: 0,
                                    multiplicador: 1,
                                    nombre: item.subcategoria.nombre,
                                    cantidad: item.subcategoria.cantidad,
                                    unidad: item.subcategoria.unidad,
                                    elemento: item.categoria.elemento,
                                    esIndustrial: item.categoria.esIndustrial,
                                    sinSifon: item.subcategoria.sinSifon,
                                    nuCode: getNUCode(item.categoria.elemento),
                                });
                            }

                            ventas[ventaIdx] = { ...ventas[ventaIdx], detalles };
                        }
                        currentCargamento.ventas = ventas;
                        newCargamentos[0] = currentCargamento;
                        return newCargamentos;
                    });
                    reproducirSonido('/sounds/accept_01.mp3');
                    toast.success(`Cilindro ${item.codigo} descargado`);
                } else {
                    reproducirSonido('/sounds/error_02.mp3');
                    const data = await response.json();
                    toast.error(`Código: ${item.codigo} ${data.error || 'Error desconocido!!'}`);
                }
                setScanMode(false);
                return;
            }

            // --- TIPO ORDEN: VENTA NORMAL ---
            // Buscar la venta y el detalle que corresponde al subcategoriaCatalogoId
            let ventaIndex = -1;
            let detalleIndex = -1;

            cargamentoActual.ventas.forEach((venta, vIdx) => {
                venta.detalles.forEach((detalle, dIdx) => {
                    if (
                        detalle.subcategoriaId === item.subcategoria._id &&
                        detalle.restantes > 0
                    ) {
                        ventaIndex = vIdx;
                        detalleIndex = dIdx;
                    }
                });
            });

            if (ventaIndex === -1 || detalleIndex === -1) {
                setScanMode(false);
                setShowModalCilindroErroneo(true);
                toast.warn(
                    `CODIGO ${codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} no corresponde a este pedido`
                );
                reproducirSonido('/sounds/error_01.mp3');
                return;
            }

            if (item.estado === TIPO_ESTADO_ITEM_CATALOGO.vacio && item.tipo === TIPO_ITEM_CATALOGO.cilindro) {
                setScanMode(false);
                setShowModalCilindroErroneo(true);
                toast.warn(
                    `CODIGO ${codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} cilindro vacío`
                );
                reproducirSonido('/sounds/error_02.mp3');
                return;
            }

            if(item.direccionInvalida && item.tipo === TIPO_ITEM_CATALOGO.cilindro) {
                setScanMode(false);
                setEditMode(false);
                setShowModalCilindroErroneo(true);
                reproducirSonido('/sounds/error_02.mp3');
                return;
            }

            const response = await fetch(`/api/${item.tipo === TIPO_ITEM_CATALOGO.cilindro ? 'cilindros' : 'insumos'}/cargar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ventaId: cargamentoActual.ventas[ventaIndex].ventaId,
                    rutaDespachoId: cargamentoActual.rutaId,
                    itemId: item.itemId,
                }),
            });

            if (response.ok) {
                if(!alMenosUnEscaneado) setAlMenosUnEscaneado(true);
                setCargamentos((prev) => {
                    if (!prev.length) return prev;
                    const newCargamentos = [...prev];
                    const currentCargamento = { ...newCargamentos[0] };
                    // Quitar el item de items (para ventas normales también debe desaparecer del camión visual)
                    currentCargamento.items = currentCargamento.items.filter(i => i.itemId !== item.itemId);
                    const ventas = [...currentCargamento.ventas];
                    const detalles = [...ventas[ventaIndex].detalles];
                    const detalleToUpdate = { ...detalles[detalleIndex] };

                    // Evitar duplicados en itemCatalogoIds
                    const itemCatalogoIds = Array.isArray(detalleToUpdate.itemCatalogoIds)
                        ? [...detalleToUpdate.itemCatalogoIds]
                        : [];
                    if (!itemCatalogoIds.includes(item.itemId)) {
                        itemCatalogoIds.push(item.itemId);
                    }

                    // Actualiza restantes y multiplicador si corresponde
                    const updatedRestantes =
                        detalleToUpdate.restantes > 0
                            ? detalleToUpdate.restantes - 1
                            : 0;
                    // El multiplicador no cambia aquí, solo los restantes

                    const newDetalle = {
                        ...detalleToUpdate,
                        restantes: updatedRestantes,
                        itemCatalogoIds,
                    };
                    detalles[detalleIndex] = newDetalle;
                    ventas[ventaIndex] = { ...ventas[ventaIndex], detalles };
                    currentCargamento.ventas = ventas;
                    newCargamentos[0] = currentCargamento;
                    return newCargamentos;
                });
                reproducirSonido('/sounds/accept_01.mp3');                
                toast.success(
                    `Cilindro ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre.toLowerCase()} cargado`
                );
            } else {
                reproducirSonido('/sounds/error_01.mp3');
                const data = await response.json();
                toast.error(`Código: ${item.codigo} ${data.error || 'Error desconocido!'}`);
            }
        },
        [setCargamentos, cargamentos, alMenosUnEscaneado, setAlMenosUnEscaneado, setScanMode]
    );

    useEffect(() => {
        console.log("cargamentos updated:", cargamentos);
    }, [cargamentos]);

    useEffect(() => {
        fetchCargamentos();
    }, []);

    const scanItem = useCallback(async (codigo) => {
        setPosting(true);
        try {
            const response = await fetch(`/api/pedidos/despacho/scanItemCatalogo?codigo=${codigo}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al escanear el código");
            }
            const data = await response.json();
            setItemCatalogoEscaneado(data);
            moverItem(data, codigo);
        } catch {
            toast.error(`Cilindro ${codigo} no existe`);
            reproducirSonido('/sounds/error_01.mp3');
            return;
        } finally {
            setPosting(false);
        }
    }, [moverItem, setItemCatalogoEscaneado]);

    useEffect(() => {
        const handleTextInput = (e) => {
            if (scanMode) {
                const codigo = e.data;
                console.log("Código escaneado:", codigo);
                if (codigo === "x") {
                    setScanMode(false);
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (temporalRef.current)
                            temporalRef.current.focus();
                    }, 0);
                    return;
                }
                scanItem(codigo);
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
    }, [scanMode, moverItem, scanItem, temporalRef]);

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
    }, [session]); // Dependencia de session para que se ejecute cuando cambie

    // Mantén tu efecto existente para escuchar "update-pedidos"
    useEffect(() => {
        socket.on("update-pedidos", () => {
            fetchCargamentos();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, []);

    const handleUpdateItem = async (item) => {
        setCorrigiendo(true);
        try {
            const response = await fetch("/api/items/corregir", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: item.itemId,
                    estado: item.estado || TIPO_ESTADO_ITEM_CATALOGO.no_aplica,
                    reubicar: moverCilindro,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(`Error al corregir: ${data.error || "Error desconocido"}`);
            } else {
                setShowModalCilindroErroneo(false);
                setMoverCilindro(false);
                item.direccionInvalida = false;
                moverItem(item, item.codigo);
                setItemCatalogoEscaneado(null);
            }
        } catch {
            toast.error("Error de red al corregir cilindro");
        } finally {
            setEditMode(true);
            setCorrigiendo(false);
        }
    }

    const getDetailTitle = (detalle) => {
        if(detalle.nombre.substring(0,4).toLowerCase() === "rack") {
            return "Rack";
        }
        return detalle.nombre.split(" ")[0];
    }

    const getDetailSubtitle = (detalle) => {
        if(detalle.nombre.substring(0,4).toLowerCase() === "rack") {
            const partes = detalle.nombre.toLowerCase().split(" ");
            const index = partes.findIndex(p => p === "cilindros") - 1;
            return `${partes[index] || "??"}`;
        } else if(detalle.nombre.includes("Insumos")) {
            return detalle.nombre.split("-")[1] || "??";
        }
        return detalle.nombre;
    }

    const getAditionalInfo = (detalle) => {
        if(detalle.nombre.toLowerCase().includes("insumos")) {
            return detalle.nombre.split("-")[2] || "??";
        }
        return "";
    }

    // Calcula el porcentaje de avance para rutas de traslado/descarga
    const getPorcentajeAvance = () => {
        if (cargamentos.length === 0) return 0;
        const cargamento = cargamentos[0];

        // Agrupa por subcategoriaId para sumar correctamente
        const itemsPorSubcat = {};
        if (Array.isArray(cargamento.items)) {
            cargamento.items.forEach(item => {
                const key = item.subcategoriaId?._id || item.subcategoriaId;
                if (!key) return;
                if (!itemsPorSubcat[key]) itemsPorSubcat[key] = 0;
                itemsPorSubcat[key]++;
            });
        }

        const detallesPorSubcat = {};
        if (Array.isArray(cargamento.ventas)) {
            cargamento.ventas.forEach(venta => {
                if (Array.isArray(venta.detalles)) {
                    venta.detalles.forEach(detalle => {
                        const key = detalle.subcategoriaId?._id || detalle.subcategoriaId;
                        if (!key) return;
                        if (!detallesPorSubcat[key]) detallesPorSubcat[key] = 0;
                        if (Array.isArray(detalle.itemCatalogoIds)) {
                            detallesPorSubcat[key] += detalle.itemCatalogoIds.length;
                        }
                    });
                }
            });
        }

        // Unifica todas las subcategorías presentes
        const todasLasSubcats = Array.from(
            new Set([
                ...Object.keys(itemsPorSubcat),
                ...Object.keys(detallesPorSubcat)
            ])
        );

        // Suma total y cargados
        let total = 0;
        let cargados = 0;
        todasLasSubcats.forEach(key => {
            const enCamion = itemsPorSubcat[key] || 0;
            const yaCargados = detallesPorSubcat[key] || 0;
            total += enCamion + yaCargados;
            cargados += yaCargados;
        });

        if (total === 0) return 100;
        return Math.round((cargados / total) * 100);
    }

    const handleGuardarNombreRetira = () => {
        setCargamentos(prev => {
            if (!prev.length) return prev;
            const nuevos = [...prev];
            nuevos[0] = {
                ...nuevos[0],
                nombreRetira: nombreRetira,
                rutRetira: `${rutRetiraNum}-${rutRetiraDv}`
            };
            return nuevos;
        });
        setNombreRetira("");
        setRutRetiraNum("");
        setRutRetiraDv("");
        setShowModalNombreRetira(false);
    };

    // Devuelve un resumen agrupado por subcategoriaId, combinando items y detalles para mostrar el conteo correcto
    const getResumenCarga = (cargamento) => {
        if (!cargamento) return [];

        // Paso 1: Agrupa los items por subcategoriaId (puede venir como string o como objeto)
        const itemsPorSubcat = {};
        if (Array.isArray(cargamento.items)) {
            cargamento.items.forEach(item => {
                const key = item.subcategoriaId?._id || item.subcategoriaId;
                if (!key) return;
                if (!itemsPorSubcat[key]) {
                    itemsPorSubcat[key] = [];
                }
                itemsPorSubcat[key].push(item);
            });
        }

        // Paso 2: Agrupa los detalles de venta por subcategoriaId
        const detallesPorSubcat = {};
        if (Array.isArray(cargamento.ventas)) {
            cargamento.ventas.forEach(venta => {
                if (Array.isArray(venta.detalles)) {
                    venta.detalles.forEach(detalle => {
                        const key = detalle.subcategoriaId?._id || detalle.subcategoriaId;
                        if (!key) return;
                        if (!detallesPorSubcat[key]) {
                            detallesPorSubcat[key] = [];
                        }
                        detallesPorSubcat[key].push(detalle);
                    });
                }
            });
        }

        // Paso 3: Unifica todas las subcategorías presentes en items o detalles
        const todasLasSubcats = Array.from(
            new Set([
                ...Object.keys(itemsPorSubcat),
                ...Object.keys(detallesPorSubcat)
            ])
        );

        // Paso 4: Para cada subcategoria, calcula los contadores correctamente
        const mapaFinal = todasLasSubcats.map(key => {
            // Preferir info de detalle si existe, si no, usar el primer item
            const detalle = detallesPorSubcat[key]?.[0];
            const itemEjemplo = itemsPorSubcat[key]?.[0];

            // Cantidad de items disponibles en el camión para esta subcategoría
            const itemsDisponibles = itemsPorSubcat[key]?.length || 0;

            // Cantidad ya cargada: contar itemCatalogoIds en todos los detalles de esa subcat
            let cargados = 0;
            if (detallesPorSubcat[key]) {
                cargados = detallesPorSubcat[key].reduce((acc, d) => {
                    if (Array.isArray(d.itemCatalogoIds)) {
                        return acc + d.itemCatalogoIds.length;
                    }
                    return acc;
                }, 0);
            }

            // MULTIPLICADOR: Total que se necesita = items disponibles + ya cargados
            // (porque los items van desapareciendo del camión conforme se cargan)
            const multiplicador = itemsDisponibles + cargados;

            // RESTANTES: lo que aún falta por cargar (items que están en el camión)
            const restantes = itemsDisponibles;

            // --- AJUSTE: Si el elemento es nulo, intenta obtenerlo desde el detalle ---
            let subcategoriaId = itemEjemplo?.subcategoriaId || detalle?.subcategoriaId || key;
            // Si subcategoriaId es un string, intenta buscar el objeto en detalle o itemEjemplo
            if (typeof subcategoriaId === "string") {
                if (detalle && typeof detalle.subcategoriaId === "object") {
                    subcategoriaId = detalle.subcategoriaId;
                } else if (itemEjemplo && typeof itemEjemplo.subcategoriaId === "object") {
                    subcategoriaId = itemEjemplo.subcategoriaId;
                }
            }
            // Si sigue sin tener categoriaCatalogoId o elemento, intenta buscar en detalle
            if (
                subcategoriaId &&
                (!subcategoriaId.categoriaCatalogoId || !subcategoriaId.categoriaCatalogoId.elemento)
            ) {
                if (
                    detalle &&
                    detalle.subcategoriaId &&
                    detalle.subcategoriaId.categoriaCatalogoId &&
                    detalle.subcategoriaId.categoriaCatalogoId.elemento
                ) {
                    subcategoriaId.categoriaCatalogoId = detalle.subcategoriaId.categoriaCatalogoId;
                } else if (
                    itemEjemplo &&
                    itemEjemplo.subcategoriaId &&
                    itemEjemplo.subcategoriaId.categoriaCatalogoId &&
                    itemEjemplo.subcategoriaId.categoriaCatalogoId.elemento
                ) {
                    subcategoriaId.categoriaCatalogoId = itemEjemplo.subcategoriaId.categoriaCatalogoId;
                }
            }

            // Devuelve un objeto resumen, usando la estructura de los items para mostrar info visual
            return {
                ...(itemEjemplo || detalle || {}),
                subcategoriaId,
                multiplicador,
                restantes,
            };
        });
        
        console.log("Resumen de carga calculado:", mapaFinal);
        return mapaFinal;
    }

    return (
        <div className="w-full h-screen" style={{ width: "100vw", maxWidth: "100vw", overflowX: "hidden", overflowY: "hidden" }}>
            <div className="w-full">

                {!loadingCargamentos && cargamentos && cargamentos.map((cargamento, index) => (
                    <div key={`cargamento_${index}`} className="flex flex-col h-full overflow-y-hidden">
                        <div className={`absolute w-11/12 md:w-9/12 h-[calc(100vh-114px)] bg-gray-100 shadow-lg rounded-lg p-1 ${animating ? "transition-all duration-500" : ""}`}
                            style={{
                                top: `${index * 10 + 52}px`,
                                left: `${index * 10 + 16}px`,
                                zIndex: cargamentos.length - index,
                                scale: 1 - index * 0.009,
                                transform: `translateX(${animating && index == 0 ? "-100%" : "0"})`,
                                opacity: animating && index == 0 ? 0 : 1,
                            }}
                        >
                            {cargamento.retiroEnLocal ? <div className="w-full flex text-xl font-bold px-3 py-1">
                                <div className="w-full flex text-lg font-bold px-3 relative">
                                    <div className="w-full relative">
                                        <p className="text-xs">Nombre de quién retira en local</p>
                                        <div className="mt-1 text-nowrap border border-gray-300 rounded px-2">
                                            <p className="-mt-1">{cargamento.nombreRetira || 'Desconocido'}</p>
                                            <p className="text-xs -mt-1">RUT: {cargamento.rutRetira || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-8 right-5 text-blue-500 flex items-center justify-end">
                                        <LiaPencilAltSolid className="cursor-pointer hover:text-blue-600" size="1.3rem" onClick={() => {
                                            setNombreRetira(cargamento.nombreRetira || "");
                                            setRutRetiraNum(cargamento.rutRetira ? cargamento.rutRetira.split("-")[0] : "");
                                            setRutRetiraDv(cargamento.rutRetira ? cargamento.rutRetira.split("-")[1] : "");
                                            setShowModalNombreRetira(true);
                                        }} />
                                    </div>
                                </div>
                            </div>: <div className="w-full flex text-xl font-bold px-3 py-1">
                                <div>
                                    <p className="text-xs">CHOFER</p>
                                    <p className="font-bold -mt-2 text-nowrap">{cargamento.nombreChofer.split(" ").splice(0, 2).join(" ")}</p>
                                </div>
                                <div className="w-full text-gray-500 mr-0 items-end flex justify-end">
                                    <div className="w-[76px] text-center bg-white rounded-md p-0.5">
                                        <div className="flex justify-start md:justify-start bg-white rounded-sm border-gray-400 border px-0.5 pb-0.5 space-x-0.5">
                                            <p className="font-bold text-sm">{cargamento.patenteVehiculo.substring(0, 2)}</p>
                                            <Image width={82} height={78} src="/ui/escudo.png" alt="separador" className="w-[9px] h-[9px]" style={{ "marginTop": "7px"}}/>
                                            <p className="font-bold text-sm">{cargamento.patenteVehiculo.substring(2, cargamento.patenteVehiculo.length)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>}

                            <div className="w-full h-[calc(100dvh-264px)] overflow-y-scroll">
                                {cargamento.ventas.map((venta, ventaIndex) => <div key={`venta_${ventaIndex}`} className="px-2 py-1 border-2 rounded-lg border-gray-300 mb-1 mr-1 bg-neutral-200">
                                    <div className="flex">
                                        <div className="w-10/12 pl-1">
                                            <p className="text-xs font-bold text-gray-600 truncate">{venta.cliente?.nombre || "Sin cliente"}</p>
                                            <p className="flex text-xs text-gray-500 mt-1">
                                                <FaPhoneAlt className="mr-1" /><span className="-mt-0.5 orbitron">{venta.cliente?.telefono || "Sin teléfono"}</span>
                                            </p>
                                        </div>
                                        <div key={`comentario_${ventaIndex}`} className={`w-2/12 flex justify-end ${venta.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                                            <div className="cursor-pointer mt-0" onClick={(e) => {
                                                e.stopPropagation();
                                                toast.info(`${venta.comentario || "Sin comentarios"}`);
                                            }}>
                                                {!venta.comentario ? <VscCommentDraft size="1.75rem" /> : <VscCommentUnresolved size="1.75rem" />}
                                            </div>
                                        </div>
                                    </div>

                                    {venta.detalles && <ul key={`detalles_${ventaIndex}`} className="flex-1 flex flex-wrap items-center justify-center mt-1">
                                        {venta.tipo === TIPO_ESTADO_VENTA.venta && venta.detalles.map((detalle, idx) => (
                                            <li
                                                key={`detalle_${ventaIndex}_${idx}`}
                                                className={`w-full flex text-sm border border-gray-300 px-0 ${(idx === 0 && venta.detalles.length != 1) ? 'rounded-t-lg' : (idx === venta.detalles.length - 1 && venta.detalles.length != 1) ? 'rounded-b-lg' : venta.detalles.length === 1 ? 'rounded-lg' : ''} ${detalle.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : detalle.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                            >
                                                {detalle.elemento && <div className="w-full flex items-left pt-1.5">
                                                    <div className="w-14">
                                                        <div className="flex flex-wrap items-end justify-end text-xs font-bold -ml-3">
                                                            <div className="bg-orange-200 border text-orange-500 border-orange-400 px-2 py-0 rounded-sm ml-0.5 -my-1 h-[14px]">
                                                                <p className="relative -top-0.5">{detalle.nuCode}</p>
                                                            </div>
                                                            {detalle.esIndustrial && <div className="bg-blue-200 text-blue-700 border border-blue-600 px-2 py-0 rounded-sm ml-0.5 h-[14px] mt-1.5">
                                                                <span className="relative -top-0.5">Industrial</span>
                                                            </div>}
                                                            {detalle.sinSifon && <div className="bg-gray-100 text-gray-500 border border-gray-600 px-2 py-0 rounded-sm ml-0.5 h-[14px] mt-1.5">
                                                                <span className="relative -top-0.5">Sin Sifón</span>
                                                            </div>}
                                                        </div>                                                        
                                                    </div>
                                                    <div className="font-bold text-xl ml-2 -mt-0.5">{detalle.elemento}</div>
                                                    <div className="flex text-nowrap">
                                                        <p className="text-xl orbitron ml-2">{detalle.cantidad}</p>
                                                        <p>{detalle.unidad}</p>
                                                    </div>
                                                </div>}
                                                {!detalle.elemento && <div className="w-full flex items-left ml-2">
                                                    {detalle.nombre.includes("Rack") && <div className="font-bold text-lg">{getDetailTitle(detalle)}</div>}
                                                    <div className="pl-3">
                                                        {detalle.nombre.includes("Rack") && <p className="text-xs text-gray-600">Capacidad</p>}
                                                        <p className="font-bold text-lg text-nowrap mt-0">
                                                            {getDetailSubtitle(detalle)}
                                                            {detalle.nombre.includes("Rack") && <span className="font-normal text-xs scale-75 ml-1">cilindros</span>}
                                                        </p>
                                                        {getAditionalInfo(detalle) && <p className="text-xs text-gray-600 -mt-2">{getAditionalInfo(detalle)} </p>}
                                                    </div>
                                                </div>}
                                                <div className="w-full flex justify-end items-center">
                                                    <div className="w-24 flex flex-end font-bold orbitron border-l-gray-300 justify-end mr-2 mt-2">
                                                        <p className="text-lg -mt-2 pl-2">{detalle.multiplicador - detalle.restantes}</p>
                                                        <p className="mt-1">/</p> 
                                                        <p className="text-md mt-2">{detalle.multiplicador}</p>
                                                    </div>
                                                </div>                                                
                                            </li>
                                        ))}                                        
                                    </ul>}

                                    {getResumenCarga(cargamento).map((item, itemIndex) => (
                                        <li
                                            key={`item${ventaIndex}_${itemIndex}`}
                                            className={`w-full flex text-sm border border-gray-300 px-0 ${(itemIndex === 0 && cargamento.items.length != 1) ? 'rounded-t-lg' : (itemIndex === cargamento.items.length - 1 && cargamento.items.length != 1) ? 'rounded-b-lg' : cargamento.items.length === 1 ? 'rounded-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                        >                                                    
                                            {item.elemento && <div className="w-full flex items-left pt-1.5">
                                                <div className="w-14">
                                                    <div className="flex flex-wrap items-end justify-end text-xs font-bold -ml-3">
                                                        <div className="bg-orange-500 border text-orange-50 border-orange-400 px-2 py-0 rounded ml-0.5 -my-1 h-[14px]">
                                                            <p className="relative -top-0.5">{getNUCode(item.elemento)}</p>
                                                        </div>
                                                        {item.esIndustrial && <div className="bg-blue-500 text-blue-50 border border-blue-400 px-2 py-0 rounded ml-0.5 h-[14px] mt-1.5">
                                                            <span className="relative -top-0.5">Industrial</span>
                                                        </div>}
                                                        {item.sinSifon && <div className="bg-gray-100 text-gray-500 border border-gray-600 px-2 py-0 rounded ml-0.5 h-[14px] mt-1.5">
                                                            <span className="relative -top-0.5">Sin Sifón</span>
                                                        </div>}
                                                    </div>                                                        
                                                </div>
                                                <div className="font-bold text-xl ml-2 -mt-0.5">{item.elemento}</div>
                                                <div className="flex text-nowrap">
                                                    <p className="text-xl orbitron ml-2 -mt-0.5">{item.cantidad}</p>
                                                    <p className="mt-1 ml-0.5">{item.unidad}</p>
                                                </div>
                                            </div>}
                                            {!item.elemento && <div className="w-full flex items-left ml-2">
                                                {item.nombre.includes("Rack") && <div className="font-bold text-lg">{getDetailTitle(item.subcategoriaId)}</div>}
                                                <div className="pl-3">
                                                    {item.subcategoriaId.nombre.includes("Rack") && <p className="text-xs text-gray-600">Capacidad</p>}
                                                    <p className="font-bold text-lg text-nowrap mt-0">
                                                        {getDetailSubtitle(item.subcategoriaId)}
                                                        {item.nombre.includes("Rack") && <span className="font-normal text-xs scale-75 ml-1">cilindros</span>}
                                                    </p>
                                                    {getAditionalInfo(item.subcategoriaId) && <p className="text-xs text-gray-600 -mt-2">{getAditionalInfo(item.subcategoriaId)} </p>}
                                                </div>
                                            </div>}
                                            <div className="w-full flex justify-end items-center">
                                                <div className="w-24 flex flex-end font-bold orbitron border-l-gray-300 justify-end mr-2 mt-2">
                                                    <p className="text-lg -mt-2 pl-2">{item.multiplicador - item.restantes}</p>
                                                    <p className="mt-1">/</p> 
                                                    <p className="text-md mt-2">{item.multiplicador}</p>
                                                </div>
                                            </div>                                                
                                        </li>
                                    ))}
                                </div>)}

                                

                                {!inputTemporalVisible ? <div className="absolute -bottom-2 flex flex-col w-full pr-4"
                                    onClick={index == 0 ? postCargamento : undefined}>
                                    <div className="flex">
                                        <button className={`text-white mx-2 h-12 w-12 flex text-sm border border-gray-300 rounded-lg p-1 mb-1 bg-blue-500`}
                                            disabled={scanMode}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleScanMode();
                                            }}>
                                            <BsQrCodeScan className="text-4xl" />
                                        </button>
                                        <button className={`relative w-full h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${loadState().complete ? 'bg-green-500 cursor-pointer' : loadState().partial ? 'bg-yellow-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Load state:", loadState());
                                                if(loadState().partial) {
                                                    setModalConfirmarCargaParcial(true);
                                                    return;
                                                } 
                                                postCargamento();
                                            }} disabled={(!loadState().partial && !loadState().complete) || posting}>
                                            <FaRoadCircleCheck className="text-4xl pb-0" />
                                            <p className="ml-2 mt-2 text-md font-bold">FIN {cargamento.estado === TIPO_ESTADO_RUTA_DESPACHO.preparacion ? 'CARGA' : 'DESCARGA'}</p>
                                            {posting && <div className="absolute w-full top-0">
                                                <div className="w-full h-12 bg-gray-100 opacity-80"></div>
                                                <div className="absolute top-2 w-full"><Loader texto="" /></div>
                                            </div>}
                                        </button>
                                    </div>
                                    <div className="flex items-center w-full mb-2 px-2">
                                        <div className="flex-1 h-4 bg-gray-300 rounded overflow-hidden">
                                            <div
                                                className="h-4 bg-green-500"
                                                style={{ width: `${getPorcentajeAvance()}%` }}
                                            ></div>
                                        </div>
                                        <div className="ml-2 w-12 text-right font-bold text-gray-400 orbitron">
                                            {getPorcentajeAvance()}%
                                        </div>
                                    </div>
                                </div> :
                                    <div className="absolute bottom-3 w-full pr-8 text-center pt-2">
                                        <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
                                        <input
                                            ref={temporalRef}
                                            type="text"
                                            className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    console.log("Código temporal ingresado:", e.target.value);
                                                    setInputTemporalVisible(false);
                                                    scanItem(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>}
                            </div>
                        </div>
                    </div>
                ))}
                {loadingCargamentos && (
                    <div className="absolute w-full h-screen flex items-center justify-center">
                        <Loader texto="Cargando pedidos" />
                    </div>
                )}
                {cargamentos?.length === 0 && !loadingCargamentos && (
                    <div className="absolute w-full h-screen flex items-center justify-center">
                        <div className="text-center">
                            <FaClipboardCheck className="text-8xl mx-auto mb-4 text-green-500" />
                            <div className="text-2xl font-bold text-gray-500">TODO EN ORDEN</div>
                        </div>
                    </div>
                )}
            </div>

            {cargamentos?.length > 1 && <div className="fixed bottom-2 right-4 z-40">
                <button
                    className="flex items-center px-6 py-3 bg-white text-gray-500 border border-gray-300 rounded-xl shadow-lg font-bold text-lg hover:bg-gray-100 transition duration-200"
                    style={{ minWidth: 220 }}
                    onClick={handleShowNext}
                    disabled={animating || cargamentos.length === 0}
                >
                    PASAR SIGUIENTE &gt;&gt;
                </button>
            </div>}

            {showModalCilindroErroneo && itemCatalogoEscaneado != null && <div className="fixed flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 items-center">
                <div className="relative mx-auto p-5 pt-0 border w-10/12 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>
                        <div className="mt-2">
                            <div className="flex items-center justify-center">
                                {itemCatalogoEscaneado.tipo === TIPO_ITEM_CATALOGO.cilindro && <Image width={20} height={64} src={`/ui/tanque_biox${getColorEstanque(itemCatalogoEscaneado.categoria.elemento)}.png`} style={{ width: "43px", height: "236px" }} alt="tanque_biox" />}
                                <div className="text-left ml-6">
                                    <div className="-mb-2">
                                        <div className="flex">
                                            {itemCatalogoEscaneado.categoria.esIndustrial && <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 mt-0 font-bold">INDUSTRIAL</span>}
                                            {itemCatalogoEscaneado.tipo === TIPO_ITEM_CATALOGO.cilindro && <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs ml-1 h-5 mt-0 font-bold tracking-widest">{getNUCode(itemCatalogoEscaneado.categoria.elemento)}</div>}
                                            {itemCatalogoEscaneado.subcategoria.sinSifon && <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">sin SIFÓN</div>}
                                        </div>
                                        <div className="flex font-bold text-4xl mt-1">
                                            <span className="pb-0 mt-4">                                                
                                                {(itemCatalogoEscaneado.elemento || itemCatalogoEscaneado.categoria.gas) ? (() => {
                                                    let match = itemCatalogoEscaneado.categoria.elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                    if (!match) {
                                                        match = [null, (itemCatalogoEscaneado.categoria.elemento ?? itemCatalogoEscaneado.categoria.gas), ''];
                                                    };
                                                    const [, p1, p2] = match;
                                                    return (
                                                        <>
                                                            {p1 ? p1.toUpperCase() : ''}
                                                            {p2 ? <small>{p2}</small> : ''}
                                                        </>
                                                    );
                                                })() : itemCatalogoEscaneado.categoria.nombre}
                                            </span>
                                            {itemCatalogoEscaneado.tipo === TIPO_ITEM_CATALOGO.cilindro && <div className="ml-3 mt-1">
                                                {editMode && <><p className="text-xs text-gray-600">Estado</p>
                                                    <select
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm w-24 relative -top-3 mb-0"
                                                        onChange={(e) => {
                                                            const newEstado = parseInt(e.target.value, 10);
                                                            setItemCatalogoEscaneado(prev => ({
                                                                ...prev,
                                                                estado: newEstado
                                                            }));
                                                        }}
                                                        value={itemCatalogoEscaneado.estado || 0}
                                                    >
                                                        <option value={0}>No aplica</option>
                                                        <option value={1}>En mantenimiento</option>
                                                        <option value={2}>En arriendo</option>
                                                        <option value={4}>En garantía</option>
                                                        <option value={8}>Vacío</option>
                                                        <option value={9}>En llenado</option>
                                                        <option value={16}>Lleno</option>
                                                    </select>
                                                </>}
                                                {!editMode && <p className="bg-gray-400 text-white text-xs ml-2 px-2 py-0.5 rounded uppercase mt-4">{getEstadoItemCatalogoLabel(itemCatalogoEscaneado.estado)}</p>}
                                            </div>}
                                        </div>
                                    </div>
                                    <p className="text-4xl font-bold orbitron">{itemCatalogoEscaneado.subcategoria.cantidad} <small>{itemCatalogoEscaneado.subcategoria.unidad}</small> </p>
                                    <p className="text-sm text-gray-600"><small>Código:</small> <b>{itemCatalogoEscaneado.codigo}</b></p>
                                    {itemCatalogoEscaneado.tipo === TIPO_ITEM_CATALOGO.cilindro && <p className="text-sm text-gray-600"><small>Vence:</small> <b>{dayjs(itemCatalogoEscaneado.updatedAt).add(2, 'year').format("DD/MM/YYYY")}</b></p>}
                                    {!editMode && itemCatalogoEscaneado.direccionInvalida && <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                        <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">Indica que se ubica en</span>
                                        <p className="flex text-red-600 -mt-6">
                                            <BsFillGeoAltFill size="1.5rem" /><span className="text-xs ml-1">{itemCatalogoEscaneado.direccion.nombre}</span>
                                        </p>
                                    </div>}
                                    {editMode &&  (
                                        <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                            <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">{!itemCatalogoEscaneado.direccionInvalida ? 'Se ubica en' : 'Cambiar a'}</span>
                                            <div className="-mt-6">
                                                {!itemCatalogoEscaneado.direccionInvalida && <p className="text-xs font-bold">{itemCatalogoEscaneado.direccionActual?.cliente?.nombre}</p>}
                                                {itemCatalogoEscaneado.direccionInvalida && <div className="flex">
                                                    <div className="flex text-xs text-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            id="ubicacion-dependencia"
                                                            className="mr-2 h-8 w-8"
                                                            checked={moverCilindro}
                                                            onChange={(e) => {
                                                                const mueve = e.target.checked;
                                                                setMoverCilindro(mueve);
                                                                setItemCatalogoEscaneado(prev => ({
                                                                    ...prev,
                                                                    direccionInvalida: mueve
                                                                }));
                                                            }}
                                                        />
                                                        <div className="flex items-start">
                                                            <BsFillGeoAltFill size="2.75rem" /><p className="text-xs ml-2">{itemCatalogoEscaneado.direccionActual?.direccion?.nombre}</p>
                                                        </div>
                                                    </div>
                                                </div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 mx-4">
                            <button
                                onClick={() => handleUpdateItem(itemCatalogoEscaneado)}
                                disabled={!editMode && (itemCatalogoEscaneado.direccionInvalida || itemCatalogoEscaneado.estado !== TIPO_ESTADO_ITEM_CATALOGO.lleno)}
                                className={`relative px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 ${!editMode && (itemCatalogoEscaneado.direccionInvalida || itemCatalogoEscaneado.estado !== TIPO_ESTADO_ITEM_CATALOGO.lleno) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {editMode ? "ACTUALIZAR" : "AGREGAR A PEDIDO"}
                                {corrigiendo && <div className="absolute top-0 left-0 w-full h-10">
                                    <div className="absolute top-0 left-0 w-full h-full bg-gray-100 opacity-80"></div>
                                    <div className="mt-1"><Loader texto="" /></div>
                                </div>}
                            </button>
                            {!editMode && <button
                                onClick={() => {
                                    setEditMode(true);
                                }}
                                className="mt-2 px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >CORREGIR</button>}
                            <button
                                onClick={() => {
                                    if (editMode) {
                                        setEditMode(false);
                                    } else {
                                        setShowModalCilindroErroneo(false);
                                        setScanMode(true);
                                    }
                                    setMoverCilindro(false);
                                }}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >CANCELAR</button>
                        </div>
                    </div>
                </div>
            </div>}
            <ToastContainer />
            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
            />

            {scanMode && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 px-4">
                    <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
                        <BsQrCodeScan className="text-8xl text-green-500 mb-4" />
                        <div className="flex">
                            <Loader texto="Escaneando código..."/>
                        </div>
                        <p className="text-gray-500 text-sm mt-2">Por favor, escanee un código QR</p>
                    </div>
                </div>
            )}

            {showModalNombreRetira && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={() => setShowModalNombreRetira(false)}
                                className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                                aria-label="Cerrar"
                                type="button"
                            >
                                <LiaTimesSolid />
                            </button>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Nombre y RUT de quien retira</h3>
                            <div className="mt-2 space-y-4 text-left">
                                <div className="flex flex-col">
                                    <label htmlFor="nombreRetira" className="text-sm text-gray-500">Nombre</label>
                                    <input
                                        id="nombreRetira"
                                        type="text"
                                        className="border rounded-md px-3 py-2 text-base"
                                        value={nombreRetira}
                                        onChange={e => setNombreRetira(e.target.value)}
                                        placeholder="Nombre completo"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label htmlFor="rutRetira" className="text-sm text-gray-500">RUT</label>
                                    <div className="flex space-x-2">
                                        <input
                                            id="rutRetiraNum"
                                            type="text"
                                            className="border rounded-md px-3 py-2 text-base w-28 text-right"
                                            value={rutRetiraNum}
                                            onChange={e => setRutRetiraNum(e.target.value)}
                                            placeholder="12.345.678"
                                            maxLength={10}
                                        />
                                        <span className="text-gray-500 font-bold text-lg">-</span>
                                        <input
                                            id="rutRetiraDv"
                                            type="text"
                                            className="border rounded-md px-3 py-2 text-base w-10 text-center"
                                            value={rutRetiraDv}
                                            onChange={e => setRutRetiraDv(e.target.value)}
                                            placeholder="K"
                                            maxLength={1}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Ejemplo: 12.345.678-K</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={handleGuardarNombreRetira}
                                    className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    GUARDAR
                                </button>
                                <button
                                    onClick={() => setShowModalNombreRetira(false)}
                                    className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalConfirmarCargaParcial && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={() => setModalConfirmarCargaParcial(false)}
                                className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                                aria-label="Cerrar"
                                type="button"
                            >
                                <LiaTimesSolid />
                            </button>                            
                        </div>
                        <div className="mt-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Confirmar carga parcial</h3>                                
                            <div className="flex">                                
                                <IoIosWarning className="text-6xl text-yellow-500 mx-auto mr-2 w-64" />                            
                                <p className="text-md text-gray-500">¡Falta carga!. Tendrá que completarla más tarde. ¿Seguro desea continuar?</p>                            
                            </div>
                            <button
                                onClick={() => {
                                    postCargamento();
                                    setModalConfirmarCargaParcial(false);
                                }}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={() => setModalConfirmarCargaParcial(false)}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}