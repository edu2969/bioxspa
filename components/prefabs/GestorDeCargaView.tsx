"use client";

import React, { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";
import { getNUCode } from "@/lib/nuConverter";
import { FaClipboardCheck } from "react-icons/fa";
import type { ICargaDespachoView } from "@/types/types";
import { LiaPencilAltSolid } from "react-icons/lia";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN } from "@/app/utils/constants";
import { BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import Loader from "../Loader";
import QuienRecibeModal from "../modals/QuienRecibeModal";
import ModalConfirmarCargaParcial from "../modals/ModalConfirmarCargaParcial";

interface FormData {
    nombreRetira: string;
    rutRetiraNum: string;
    rutRetiraDv: string;
}

export default function GestorDeCargaView({
    cargamentos = [],
    setScanMode,
    handleRemoveFirst
}: {
    cargamentos: ICargaDespachoView[] | undefined;
    setScanMode: (scanMode: boolean) => void;
    handleRemoveFirst: () => void;
}) {
    const [animating, setAnimating] = useState(false);
    const [showModalNombreRetira, setShowModalNombreRetira] = useState(false);
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const [alMenosUnEscaneado, setAlMenosUnEscaneado] = useState(false);
    const [modalConfirmarCargaParcial, setModalConfirmarCargaParcial] = useState(false);
    const temporalRef = useRef<HTMLInputElement>(null);
    const { setValue } = useForm<FormData>();

    const postCargamento = useCallback(async () => {
        if (!cargamentos || cargamentos.length === 0) return;
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
                ventaId: cargamentos[0].ventas[0].ventaId
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
            }
        }
    }, [cargamentos, handleRemoveFirst]);

    const loadState = () => {
        if (!cargamentos || cargamentos.length === 0) return { complete: false, partial: false };
        const cargamento = cargamentos[0];
        // Determinar si es proceso de carga o descarga según el estado
        const esProcesoCarga = cargamento.estado === TIPO_ESTADO_RUTA_DESPACHO.preparacion;
        const esProcesoDescarga = cargamento.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga;

        // Si hay al menos una venta de traslado
        const tieneTraslado = cargamento.ventas.some(v => v.tipo === TIPO_ORDEN.traslado);

        // Para traslado: solo es válido si items es un arreglo vacío
        if (tieneTraslado) {
            const itemsRetirados = Array.isArray(cargamento.items) && cargamento.items.length === 0;
            if (itemsRetirados) {
                return { complete: true };
            }
            return {
                partial: false // No hay parcial para traslado
            };
        }

        // Lógica de partial diferenciada por tipo de proceso
        if (esProcesoCarga) {
            // En CARGA: partial = true si al menos hay un item escaneado por cada venta
            const todasLasVentasTienenAlMenosUno = cargamento.ventas.every(venta =>
                venta.detalles.some(detalle =>
                    Array.isArray(detalle.itemCatalogoIds) && detalle.itemCatalogoIds.length > 0
                )
            );

            return {
                partial: cargamentos.length > 0
                    && todasLasVentasTienenAlMenosUno
            };
        } else if (esProcesoDescarga) {
            // En DESCARGA: partial = true si al menos hay items escaneados pero no todos descargados
            return {
                partial: cargamentos.length > 0
                    && alMenosUnEscaneado
            };
        }

        // Fallback para otros estados
        return {
            partial: cargamentos.length > 0
                && alMenosUnEscaneado
        };
    }

    return (<div className="flex flex-col w-full">
        {cargamentos && cargamentos.map((cargamento, cidx) =>
            <div key={`cargamento_${cidx}`} className="w-full">


                <div className={`absolute w-11/12 md:w-1/2 h-[calc(100vh-114px)] bg-gray-100 shadow-lg rounded-lg px-1 ${animating ? "transition-all duration-500" : ""}`}
                    style={{
                        top: `${cidx * 10 + 52}px`,
                        left: `${cidx * 10 + 16}px`,
                        zIndex: cargamentos.length - cidx,
                        scale: 1 - cidx * 0.009,
                        transform: `translateX(${animating && cidx == 0 ? "-100%" : "0"})`,
                        opacity: animating && cidx == 0 ? 0 : 1,
                    }}>

                    {!cargamento.retiroEnLocal && <div className="w-full flex text-xl font-bold px-3 pt-2 pb-1">
                        <div>
                            <p className="text-xs">CHOFER</p>
                            <p className="font-bold -mt-2 text-nowrap">{cargamento.nombreChofer?.split(" ").splice(0, 2).join(" ")}</p>
                        </div>
                        <div className="w-full text-gray-500 mr-0 items-end flex justify-end">
                            <div className="w-[76px] text-center bg-white rounded-md p-0.5">
                                <div className="flex justify-start md:justify-start bg-white rounded-sm border-gray-400 border px-0.5 pb-0.5 space-x-0.5">
                                    <p className="font-bold text-sm">{cargamento.patenteVehiculo?.substring(0, 2)}</p>
                                    <Image width={82} height={78} src="/ui/escudo.png" alt="separador" className="w-[9px] h-[9px]" style={{ "marginTop": "7px" }} />
                                    <p className="font-bold text-sm">{cargamento.patenteVehiculo?.substring(2, cargamento.patenteVehiculo.length)}</p>
                                </div>
                            </div>
                        </div>
                    </div>}

                    {cargamento.ventas && cargamento.ventas.map((venta, vidx) => <div key={`venta_${vidx}`} className="w-full mb-2 bg-gray-200 p-1 rounded-md shadow-md">
                        {cargamento.retiroEnLocal && <div className="w-full flex text-xl font-bold px-3 py-1">
                            <div className="w-full flex text-lg font-bold px-3 relative">
                                <div className="w-full relative">
                                    <p className="text-xs">Nombre de quién retira en local</p>
                                    <div className="mt-1 text-nowrap border border-gray-300 rounded px-2">
                                        <p className="-mt-1">{venta.entregasEnLocal[0]?.nombreRecibe || 'Desconocido'}</p>
                                        <p className="text-xs -mt-1">RUT: {venta.entregasEnLocal[0]?.rutRecibe || '-'}</p>
                                    </div>
                                </div>
                                <div className="absolute top-8 right-5 text-blue-500 flex items-center justify-end">
                                    <LiaPencilAltSolid className="cursor-pointer hover:text-blue-600" size="1.3rem" onClick={() => {
                                        setValue("nombreRetira", venta.entregasEnLocal[0]?.nombreRecibe || "");
                                        setValue("rutRetiraNum", venta.entregasEnLocal[0]?.rutRecibe ? venta.entregasEnLocal[0].rutRecibe.split("-")[0] : "");
                                        setValue("rutRetiraDv", venta.entregasEnLocal[0]?.rutRecibe ? venta.entregasEnLocal[0].rutRecibe.split("-")[1] : "");
                                        setShowModalNombreRetira(true);
                                    }} />
                                </div>
                            </div>
                        </div>}
                        <div className="w-full flex px-2 border border-gray-300 rounded-t-lg border-b-0 bg-white pb-1">
                            <div className="w-full text-left ml-2 text-gray-400">
                                <p className="text-md font-bold truncate -mb-1">{venta.cliente.nombre || "Sin cliente"}</p>
                                <p className="text-xs truncate m-0">{venta.cliente.rut}</p>
                                {cargamento.retiroEnLocal && <div className="text-sm font-bold text-gray-700">
                                    <p>ENTREGA DE CILINDROS</p>
                                    <span className="text-xs">Escanee cilindros a entregar</span>
                                </div>}
                            </div>
                            <div className={`relative flex justify-end ${venta.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                                <div className="mt-1 mr-2 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    toast(`${venta.comentario || "Sin comentarios"}`, { icon: '💬' });
                                }}>
                                    {!venta.comentario
                                        ? <VscCommentDraft size="1.75rem" />
                                        : <VscCommentUnresolved size="1.75rem" />}
                                </div>
                                {venta.comentario && <div className="absolute top-[16px] right-[11px] w-[10px] h-[10px] rounded-full bg-red-600"></div>}
                            </div>
                        </div>
                        <ul className="flex-1 flex flex-wrap items-center justify-center -mt-0.5">
                            {venta.detalles.map((detalle, idx) => (
                                <li
                                    key={`descarga_${idx}`}
                                    className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && venta.detalles.length != 1) ? 'rounded-t-lg' : (idx === venta.detalles.length - 1 && venta.detalles.length != 1)
                                        ? 'rounded-b-lg' : venta.detalles.length === 1 ? 'rounded-lg' : ''} ${detalle.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : detalle.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                >
                                    <div className="w-full flex items-left">
                                        <div className="flex">
                                            <div>
                                                <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento)}</div>
                                                {detalle.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                {detalle.subcategoriaCatalogoId.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                            </div>
                                            <div className="font-bold text-xl ml-2">
                                                {detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento && <span>
                                                    {(() => {
                                                        const elem = detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                                                        let match = elem.match(/^([a-zA-Z]*)(\d*)$/);
                                                        if (!match) {
                                                            match = ["", (elem ?? 'N/A'), ''];
                                                        }
                                                        const [, p1, p2] = match;
                                                        return (
                                                            <>
                                                                {p1 ? p1.toUpperCase() : ''}
                                                                {p2 ? <small>{p2}</small> : ''}
                                                            </>
                                                        );
                                                    })()}
                                                </span>}
                                            </div>
                                        </div>
                                        <p className="text-2xl orbitron ml-2"><b>{detalle.subcategoriaCatalogoId.cantidad}</b> <small>{detalle.subcategoriaCatalogoId.unidad}</small></p>
                                    </div>
                                    <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{detalle.multiplicador - detalle.restantes} <small>/</small> {detalle.multiplicador}</div>
                                </li>
                            ))}
                        </ul>
                    </div>)}

                    {!inputTemporalVisible ? <div className="absolute -bottom-2 flex flex-col w-full pr-4">
                        <div className="flex">
                            <button className={`text-white mx-2 h-12 w-12 flex text-sm border border-gray-300 rounded-lg p-1 mb-1 bg-blue-500`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setScanMode(false);
                                }}>
                                <BsQrCodeScan className="text-4xl" />
                            </button>
                            <button className={`relative w-full h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${loadState().complete ? 'bg-green-500 cursor-pointer' : loadState().partial ? 'bg-yellow-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                type="submit" disabled={!loadState().partial && !loadState().complete}>
                                <FaRoadCircleCheck className="text-4xl pb-0" />
                                <p className="ml-2 mt-2 text-md font-bold">{loadState().complete ? 'CARGA COMPLETA' : loadState().partial ? 'CARGA PARCIAL' : 'CARGA NO INICIADA'}</p>
                                <div className="absolute w-full top-0">
                                    <div className="w-full h-12 bg-gray-100 opacity-80"></div>
                                    <div className="absolute top-2 w-full"><Loader texto="" /></div>
                                </div>
                            </button>
                        </div>
                        <div className="flex items-center w-full mb-2 px-2">
                            <div className="flex-1 h-4 bg-gray-300 rounded overflow-hidden">
                                <div
                                    className="h-4 bg-green-500"
                                    style={{ width: `${0}%` }}
                                ></div>
                            </div>
                            <div className="ml-2 w-12 text-right font-bold text-gray-400 orbitron">
                                {0}%
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
                                        console.log("Código temporal ingresado:", e.currentTarget.value);
                                        setInputTemporalVisible(false);
                                        e.currentTarget.value = '';
                                    }
                                }}
                            />
                        </div>}


                </div>
            </div>
        )}

        {!cargamentos || cargamentos.length === 0 &&
            <div className="w-full py-6 px-12 bg-white mx-auto flex flex-col justify-center items-center">
                <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
            </div>
        }

        {modalConfirmarCargaParcial && <ModalConfirmarCargaParcial
            onClose={() => setModalConfirmarCargaParcial(false)}
            onConfirm={() => {
                postCargamento();
            }}
        />}

        {showModalNombreRetira && <QuienRecibeModal
            rutaId={cargamentos && cargamentos.length > 0 ? cargamentos[0].rutaId || "" : ""}
            onClose={() => setShowModalNombreRetira(false)}
        />}
    </div>);
}