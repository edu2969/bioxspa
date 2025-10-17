"use client";

import Link from 'next/link';
import { TbReportMoney, TbTruckLoading } from 'react-icons/tb';
import { useState } from 'react';
import Loader from '@/components/Loader';

export default function HomeDespacho({ contadores }) {
    const [routingIndex, setRoutingIndex] = useState(-1);
    
    return (
        <main className="w-full h-screen flex items-center justify-center">
            <div className={`absolute w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-4 px-12 ${routingIndex === -2 ? "opacity-20" : ""}`}>
                <div className="relative">
                    <Link
                        href="/modulos/homeDespacho/pedidos"
                        onClick={() => setRoutingIndex(0)}
                        className="relative"
                    >
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex === 0 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <TbTruckLoading className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>PEDIDOS</span>
                            <div className={`absolute top-12 right-24 ${contadores.preparacion > 0 ? "bg-red-500" : "bg-green-500"} text-white text-md font-bold rounded-full pl-1 w-8 h-8 flex items-center justify-center`}>
                                <span className="text-sm mr-1">{contadores.ordenes}</span>
                            </div>
                            {routingIndex === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <Loader texto="" />
                                </div>
                            )}
                        </div>
                    </Link>
                </div>
                <div className="relative">
                    <Link
                        href="/modulos/comisiones"
                        onClick={() => setRoutingIndex(1)}
                        className="relative"
                    >
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex === 1 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <TbReportMoney className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>MIS RENTAS</span>
                            {routingIndex === 1 && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <Loader texto="" />
                                </div>
                            )}
                        </div>
                    </Link>
                </div>
            </div>
            {routingIndex === -2 && (
                <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                    <Loader texto="Cargando panel" />
                </div>
            )}
        </main>
    );
}