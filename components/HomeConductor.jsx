"use client";
import Link from 'next/link';
import { FaRoute } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';
import Loader from './Loader';
import CheckList from './CheckList';
import { TIPO_CHECKLIST } from '@/app/utils/constants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function HomeConductor({ session }) {
    const [tienePedidos, setTienePedidos] = useState(false);
    const [routingIndex, setRoutingIndex] = useState(-2);
    const [checklistsHechos, setChecklistsHechos] = useState([]);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    const faltaChecklistPersonal = () => {
        const checklistPersonal = checklistsHechos.find(checklist => checklist.tipo === TIPO_CHECKLIST.personal);
        console.log("Checklist personal:", checklistPersonal);
        return !checklistPersonal || !checklistPersonal.aprobado || checklistPersonal.fecha < new Date(new Date().setHours(0, 0, 0, 0));
    }    

    const faltaChecklistVehiculo = () => {
        const checklistVehiculo = checklistsHechos.find(checklist => checklist.tipo === TIPO_CHECKLIST.vehiculo);
        console.log("Checklist vehiculo:", checklistVehiculo);
        return !checklistVehiculo || !checklistVehiculo.aprobado || checklistVehiculo.fecha < new Date(new Date().setHours(0, 0, 0, 0));
    }    

    const fetchPanel = async () => {
        try {
            const response = await fetch("/api/home/chofer", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            console.log("Datos recibidos de la API:", data);
            setTienePedidos(data.tienePedidos);
            setChecklistsHechos(data.checklists);
            setRoutingIndex(-1);
        } catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    }

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
            fetchPanel();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, []);

    useEffect(() => {
        fetchPanel();
    }, []);

    const onFinish = (checklist) => {
            console.log("Checklist completed", checklist);
            checklist.tipo = TIPO_CHECKLIST.personal;
            setLoadingChecklist(true);
            fetch('/api/users/checklist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checklist),
            })
            .then(async (res) => {
                if(res.ok) {                    
                    setChecklistsHechos([{
                        tipo: TIPO_CHECKLIST.personal,
                        aprobado: true,
                        fecha: new Date()
                    }]);
                    socket.emit("update-pedidos", {
                        userId: session.user.id
                    });
                    toast.success("Checklist guardado correctamente");        
                }
            })
            .catch((err) => {
                console.error('Error al guardar el checklist:', err);
                toast.error("Error al guardar el checklist. Por favor, inténtelo más tarde.", {
                    position: "top-center"
                });
            })
            .finally(() => {
                setLoadingChecklist(false);
            });
        };

    return (
        <main className="w-full h-screen flex items-center justify-center">
            <div className={`absolute w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-4 px-12 ${routingIndex == -2 ? "opacity-20" : ""}`}>
                <div className="relative">
                    <Link href="/modulos/homeConductor/pedidos" onClick={() => setRoutingIndex(0)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 0 ? "opacity-20" : ""} ${faltaChecklistVehiculo() ? "border-red-500 bg-red-200" : ""}`}>  
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <FaRoute className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>PEDIDOS</span>
                        </div>
                        {tienePedidos ? (
                            <div className="absolute top-8 right-24 bg-blue-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                                <span className="text-lg mr-1">1</span>
                            </div>
                        ) : (
                            <div className="absolute top-8 right-24 bg-green-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                                <span className="text-lg mr-1">0</span>
                            </div>
                        )}
                        {faltaChecklistVehiculo() && (
                            <div className="absolute top-4 left-4">
                                <div className="flex items-center">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                    <span className="text-xs text-red-500">Falta checklist</span>
                                </div>
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
                    <Link href="/modulos/comisiones" className="relative" onClick={() => setRoutingIndex(1)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 1 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <TbReportMoney className="mx-auto mb-1" size="6rem" />
                            </div>
                            <span>MIS RENTAS</span>
                        </div>
                    </Link>
                    {routingIndex == 1 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader texto="Cargador 2..." />
                        </div>
                    </div>}
                </div>
            </div>
            {routingIndex == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                <Loader texto="Cargando panel" />
            </div>}
            {routingIndex == -1 && faltaChecklistPersonal() && !loadingChecklist && <CheckList session={session} tipo={TIPO_CHECKLIST.personal} onFinish={onFinish}/>}
            <ToastContainer/>
        </main>
    );
}