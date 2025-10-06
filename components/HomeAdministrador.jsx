"use client";
import Link from 'next/link';
import { FaSignInAlt } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import Loader from './Loader';
import { useState } from 'react';
import { HiUserGroup } from 'react-icons/hi';

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
                contadores?.asignaciones?.porAsignar > 0 && {
                    color: "bg-red-500",
                    value: contadores.asignaciones.porAsignar > 999999 ? '999999+' : contadores.asignaciones.porAsignar,
                    text: "x ASIGNAR"
                },
                contadores?.asignaciones?.preparacion > 0 && {
                    color: "bg-blue-500",
                    value: contadores.asignaciones.preparacion > 999999 ? '999999+' : contadores.asignaciones.preparacion,
                    text: "x PREPARAR"
                },
                contadores?.asignaciones?.enRuta > 0 && {
                    color: "bg-blue-500",
                    value: contadores.asignaciones.enRuta > 999999 ? '999999+' : contadores.asignaciones.enRuta,
                    text: "en RUTA"
                }
            ].filter(Boolean)
        },
        {
            href: "/modulos/cobros",
            icon: TbReportMoney,
            label: "COBROS",
            index: 2
        },
        {
            href: "/modulos/configuraciones/clientes",
            icon: HiUserGroup,
            label: "CLIENTES",
            index: 3,
            badges: [
                contadores?.clientes?.activos > 0 && {
                    color: "bg-green-500",
                    value: contadores?.clientes?.activos > 999999 ? '999999+' : contadores?.clientes?.activos,
                    text: "x ACTIVOS"
                },
                contadores?.clientes?.sinCredito > 0 && {
                    color: "bg-red-500",
                    value: contadores?.clientes?.sinCredito > 999999 ? '999999+' : contadores?.clientes?.sinCredito,
                    text: "s/CREDITO"
                },
                contadores?.clientes?.enQuiebra > 0 && {
                    color: "bg-gray-500",
                    value: contadores?.clientes?.enQuiebra > 999999 ? '999999+' : contadores?.clientes?.enQuiebra,
                    text: "en QUIEBRA"
                },
                contadores?.clientes?.pendientes > 0 && {
                    color: "bg-orange-500",
                    value: contadores?.clientes?.pendientes > 999999 ? '999999+' : contadores?.clientes?.pendientes,
                    text: "x PENDIENTES"
                }
            ]
        }
    ];

    return (
        <main className="w-full min-h-screen flex flex-col justify-center items-center p-4 md:p-6 max-w-2xl mx-auto mt-0">
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
                            <div className={`absolute top-2 md:top-6 flex flex-col gap-2 z-10 ${mod.index % 2 === 0 ? '-left-8' : '-right-8'}`}>
                                {mod.badge && (
                                    <div className={`${mod.badge.color} text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center`}>
                                        <span className="text-sm mr-1">{mod.badge.value}</span>
                                        <span className="text-xs mt-0.5">{mod.badge.text}</span>
                                    </div>
                                )}
                                {mod.badges && mod.badges.filter(badge => badge.value > 0).map((badge, idx) => (
                                    <div key={idx} className={`${badge.color} text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center`}>
                                        <span className="text-sm mr-1">{badge.value}</span>
                                        <span className="text-xs mt-0.5">{badge.text}</span>
                                    </div>
                                ))}
                            </div>                            
                        </Link>
                        {routingIndex != -1 && routingIndex == mod.index && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="w-full h-full flex items-center justify-center">
                                    <Loader texto="" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {routingIndex == -2 && <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-xl font-bold">Cargando panel</p>
            </div>}
        </main>
    );
}
