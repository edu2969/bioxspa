"use client";

import { useEffect, useState } from "react";
import HomeAdministrador from "./HomeAdministrador";
import HomeConductor from "./HomeConductor";
import HomeDespacho from "./HomeDespacho";
import HomeGerencia from "./branch/BranchBussinessView";
import { USER_ROLE } from "@/app/utils/constants";
import { socket } from '@/lib/socket-client';
import Loader from './Loader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CheckList from "@/components/CheckList";
import { TIPO_CHECKLIST } from "@/app/utils/constants";

export default function Home({ session }) {
    const [checklists, setChecklists] = useState([]);
    const [counters, setCounters] = useState({});
    const [routingIndex, setRoutingIndex] = useState(-2);
    const [loadingChecklist, setLoadingChecklist] = useState(false);

    const faltaChecklistPersonal = () => {
        if(!checklists || checklists.length === 0) return true;
        const checklistPersonal = checklists.find(checklist => checklist.tipo === TIPO_CHECKLIST.personal && checklist.aprobado);
        console.log("Checklist personal:", checklistPersonal);
        return !checklistPersonal || !checklistPersonal.aprobado || checklistPersonal.fecha < new Date(new Date().setHours(0, 0, 0, 0));
    }   

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
                const data = await res.json();
                if (data.passed) {
                    setChecklists([{
                        tipo: TIPO_CHECKLIST.personal,
                        aprobado: true,
                        fecha: new Date()
                    }]);
                    socket.emit("update-pedidos", {
                        userId: session.user.id
                    });
                    toast.success("Checklist guardado correctamente");
                } else {
                    setChecklists([{
                        tipo: TIPO_CHECKLIST.personal,
                        aprobado: false,
                        fecha: new Date()
                    }]);
                    toast.error("Avisa sobre tu rechazo. ¡Gracias!");
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
    
    async function fetchDataHome() {
        try {
            const response = await fetch('/api/home');
            const data = await response.json();                
            console.log("Fetched counters:", data);
            if (data.ok) {
                setCounters(data.contadores);
                setChecklists(data.checklists);
                setRoutingIndex(-1);
            } else {
                toast.warn("No se pudieron cargar los contadores");
            }
            setRoutingIndex(-1);
        } catch (error) {
            console.error('Error fetching counters:', error);
        }
    }

    useEffect(() => {
        console.log("SESSION", session);
        fetchDataHome();
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
            fetchDataHome();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, []);


    return (
        <div>
            {(session && session.user.role == USER_ROLE.neo) ? <div>yGa</div> :
                (session && session.user.role == USER_ROLE.gerente) ? <HomeGerencia session={session} contadores={counters} checklists={checklists} /> :
                (session && session.user.role == USER_ROLE.conductor) ? <HomeConductor contadores={counters} checklists={checklists} /> :
                (session && session.user.role == USER_ROLE.despacho) ? <HomeDespacho session={session} contadores={counters} checklists={checklists} /> :
                <HomeAdministrador contadores={counters}/>}

            {routingIndex == -1 && faltaChecklistPersonal() 
                && <CheckList session={session} tipo={TIPO_CHECKLIST.personal} 
                onFinish={onFinish} loading={loadingChecklist}/>}

            {routingIndex == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                <Loader texto="Cargando panel" />
            </div>}            
            <ToastContainer />
        </div>
    )
}