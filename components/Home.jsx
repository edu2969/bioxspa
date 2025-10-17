"use client";

import { useEffect, useState, useRef } from "react";
import HomeAdministrador from "./HomeAdministrador";
import HomeConductor from "./HomeConductor";
import HomeDespacho from "./HomeDespacho";
import HomeGerencia from "./branch/BranchBussinessView";
import { USER_ROLE } from "@/app/utils/constants";
import { socket } from '@/lib/socket-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CheckList from "@/components/CheckList";
import { TIPO_CHECKLIST } from "@/app/utils/constants";
import { useOnVisibilityChange } from '@/components/uix/useOnVisibilityChange';    
import { useSession } from "next-auth/react";
import reproducirSonido from '@/app/utils/sounds'; // Agregar import

export default function Home() {
    const [checklists, setChecklists] = useState([]);
    const [counters, setCounters] = useState({});
    const [routingIndex, setRoutingIndex] = useState(-2);
    const [loadingChecklist, setLoadingChecklist] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const { data: session, status } = useSession();
    
    // Referencias para comparar cambios
    const prevCountersRef = useRef({});
    const prevChecklistsRef = useRef([]);
    const isFirstLoadRef = useRef(true);

    const faltaChecklistPersonal = () => {
        if (!session || !session.user) return false;
        if(routingIndex === -2) return true; // Si aún no se ha cargado el home, no mostrar checklist
        const requiereChecklist = session?.user?.role === USER_ROLE.conductor || session?.user?.role === USER_ROLE.despacho || session?.user?.role === USER_ROLE.encargado;
        if (!requiereChecklist) return false;
        if(!checklists || checklists.length === 0) return true;
        const checklistPersonal = checklists.find(checklist => checklist.tipo === TIPO_CHECKLIST.personal && checklist.aprobado);        
        return !checklistPersonal || !checklistPersonal.aprobado || checklistPersonal.fecha < new Date(new Date().setHours(0, 0, 0, 0));
    }

    // Función para detectar cambios en counters
    const hasCountersChanged = (newCounters, prevCounters) => {
        if (!prevCounters || Object.keys(prevCounters).length === 0) return false;
        
        const keys = [...new Set([...Object.keys(newCounters), ...Object.keys(prevCounters)])];
        
        return keys.some(key => {
            const newValue = newCounters[key] || 0;
            const prevValue = prevCounters[key] || 0;
            return newValue !== prevValue;
        });
    };

    // Función para detectar cambios en checklists
    const hasChecklistsChanged = (newChecklists, prevChecklists) => {
        if (!prevChecklists || prevChecklists.length === 0) return false;
        
        if (newChecklists.length !== prevChecklists.length) return true;
        
        return newChecklists.some((newItem, index) => {
            const prevItem = prevChecklists[index];
            if (!prevItem) return true;
            
            return (
                newItem.tipo !== prevItem.tipo ||
                newItem.aprobado !== prevItem.aprobado ||
                new Date(newItem.fecha).getTime() !== new Date(prevItem.fecha).getTime()
            );
        });
    };
    
    useOnVisibilityChange(() => {
        const fetch = async () => {
            setRoutingIndex(-2);
            await fetchDataHome();
        }
        fetch('/api/ventas/lastUpdate')
            .then(res => res.json())
            .then(data => {
                if (data.ok && data.updatedAt) {
                    const updatedAt = new Date(data.updatedAt);
                    if (updatedAt > lastUpdate) {
                        setLastUpdate(updatedAt);
                        fetch();
                    }
                }
            })
            .catch(() => {});
    });

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
                // Detectar cambios antes de actualizar el estado
                const countersChanged = hasCountersChanged(data.contadores, prevCountersRef.current);
                const checklistsChanged = hasChecklistsChanged(data.checklists, prevChecklistsRef.current);
                
                // Reproducir sonido si hay cambios (pero no en la primera carga)
                if (!isFirstLoadRef.current && (countersChanged || checklistsChanged)) {
                    console.log("Cambios detectados - reproduciendo sonido");
                    reproducirSonido('/sounds/bubble_01.mp3');
                }
                
                // Actualizar referencias previas
                prevCountersRef.current = { ...data.contadores };
                prevChecklistsRef.current = [...data.checklists];
                
                // Actualizar estados
                setCounters(data.contadores);
                setChecklists(data.checklists);
                setRoutingIndex(-1);
                
                // Marcar que ya no es la primera carga
                isFirstLoadRef.current = false;
            } else {
                toast.warn("No se pudieron cargar los contadores");
            }
            setRoutingIndex(-1);
        } catch (error) {
            console.error('Error fetching counters:', error);
        }
    }

    useEffect(() => {
        if(!session || !session.user) return;
        fetchDataHome();
    }, [session, fetchDataHome]);

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
    }, [fetchDataHome]);

    return (
        <div>
            {(session && session.user.role == USER_ROLE.neo) && <div>yGa</div>}
            {(session && session.user.role == USER_ROLE.gerente) && <HomeGerencia session={session} contadores={counters} checklists={checklists} />}
            {(session && (session.user.role == USER_ROLE.cobranza || session.user.role == USER_ROLE.encargado) && <HomeAdministrador contadores={counters}/>)}
            {(session && (session.user.role == USER_ROLE.despacho || session.user.role === USER_ROLE.responsable)) && <HomeDespacho contadores={counters}/>}
            {(session && session.user.role == USER_ROLE.conductor) && <HomeConductor contadores={counters} checklists={checklists} />}

            {routingIndex == -1 && faltaChecklistPersonal() 
                && <CheckList session={session} tipo={TIPO_CHECKLIST.personal} 
                onFinish={onFinish} loading={loadingChecklist}/>}

            {status == 'loading' || routingIndex == -2 && <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-xl font-bold">Cargando panel</p>
            </div>}
            <ToastContainer />
        </div>
    )
}