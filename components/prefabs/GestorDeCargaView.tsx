"use client";

import React from "react";
import toast from "react-hot-toast";
import { IGestorDeCargaView } from "./types";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";
import { getNUCode } from "@/lib/nuConverter";
import { useQuery } from "@tanstack/react-query";
import { FaClipboardCheck } from "react-icons/fa";

export default function GestorDeCargaView({ vehiculoId }: { vehiculoId: string | undefined }) {
    const { data: cargamento } = useQuery<IGestorDeCargaView>({
        queryKey: ['cargamento', vehiculoId],
        queryFn: async () => {
            const response = await fetch(`/api/flota/gestorCarga?vehiculoId=${vehiculoId}`);
            const data = await response.json();
            return data;
        },
        enabled: !!vehiculoId
    });
    
    return (<div className="flex flex-col w-full">
        {cargamento && cargamento.ventas && cargamento.ventas.map((venta, vidx) => <div key={`venta_${vidx}`} className="w-full mb-2">
            <div className="w-full flex items-center justify-between px-2 py-1 border border-gray-300 rounded-lg bg-white">
                <div className="w-full">
                    <p className="text-md text-blue-700 font-bold truncate">{venta.nombreCliente || "Sin cliente"}</p>
                    <div className="text-sm font-bold text-gray-700">
                        <p>ENTREGA DE CILINDROS</p>
                        <span className="text-xs">Escanee cilindros a entregar</span>
                    </div>
                </div>
                <div className={`relative flex justify-end ${venta.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                    <div className="mr-2 cursor-pointer mt-0" onClick={(e) => {
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
            <ul className="flex-1 flex flex-wrap items-center justify-center mt-2 mb-20">
                {venta.detalles.map((detalle, idx) => (
                    <li
                        key={`descarga_${idx}`}
                        className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && venta.detalles.length != 1) ? 'rounded-t-lg' : (idx === venta.detalles.length - 1 && venta.detalles.length != 1) 
                            ? 'rounded-b-lg' : venta.detalles.length === 1 ? 'rounded-lg' : ''} ${detalle.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : detalle.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                    >
                        <div className="w-full flex items-left">
                            <div className="flex">
                                <div>
                                    <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(detalle.elemento)}</div>
                                    {detalle.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                    {detalle.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                </div>
                                <div className="font-bold text-xl ml-2">
                                    {detalle.elemento && <span>
                                        {(() => {
                                            const elem = detalle.elemento;
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
                            <p className="text-2xl orbitron ml-2"><b>{detalle.cantidad}</b> <small>{detalle.unidad}</small></p>
                        </div>
                        <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{detalle.multiplicador - detalle.restantes} <small>/</small> {detalle.multiplicador}</div>
                    </li>
                ))}
            </ul>
        </div>)}
        {cargamento && !cargamento.ventas &&
                <div className="w-full py-6 px-12 bg-white mx-auto">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                    <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
                </div>
        }
    </div>);
}