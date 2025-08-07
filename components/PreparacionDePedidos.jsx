"use client";

import { useCallback, useEffect, useState } from "react";
import { BsFillGeoAltFill, BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import Loader from "./Loader";
import { socket } from "@/lib/socket-client";
import { FaClipboardCheck, FaPhoneAlt, FaTruck } from "react-icons/fa";
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
import { TIPO_ESTADO_ITEM_CATALOGO } from "@/app/utils/constants";

export default function PreparacionDePedidos({ session }) {
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
        if (!isCompleted()) {
            console.log("Eeeeepa!");
            return;
        }

        const scanCodes = cargamentos[0].ventas
            .flatMap(venta => venta.detalles)
            .flatMap(detalle => Array.isArray(detalle.scanCodes) ? detalle.scanCodes : []);

        const response = await fetch("/api/pedidos/despacho", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: cargamentos[0].rutaId,
                scanCodes
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al guardar el cargamento: ${errorData.error}`);
        } else {
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

    const isCompleted = () => {
        if (cargamentos.length === 0) return false;
        return cargamentos[0].ventas.every(venta =>
            venta.detalles.every(detalle => detalle.restantes === 0)
        );
    }

    const [loadingCargamentos, setLoadingCargamentos] = useState(true);

    const fetchCargamentos = async () => {
        const response = await fetch("/api/pedidos/despacho");
        const data = await response.json();
        console.log("DATA", data);
        setCargamentos(data.cargamentos);
        setLoadingCargamentos(false);
    }

    const cargarItem = useCallback(
        async (item, codigo) => {
            const cargamentoActual = cargamentos[0];
            if (!cargamentoActual) return false;

            // Verifica si el código ya fue escaneado en cualquier detalle de cualquier venta del primer cargamento
            const codigoYaEscaneado = cargamentoActual.ventas.some(venta =>
                venta.detalles.some(detalle =>
                    Array.isArray(detalle.scanCodes) && detalle.scanCodes.includes(item.itemId)
                )
            );
            if (codigoYaEscaneado) {
                toast.warn(`CODIGO ${codigo} ya escaneado`);
                setScanMode(false);
                return;
            }

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
                return;
            }

            if (item.estado === TIPO_ESTADO_ITEM_CATALOGO.vacio) {
                setScanMode(false);
                setShowModalCilindroErroneo(true);
                toast.warn(
                    `CODIGO ${codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} cilindro vacío`
                );
                return;
            }

            if(item.direccionInvalida) {
                setScanMode(false);
                setShowModalCilindroErroneo(true);
                return;
            }

            setCargamentos((prev) => {
                if (!prev.length) return prev;
                const newCargamentos = [...prev];
                const currentCargamento = { ...newCargamentos[0] };
                const ventas = [...currentCargamento.ventas];
                const detalles = [...ventas[ventaIndex].detalles];
                const detalleToUpdate = { ...detalles[detalleIndex] };

                // Evitar duplicados en scanCodes
                const scanCodes = Array.isArray(detalleToUpdate.scanCodes)
                    ? [...detalleToUpdate.scanCodes]
                    : [];
                if (!scanCodes.includes(item.itemId)) {
                    scanCodes.push(item.itemId);
                }

                // Actualiza restantes y multiplicador si corresponde
                const updatedRestantes =
                    detalleToUpdate.multiplicador < detalleToUpdate.restantes
                        ? detalleToUpdate.restantes
                        : detalleToUpdate.restantes - 1;
                const updatedMultiplicador =
                    detalleToUpdate.multiplicador < detalleToUpdate.restantes
                        ? detalleToUpdate.multiplicador + 1
                        : detalleToUpdate.multiplicador;

                const newDetalle = {
                    ...detalleToUpdate,
                    restantes: updatedRestantes,
                    multiplicador: updatedMultiplicador,
                    scanCodes,
                };
                detalles[detalleIndex] = newDetalle;
                ventas[ventaIndex] = { ...ventas[ventaIndex], detalles };
                currentCargamento.ventas = ventas;
                newCargamentos[0] = currentCargamento;
                return newCargamentos;
            });

            toast.success(
                `Cilindro ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre.toLowerCase()} cargado`
            );
        },
        [setCargamentos, cargamentos]
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
            cargarItem(data, codigo);
            console.log("Item cargado:", data);
        } catch {
            toast.error(`Cilindro ${codigo} no existe`);
            return;
        } finally {
            setPosting(false);
        }
    }, [cargarItem, setItemCatalogoEscaneado]);

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
    }, [scanMode, cargarItem, scanItem, temporalRef]);

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
                    estado: item.estado,
                    reubicar: moverCilindro,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(`Error al corregir: ${data.error || "Error desconocido"}`);
            } else {
                setShowModalCilindroErroneo(false);
                setMoverCilindro(false);
                setItemCatalogoEscaneado(null);
                cargarItem(item, item.codigo);
            }
        } catch {
            toast.error("Error de red al corregir cilindro");
        } finally {
            setEditMode(true);
            setCorrigiendo(false);
        }
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
                            <div className="flex flex-row text-xl font-bold px-3 py-1">
                                <div>
                                    <p className="text-xs">CHOFER</p>
                                    <p className="font-bold text-lg uppercase -mt-2">{cargamento.nombreChofer}</p>
                                </div>
                                <div className="ml-2 mt-3 text-gray-500">
                                    <div className="flex justify-start md:justify-start">
                                        <FaTruck className="text-xl mr-2" />
                                        <p className="font-bold text-sm">{cargamento.patenteVehiculo}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-[calc(100dvh-234px)] overflow-y-scroll">
                                {cargamento.ventas.map((venta, ventaIndex) => <div key={`venta_${ventaIndex}`} className="px-2 py-1 border-2 rounded-xl border-gray-300 mb-1">
                                    <div className="flex">
                                        <div className="w-10/12">
                                            <p className="text-xs font-bold text-gray-500 truncate">{venta.cliente?.nombre || "Sin cliente"}</p>
                                            <p className="flex text-xs text-gray-500">
                                                <FaPhoneAlt className="mr-1" />{venta.cliente?.telefono || "Sin teléfono"}
                                            </p>
                                        </div>
                                        <div key={`comentario_${ventaIndex}`} className={`w-2/12 flex justify-end ${venta.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                                            <div className="mr-2 cursor-pointer mt-0" onClick={(e) => {
                                                e.stopPropagation();
                                                toast.info(`${venta.comentario || "Sin comentarios"}`);
                                            }}>
                                                {!venta.comentario ? <VscCommentDraft size="1.75rem" /> : <VscCommentUnresolved size="1.75rem" />}
                                            </div>
                                        </div>
                                    </div>


                                    <ul key={`detalles_${ventaIndex}`} className="flex-1 flex flex-wrap items-center justify-center mt-1">
                                        {venta.detalles.map((detalle, idx) => (
                                            <li
                                                key={`detalle_${ventaIndex}_${idx}`}
                                                className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && venta.detalles.length != 1) ? 'rounded-t-lg' : (idx === venta.detalles.length - 1 && venta.detalles.length != 1) ? 'rounded-b-lg' : venta.detalles.length === 1 ? 'rounded-lg' : ''} ${detalle.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : detalle.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                            >
                                                <div className="w-full flex items-left">
                                                    <div className="flex">
                                                        <div>
                                                            <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{detalle.nuCode}</div>
                                                            {detalle.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                            {detalle.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                                        </div>
                                                        <div className="font-bold text-xl ml-2">
                                                            <span>
                                                                {(() => {
                                                                    let match = detalle.elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                                    if (!match) {
                                                                        match = [null, (detalle.elemento ?? detalle.gas ?? detalle.nombre.split(" ")[0]), ''];
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
                                                    <p className="text-2xl orbitron ml-2"><b>{detalle.cantidad}</b> <small>{detalle.unidad}</small></p>
                                                </div>
                                                <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{detalle.multiplicador - detalle.restantes} <small>/</small> {detalle.multiplicador}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>)}

                                {!inputTemporalVisible ? <div className="absolute -bottom-2 flex w-full pr-4"
                                    onClick={index == 0 ? postCargamento : undefined}>
                                    <button className={`mx-2 h-12 w-12 flex text-sm border border-gray-300 rounded-lg p-1 mb-4 ${(scanMode && !isCompleted()) ? 'bg-green-500 cursor-pointer' : isCompleted() ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 cursor-pointer'} text-white hover:${(scanMode && !isCompleted()) ? 'bg-green-300 cursor-pointer' : isCompleted() ? 'bg-gray-400' : 'bg-sky-700 cursor-pointer'} transition duration-300 ease-in-out`}
                                        disabled={isCompleted() ? true : false}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleScanMode();
                                        }}>
                                        <BsQrCodeScan className="text-4xl" />
                                        {scanMode && !isCompleted() && <div className="absolute top-0 left-2">
                                            <div className="w-12 h-12 bg-gray-100 opacity-80"></div>
                                            <div className="absolute top-2 left-2"><Loader texto="" /></div>
                                        </div>}
                                    </button>
                                    <button className={`relative w-full h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${isCompleted() ? 'bg-green-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            postCargamento();
                                        }} disabled={!isCompleted() || posting}>
                                        <FaRoadCircleCheck className="text-4xl pb-0" />
                                        <p className="ml-2 mt-2 text-md font-bold">CONFIRMAR CARGA</p>
                                        {posting && <div className="absolute w-full top-0">
                                            <div className="w-full h-12 bg-gray-100 opacity-80"></div>
                                            <div className="absolute top-2 w-full"><Loader texto="" /></div>
                                        </div>}
                                    </button>
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
                        <Loader texto="CARGANDO PEDIDOS" />
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
                                <Image width={20} height={64} src={`/ui/tanque_biox${getColorEstanque(itemCatalogoEscaneado.categoria.elemento)}.png`} style={{ width: "43px", height: "236px" }} alt="tanque_biox" />
                                <div className="text-left ml-6">
                                    <div>
                                        <div className="flex">
                                            {itemCatalogoEscaneado.categoria.esIndustrial && <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 mt-0 font-bold">INDUSTRIAL</span>}
                                            <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs ml-1 h-5 mt-0 font-bold tracking-widest">{getNUCode(itemCatalogoEscaneado.categoria.elemento)}</div>
                                            {itemCatalogoEscaneado.subcategoria.sinSifon && <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">sin SIFÓN</div>}
                                        </div>
                                        <div className="flex font-bold text-4xl">
                                            <span>
                                                {(() => {
                                                    let match = itemCatalogoEscaneado.categoria.elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                    if (!match) {
                                                        match = [null, (itemCatalogoEscaneado.categoria.elemento ?? itemCatalogoEscaneado.categoria.gas ?? itemCatalogoEscaneado.categoria.nombre.split(" ")[0]), ''];
                                                    };
                                                    const [, p1, p2] = match;
                                                    return (
                                                        <>
                                                            {p1 ? p1.toUpperCase() : ''}
                                                            {p2 ? <small>{p2}</small> : ''}
                                                        </>
                                                    );
                                                })()}
                                            </span>
                                            <div className="ml-3">

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
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-4xl font-bold orbitron">{itemCatalogoEscaneado.subcategoria.cantidad} <small>{itemCatalogoEscaneado.subcategoria.unidad}</small> </p>
                                    <p className="text-sm text-gray-600"><small>Código:</small> <b>{itemCatalogoEscaneado.codigo}</b></p>
                                    <p className="text-sm text-gray-600"><small>Vence:</small> <b>{dayjs(itemCatalogoEscaneado.updatedAt).add(2, 'year').format("DD/MM/YYYY")}</b></p>
                                    {!editMode && itemCatalogoEscaneado.direccionInvalida && <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                        <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">Indica que se ubica en</span>
                                        <p className="flex text-red-600 -mt-6">
                                            <BsFillGeoAltFill size="1.5rem" /><span className="text-xs ml-1">{itemCatalogoEscaneado.direccion.nombre}</span>
                                        </p>
                                    </div>}
                                    {editMode && itemCatalogoEscaneado.direccionInvalida && (
                                        <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                            <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">Se ubica en</span>
                                            <div className="-mt-6">
                                                <p className="text-xs font-bold">{itemCatalogoEscaneado.direccionActual?.cliente?.nombre}</p>
                                                <div className="flex">
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
                                                </div>
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
                                className={`relative px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${!editMode && (itemCatalogoEscaneado.direccionInvalida || itemCatalogoEscaneado.estado !== TIPO_ESTADO_ITEM_CATALOGO.lleno) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        </div>
    );
}