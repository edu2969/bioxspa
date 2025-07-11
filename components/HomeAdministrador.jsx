"use client";
import Link from 'next/link';
import { FaSignInAlt } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import Loader from './Loader';
import { useState } from 'react';

export default function HomeAdministrador({ contadores }) {
    const [routingIndex, setRoutingIndex] = useState(-1);

    const modules = [
        {
            href: "/modulos/pedidos",
            icon: FaFileContract,
            label: "PEDIDOS",
            index: 0,
            badge: contadores?.pedidos > 0 && {
                color: "bg-red-500",
                value: contadores.pedidos > 999999 ? '999999+' : contadores.pedidos,
                text: "x APROBAR"
            }
        },
        {
            href: "/modulos/asignacion",
            icon: FaSignInAlt,
            label: "ASIGNACION",
            index: 1,
            badges: [
                contadores?.porAsignar > 0 && {
                    color: "bg-red-500",
                    value: contadores.porAsignar > 999999 ? '999999+' : contadores.porAsignar,
                    text: "x POR ASIGNAR"
                },
                contadores?.preparacion > 0 && {
                    color: "bg-yellow-500",
                    value: contadores.preparacion > 999999 ? '999999+' : contadores.preparacion,
                    text: "x EN PREPARACION"
                },
                contadores?.enRuta > 0 && {
                    color: "bg-blue-500",
                    value: contadores.enRuta > 999999 ? '999999+' : contadores.enRuta,
                    text: "x EN RUTA"
                }
            ].filter(Boolean)
        },
        {
            href: "/modulos/deudas",
            icon: TbReportMoney,
            label: "DEUDAS",
            index: 2
        }
    ];

    return (
        <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0 md:mt-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {modules.map((mod, i) => (
                    <div key={`mod_${i}`} className="relative flex justify-center items-center">
                        <Link href={mod.href} onClick={() => setRoutingIndex(mod.index)} className="w-full">
                            <div className={`w-full shadow-lg rounded-lg py-6 md:py-8 px-6 md:px-8 hover:scale-105 border-2 hover:border-blue-100 text-center relative transition-all duration-150 ${routingIndex == mod.index ? "opacity-20" : ""}`}>
                                <div className="w-full flex justify-center items-center text-slate-500 mb-2">
                                    <mod.icon size="3rem" className="md:hidden" />
                                    <mod.icon size="6rem" className="hidden md:block" />
                                </div>
                                <span className="text-base md:text-lg font-semibold">{mod.label}</span>
                            </div>
                            {mod.badge && (
                                <div className={`absolute top-2 md:top-6 left-2 ${mod.badge.color} text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center`}>
                                    <span className="text-sm mr-1">{mod.badge.value}</span>
                                    <span className="text-xs mt-0.5">{mod.badge.text}</span>
                                </div>
                            )}
                            {mod.badges && mod.badges.map((badge, idx) => (
                                <div key={idx} className={`absolute top-2 md:top-6 right-2 ${badge.color} text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center mt-${idx * 7}`}>
                                    <span className="text-sm mr-1">{badge.value}</span>
                                    <span className="text-xs mt-0.5">{badge.text}</span>
                                </div>
                            ))}
                        </Link>
                        {routingIndex == mod.index && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="w-full h-full flex items-center justify-center">
                                    <Loader texto="" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {routingIndex == -2 && (
                <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                    <Loader texto="Cargando panel" />
                </div>
            )}
        </main>
    );
}
