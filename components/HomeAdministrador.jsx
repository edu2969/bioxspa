"use client";
import Link from 'next/link';
import { FaSignInAlt } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';
import Loader from './Loader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function HomeAdministrador({ session }) {
    const [counters, setCounters] = useState({
        pedidosCount: 0,
        asignacionCounts: {
            porAsignar: 0,
            preparacion: 0,
            enRuta: 0,
        },
        deudasCount: 0,
    });
    const [routingIndex, setRoutingIndex] = useState(-2);

    useEffect(() => {
        async function fetchCounters() {
            try {
                const response = await fetch('/api/home/administrador');
                const data = await response.json();                
                console.log("Fetched counters:", data);
                if(data.ok) {
                    setCounters(data.resultado);
                } else {
                    toast.warn("No se pudieron cargar los contadores");
                }
                setRoutingIndex(-1);
            } catch (error) {
                console.error('Error fetching counters:', error);
            }
        }

        console.log("SESSION", session);

        fetchCounters();
    }, [session]);

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
        socket.on("update-pedidos", () => {
            fetchCounters();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, []);

    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-7">
            <div className={`absolute w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-4 px-12 ${routingIndex == -2 ? "opacity-20" : ""}`}>
                <div className="relative">
                    <Link href="/modulos/pedidos" onClick={() => setRoutingIndex(0)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 0 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <FaFileContract className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>PEDIDOS</span>
                        </div>
                        {counters.pedidosCount > 0 && (
                            <div className="absolute top-6 -left-10 bg-red-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                                <span className="text-sm mr-1">{counters.pedidosCount > 999999 ? '999999+' : counters.pedidosCount}</span>
                                <span className="text-xs mt-0.5">x APROBAR</span>
                            </div>
                        )}
                    </Link>
                    {routingIndex == 0 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader texto="" />
                        </div>
                    </div>}
                </div>
                <div className="relative">
                    <Link href="/modulos/asignacion" onClick={() => setRoutingIndex(1)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 1 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <FaSignInAlt className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>ASIGNACION</span>
                        </div>
                        {counters.asignacionCounts.porAsignar > 0 && (
                            <div className="absolute top-6 -right-10 bg-red-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                                <span className="text-sm mr-1">{counters.asignacionCounts.porAsignar > 999999 ? '999999+' : counters.asignacionCounts.porAsignar}</span>
                                <span className="text-xs mt-0.5">x POR ASIGNAR</span>
                            </div>
                        )}
                        {counters.asignacionCounts.preparacion > 0 && (
                            <div className="absolute top-6 -right-10 bg-yellow-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                                <span className="text-sm mr-1">{counters.asignacionCounts.preparacion > 999999 ? '999999+' : counters.asignacionCounts.preparacion}</span>
                                <span className="text-xs mt-0.5">x EN PREPARACION</span>
                            </div>
                        )}
                        
                        {counters.asignacionCounts.enRuta > 0 && (
                            <div className="absolute top-6 -right-10 bg-blue-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                                <span className="text-sm mr-1">{counters.asignacionCounts.enRuta > 999999 ? '999999+' : counters.asignacionCounts.enRuta}</span>
                                <span className="text-xs mt-0.5">x EN RUTA</span>
                            </div>
                        )}
                    </Link>
                    {routingIndex == 1 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader texto="" />
                        </div>
                    </div>}
                </div>
                <div className="relative">
                    <Link href="/modulos/deudas" onClick={() => setRoutingIndex(2)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 2 ? "opacity-20" : ""}`}>  
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <TbReportMoney className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>DEUDAS</span>
                        </div>
                    </Link>
                    {routingIndex == 2 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader texto="" />
                        </div>
                    </div>}
                </div>
                {routingIndex == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                    <Loader texto="Cargando panel" />
                </div>}
            </div>
            <ToastContainer />
        </main>
    );
}