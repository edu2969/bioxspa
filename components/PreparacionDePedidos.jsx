"use client";

import { useCallback, useEffect, useState } from "react";
import { BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import { TbTruckLoading } from "react-icons/tb";
import Loader from "./Loader";
import { socket } from "@/lib/socket-client";
import { FaClipboardCheck, FaTruck } from "react-icons/fa";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import dayjs from "dayjs";
import 'dayjs/locale/es';
import Image from "next/image";
import { getNUCode } from "@/lib/nuConverter";
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);

export default function PreparacionDePedidos() {
    const [cargamentos, setCargamentos] = useState([]);
    const [animating, setAnimating] = useState(false);
    const [scanMode, setScanMode] = useState(false);
    const [showModalCilindroErroneo, setShowModalCilindroErroneo] = useState(false);
    const [itemCatalogoEscaneado, setItemCatalogoEscaneado] = useState(null);

    const handleRemoveFirst = () => {
        if (animating) return; // Evita múltiples clics durante la animación
        setAnimating(true);

        setTimeout(() => {
            setPedidos((prev) => prev.slice(1)); // Elimina el primer pedido después de la animación
            setAnimating(false);
            setScanMode(false); // Desactiva el modo de escaneo después de eliminar el pedido
        }, 1000); // Duración de la animación (en ms)
    };

    const handleScanMode = () => {
        setScanMode(!scanMode);
    };

    const [inputCode, setInputCode] = useState("");

    const isCompleted = () => {
        if (cargamentos.length === 0) return false;
        return cargamentos[0].items.every((item) => item.restantes === 0);
    }

    const [loadingCargamentos, setLoadingCargamentos] = useState(true);

    const fetchCargamentos = async () => {
        const response = await fetch("/api/pedidos/despacho");
        const data = await response.json();
        console.log("DATA", data);
        setCargamentos(data.cargamentos);
        setLoadingCargamentos(false);
    }

    const cargarItem = useCallback(async (item) => {
        const cargamentoActual = cargamentos[0];
        if (!cargamentoActual) return false;

        const itemIndex = cargamentoActual.items.map(i => i.subcategoriaId).indexOf(item.subcategoriaCatalogoId);
        if (itemIndex === -1) {
            setShowModalCilindroErroneo(true);
            toast.warn(`CODIGO ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} no corresponde a este pedido`);
            return;
        }

        if (cargamentoActual.items[itemIndex].items.map(i => i.codigo).includes(item.codigo)) {
            toast.warn(`CODIGO ${item.codigo} ya escaneado`);
            return;
        }

        if (cargamentoActual.items[itemIndex].restantes === 0) {
            toast.warn(`Todo ${item.categoria.nombre} ${item.subcategoria.nombre} completado`);
            return;
        }

        setCargamentos((prevCargamentos) => {
            const updatedCargamentos = [...prevPedidos];
            const currentCargamento = updatedCargamentos[0];
            const currentItem = currentCargamento.items[itemIndex];
            if (currentItem.restantes > 0 && !currentItem.items.some(i => i.id === item._id)) {
                currentItem.restantes -= 1;
                currentItem.items.push({
                    id: item._id,
                    codigo: item.codigo,
                });
            }
            return prevCargamentos;
        });
        toast.success(`Cilindro ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre.toLowerCase()} cargado`);
    }, [cargamentos, setCargamentos]);

    useEffect(() => {
        fetchCargamentos();
    }, []);

    useEffect(() => {
        if (!scanMode) return;

        const handleKeyDown = (e) => {
            console.log("Key pressed:", e.key, new Date());
            if (e.key === "Enter") {
                console.log(`Código ingresado: ${inputCode}`);
                const scanItem = async () => {
                    try {
                        const response = await fetch(`/api/pedidos/despacho/scanItemCatalogo?codigo=${inputCode}`);
                        console.log("RESPONSE", response);
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || "Error al escanear el código");
                        }
                        const data = await response.json();
                        console.log("Scan exitoso:", data);
                        const item = {
                            ...data.item,
                            categoria: data.categoria,
                            subcategoria: data.subcategoria,
                        }
                        setItemCatalogoEscaneado(item);
                        cargarItem(item);
                    } catch {
                        toast.error(`Cilindro ${inputCode} no existe`);
                        return;
                    } finally {
                        setInputCode(""); // Limpia el código ingresado
                    }
                };
                scanItem();
            } else if (!isNaN(e.key)) {
                setInputCode((prev) => prev + e.key); // Agrega el número al código
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [scanMode, inputCode, cargarItem]);

    useEffect(() => {
        socket.on("carga_confirmada", (data) => {
            console.log("Carga confirmada:", data);
        })

        return () => {
            socket.off("carga_confirmada");
        }
    }, []);

    return (
        <div className="w-full h-screen overflow-hidden">
            <div className="w-full">
                {!loadingCargamentos && cargamentos && cargamentos.map((cargamento, index) => (
                    <div key={`cargamento_${index}`} className="flex flex-col h-full overflow-y-hidden">
                        <div className={`absolute w-11/12 md:w-9/12 h-5/6 bg-white shadow-lg rounded-lg p-4 transition-all duration-500`}
                            style={{
                                top: `${index * 10 + 72}px`,
                                left: `${index * 10 + 16}px`,
                                zIndex: cargamentos.length - index,
                                scale: 1 - index * 0.009,
                                transform: `translateX(${animating && index == 0 ? "-100%" : "0"})`,
                                opacity: animating && index == 0 ? 0 : 1,
                            }}
                        >
                            <h1 className="flex flex-row text-xl font-bold mt-8">
                                <TbTruckLoading className="text-6xl mx-4 mt-4" />
                                <div className="mt-2 text-left">
                                    <p className="text-sm font-light">venta más reciente</p>
                                    <div className="flex flex-col md:flex-row items-start">
                                        <p className="text-2xl orbitron">{dayjs(cargamento.fechaVentaMasReciente).format("ddd DD/MMM HH:mm")}</p>
                                        <span className="font-extralight text-sm ml-0 md:ml-2 mt-0 md:mt-3.5">{dayjs(cargamento.fecha).fromNow()}</span>
                                    </div>
                                </div>
                            </h1>                            
                            <ul className="flex-1 flex flex-wrap items-center justify-center mt-4">
                                <li className={`w-full flex text-sm border border-gray-300 rounded-xl px-6 py-3 mb-4 ${(scanMode && !isCompleted()) ? 'bg-green-500 cursor-pointer' : isCompleted() ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 cursor-pointer'} text-white hover:${(scanMode && !isCompleted()) ? 'bg-green-300 cursor-pointer' : isCompleted() ? 'bg-gray-400' : 'bg-sky-700 cursor-pointer'} transition duration-300 ease-in-out`}
                                    onClick={() => {
                                        if (!isCompleted()) {
                                            handleScanMode();
                                        }
                                    }}>
                                    <BsQrCodeScan className="text-4xl" />
                                    <p className="ml-8 mt-1 text-xl mr-8">{scanMode ? (!isCompleted() ? 'ESCANEO ACTVO' : 'ESCANEO COMPLETO') : 'INICIAR ESCANEO'}</p>
                                    {!isCompleted() && scanMode && <Loader texto="" />}
                                </li>
                                {cargamento.items.map((item, idx) => (
                                    <li
                                        key={`item_${idx}`}
                                        className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${idx === 0 ? 'rounded-t-lg' : idx === cargamento.items.length - 1 ? 'rounded-b-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                    >
                                        <div className="w-full flex items-left">
                                            <div className="flex">
                                                <div>
                                                    <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{item.nuCode}</div>
                                                    {item.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                    {item.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                                </div>
                                                <div className="font-bold text-xl ml-2">
                                                    <span>
                                                        {(() => {
                                                            const match = item.elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                            if (!match) return null;
                                                            const [, p1, p2] = match;
                                                            return (
                                                                <>
                                                                    {p1 ? p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase() : ''}
                                                                    {p2 ? <small>{p2}</small> : ''}
                                                                </>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-2xl orbitron ml-2"><b>{item.cantidad}</b> <small>{item.unidad}</small></p>
                                        </div>
                                        <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{item.multiplicador - item.restantes} <small>/</small> {item.multiplicador}</div>
                                    </li>
                                ))}
                            </ul>

                            <div className="absolute bottom-2 w-full pr-8"
                                onClick={index === 0 ? handleRemoveFirst : undefined}>
                                <div className={`flex justify-center text-white border border-gray-300 rounded-xl py-3 ${isCompleted() ? 'bg-green-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}>
                                    <FaRoadCircleCheck className="text-4xl pb-0" />
                                    <p className="ml-4 mt-1 text-xl">CONFIRMAR CARGA</p>
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 bg-blue-200 text-black rounded-xl rounded-tl-none rounded-br-none px-6 text-left">
                                <div className="w-full flex">
                                    <div>
                                        <p className="text-xs mt-2">CHOFER</p>
                                        <p className="font-bold text-2xl uppercase -mt-2">{cargamento.nombreChofer}</p>
                                    </div>
                                    <div className="ml-2 mt-5 text-gray-500">
                                        <div className="flex justify-start md:justify-start">
                                            <FaTruck className="text-2xl mr-2" />
                                            <p className="font-bold text-lg">{cargamento.patenteVehiculo}</p>
                                        </div>
                                    </div>
                                </div>
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


            {showModalCilindroErroneo && itemCatalogoEscaneado != null && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-12 mx-auto p-5 border w-11/12 md:w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>
                        <div className="mt-2">
                            <div className="flex flex-col md:flex-row items-center">
                                <Image width={20} height={64} src="/ui/tanque_biox.png" style={{ width: "43px", height: "236px" }} alt="tanque_biox" />
                                <div className="text-left ml-0 md:ml-4">
                                    {itemCatalogoEscaneado.categoria.esIndustrial && <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold">INDUSTRIAL</span>}
                                    <div className="flex flex-col md:flex-row items-center">
                                        <div className="font-bold text-4xl">
                                            <span>
                                                {(() => {
                                                    const match = itemCatalogoEscaneado.categoria.elemento.match(/^([a-zA-Z]*)(\d*)$/);
                                                    if (!match) return null;
                                                    const [, p1, p2] = match;
                                                    return (
                                                        <>
                                                            {p1 ? p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase() : ''}
                                                            {p2 ? <small>{p2}</small> : ''}
                                                        </>
                                                    );
                                                })()}
                                            </span>
                                        </div>
                                        <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">{getNUCode(itemCatalogoEscaneado.categoria.elemento)}</div>
                                        {itemCatalogoEscaneado.subcategoria.sinSifon && <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">sin SIFÓN</div>}
                                    </div>
                                    <p className="text-4xl font-bold orbitron">{itemCatalogoEscaneado.subcategoria.cantidad} <small>{itemCatalogoEscaneado.subcategoria.unidad}</small> </p>
                                    <p className="text-sm text-gray-600"><small>Código:</small> <b>{itemCatalogoEscaneado.codigo}</b></p>
                                    <p className="text-sm text-gray-600"><small>Mantención:</small> <b>{dayjs(itemCatalogoEscaneado.updatedAt).add(2, 'year').format("DD/MM/YYYY")}</b></p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => {
                                    setShowModalCilindroErroneo(false);
                                    setInputCode("");
                                    setScanMode(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >CONTINUAR</button>
                            <button
                                onClick={() => {
                                    setShowModalCilindroErroneo(false);
                                    setInputCode("");
                                    setScanMode(true);
                                }}
                                className="mt-2 px-4 py-2 bg-yellow-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >CORREGIR</button>
                            <button
                                onClick={() => {
                                    setShowModalCilindroErroneo(false);
                                    setInputCode("");
                                    setScanMode(true);
                                }}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >CANCELAR</button>
                        </div>
                    </div>
                </div>
            </div>}


            <ToastContainer />
        </div>
    );
}