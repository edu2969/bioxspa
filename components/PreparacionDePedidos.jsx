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

    const postCargamento = async (cargamento) => {
        const response = await fetch("/api/pedidos/despacho", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ scanCodes: cargamento.scanCodes }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al guardar el cargamento");
        }
        const data = await response.json();
        console.log("Cargamento guardado:", data);
        return data;
    }        

    const handleRemoveFirst = async () => {
        if (animating) return; // Evita múltiples clics durante la animación
        setAnimating(true);
        setTimeout(() => {
            setCargamentos((prev) => prev.slice(1)); // Elimina el primer pedido después de la animación
            setAnimating(false);
            setScanMode(false); 
            postCargamento(cargamentos[0]);
        }, 1000); 
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
            setScanMode(false);
            setShowModalCilindroErroneo(true);
            toast.warn(`CODIGO ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} no corresponde a este pedido`);
            return;
        }

        if (cargamentoActual.items[itemIndex].items.map(i => i.codigo).includes(item.codigo)) {
            toast.warn(`CODIGO ${item.codigo} ya escaneado`);
            return;
        }

        if (cargamentoActual.items[itemIndex].restantes === -1) {
            toast.warn(`${item.categoria.nombre} ${item.subcategoria.nombre} exedente`);
        }
        var restantes = cargamentoActual.items[itemIndex].restantes;
        var multiplicador = cargamentoActual.items[itemIndex].multiplicador;
        setCargamentos(prev => {
            const newCargamentos = [...prev];
            const currentCargamento = newCargamentos[0];
            const itemToUpdate = currentCargamento.items[itemIndex];
            const newItem = {
                ...itemToUpdate,
                restantes: multiplicador < restantes ? restantes : restantes - 1,
                multiplicador: multiplicador < restantes ? multiplicador + 1: multiplicador,
                items: [...itemToUpdate.items, { id: item._id, codigo: item.codigo }],
            };
            currentCargamento.items[itemIndex] = newItem;
            newCargamentos[0] = currentCargamento;
            console.log("newCargamentos", newCargamentos);
            return newCargamentos;
        });        
        toast.success(`Cilindro ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre.toLowerCase()} cargado`);
    }, [setCargamentos, cargamentos]);

    useEffect(() => {
        fetchCargamentos();
    }, []);

    useEffect(() => {
        if (!scanMode) return;

        const handleKeyDown = (e) => {
            console.log("Key pressed:", e.key, new Date());
            if (e.key === "Enter" && inputCode.length > 0) {
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
                                        className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${idx === 0 ? 'rounded-t-lg' : idx === cargamento.items.length - 1 ? 'rounded-b-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
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
                                                            let match = item.elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                            if (!match) {
                                                                match = [null, (item.elemento ?? item.gas ?? item.nombre.split(" ")[0]), ''];
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


            {showModalCilindroErroneo && itemCatalogoEscaneado != null && <div className="fixed flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 items-center">
                <div className="relative mx-auto p-5 border w-10/12 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>
                        <div className="mt-2">
                            <div className="flex items-center justify-center">
                                <Image width={20} height={64} src="/ui/tanque_biox.png" style={{ width: "43px", height: "236px" }} alt="tanque_biox" />
                                <div className="text-left ml-6">                                    
                                    <div>
                                        <div className="flex">
                                            {itemCatalogoEscaneado.categoria.esIndustrial && <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 mt-0 font-bold">INDUSTRIAL</span>}
                                            <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs ml-1 h-5 mt-0 font-bold tracking-widest">{getNUCode(itemCatalogoEscaneado.categoria.elemento)}</div>
                                            {itemCatalogoEscaneado.subcategoria.sinSifon && <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">sin SIFÓN</div>}
                                        </div>
                                        <div className="font-bold text-4xl">
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
                                        </div>                                        
                                    </div>
                                    <p className="text-4xl font-bold orbitron">{itemCatalogoEscaneado.subcategoria.cantidad} <small>{itemCatalogoEscaneado.subcategoria.unidad}</small> </p>
                                    <p className="text-sm text-gray-600"><small>Código:</small> <b>{itemCatalogoEscaneado.codigo}</b></p>
                                    <p className="text-sm text-gray-600"><small>Mantención:</small> <b>{dayjs(itemCatalogoEscaneado.updatedAt).add(2, 'year').format("DD/MM/YYYY")}</b></p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 ml-4">
                            <div className="flex items-center mt-4">
                                <input
                                    type="checkbox"
                                    id="noPreguntar"
                                    className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label htmlFor="noPreguntar" className="ml-2 text-sm font-medium text-gray-900">
                                    No preguntar para este tipo de cilindro
                                </label>
                            </div>
                        </div>
                        <div className="mt-4 mx-4">
                            <button
                                onClick={() => {
                                    setShowModalCilindroErroneo(false);
                                    const newCargamentos = [...cargamentos];
                                    const currentCargamento = newCargamentos[0];

                                    // Verificar si el item ya existe en el cargamento
                                    const existingItemIndex = currentCargamento.items.findIndex(
                                        (item) => item.subcategoriaId === itemCatalogoEscaneado.subcategoria._id
                                    );

                                    if (existingItemIndex === -1) {
                                        // Agregar el nuevo item si no existe                
                                        const newItem = {
                                            subcategoriaId: itemCatalogoEscaneado.subcategoria._id,
                                            nombre: `${itemCatalogoEscaneado.categoria.nombre} ${itemCatalogoEscaneado.subcategoria.nombre}`,
                                            restantes: -1,
                                            cantidad: itemCatalogoEscaneado.subcategoria.cantidad,
                                            elemento: itemCatalogoEscaneado.categoria.elemento,
                                            nuCode: getNUCode(itemCatalogoEscaneado.categoria.elemento),
                                            esIndustrial: itemCatalogoEscaneado.categoria.esIndustrial,
                                            sinSifon: itemCatalogoEscaneado.subcategoria.sinSifon,
                                            unidad: itemCatalogoEscaneado.subcategoria.unidad,
                                            multiplicador: 0,
                                            items: [
                                                {
                                                    id: itemCatalogoEscaneado._id,
                                                    codigo: itemCatalogoEscaneado.codigo,
                                                },
                                            ],
                                        };
                                        currentCargamento.items.push(newItem);
                                    }
                                    newCargamentos[0] = currentCargamento;
                                    setCargamentos(newCargamentos);
                                    setScanMode(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                CONTINUAR
                            </button>
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