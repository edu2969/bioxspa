"use client";

import { useQuery } from "@tanstack/react-query";
import SoundPlayerProvider from "./context/SoundPlayerContext";
import { ChecklistProvider } from "./context/ChecklistContext";
import { ICilindroView, IRutaConductorView } from "@/types/types";
import Nav from "./Nav";
import { useState, useRef, useEffect, Suspense } from "react";
import Loader from "./Loader";
import InformacionDeCarga from "./_prefabs/InformacionDeCarga";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import SelectorDeDestino from "./panelConductor/SelectorDeDestino";
import ConfirmacionLlegadaADestino from "./panelConductor/ConfirmacionLlegadaADestino";
import GestorDeDescarga from "./panelConductor/GestorDeDescarga";
import PowerScanView from "./_prefabs/powerScan/PowerScanView";
import VehiculoView from "./_prefabs/VehiculoView";
import { FaClipboardCheck } from "react-icons/fa";
import { Toaster } from "react-hot-toast";
import VolverABase from "./panelConductor/VolverABase";
import FinalizarRuta from "./panelConductor/FinalizarRuta";
import { useUser } from "./providers/UserProvider";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";

export default function PanelConductor() {
    const [scanMode, setScanMode] = useState(false);
    const vehicleContainerRef = useRef<HTMLDivElement>(null);
    const { user, loading: loadingUser } = useUser();
    const userId = user?.id || null;

    useRealtimeQuery({
        channelName: `rutas-despacho-conductores`,
        schema: 'public',
        table: 'rutas_despacho',
        event: '*',
        queryKeys: [
            ['ruta-despacho-conductor', userId],
            ['estado-ruta-conductor', userId],
            ['carga-vehiculo', userId],
            ['descarga-vehiculo', userId]
        ],
        enabled: !!userId,
    });

    const { data: ruta, isLoading: isLoadingRuta } = useQuery<IRutaConductorView | null>({
        queryKey: ['ruta-despacho-conductor', userId],
        queryFn: async () => {
            if (!userId) return null;
            const response = await fetch(`/api/conductor/rutaAsignada?usuarioId=${userId}`);
            const data = await response.json();
            console.log("Ruta de despacho del conductor:", data);
            if (!response.ok || !data?.ok) return null;
            if (!data?.ruta) return null;
            return data.ruta as IRutaConductorView;
        },
        enabled: !!userId
    });

    const { data: estado, isLoading: loadingEstado } = useQuery<number>({
        queryKey: ['estado-ruta-conductor', userId, ruta?.id],
        queryFn: async () => {
            if (!ruta || !ruta.id) return 0;
            const response = await fetch(`/api/conductor/estadoRuta?rutaId=${ruta.id}`);
            const data = await response.json();
            console.log("Estado de la ruta de despacho:", data.estado);
            return data.estado;
        },
        enabled: !!userId && !!ruta?.id,
        initialData: -1
    });

    const { data: cargados } = useQuery<ICilindroView[]>({
        queryKey: ['carga-vehiculo', userId, ruta?.id],
        queryFn: async () => {
            if (!ruta || !ruta.id) return [];
            const response = await fetch(`/api/conductor/cilindrosCargados?rutaId=${ruta.id}`);
            const data = await response.json();
            return data.cilindrosCargados;
        },
        enabled: !!userId && !!ruta?.id
    });

    const { data: descarga, isLoading: loadingDescarga } = useQuery<ICilindroView[]>({
        queryKey: ['descarga-vehiculo', userId, ruta?.id],
        queryFn: async () => {
            if (!ruta || !ruta.id) return [];
            const response = await fetch(`/api/conductor/cilindrosDescargados?rutaId=${ruta.id}`);
            const data = await response.json();
            return data.cilindrosDescargados;
        },
        enabled: !!userId && !!ruta?.id
    });

    useEffect(() => {
        console.log("loadingUser", loadingUser);
    }, [loadingUser]);

    return (<Suspense fallback={(<div className="w-full flex flex-col h-screen items-center justify-center">
        <Loader texto="Cargando sesión" />
    </div>)}>
        <ChecklistProvider tipo="vehiculo">

            <SoundPlayerProvider>
                {ruta && (<div className="w-full flex flex-row items-center justify-between">
                    <div
                        ref={vehicleContainerRef}
                        className="w-full mx-auto top-4 right-4 z-10"
                        style={{ maxHeight: '45vh' }}
                    >
                        <VehiculoView
                            rutaId={ruta.id}
                            cargados={cargados || []}
                            descargados={descarga || []}
                            ref={vehicleContainerRef}
                        />
                    </div>
                </div>
                )}

                <div className="w-full flex flex-col items-end fixed bottom-0 rounded-t-lg pt-3" style={{ zIndex: 101 }}>

                    {!isLoadingRuta && ruta && scanMode &&
                        <PowerScanView
                            setScanMode={setScanMode}
                            scanMode={scanMode}
                            rutaId={String(ruta.id)}
                            ventaId={ruta.id}
                            operacion="descargar" />}

                    {!loadingEstado && !isLoadingRuta && ruta && estado != -1 && <div className="w-full h-screen flex flex-col justify-end -mb-1 space-y-4">

                        {(estado === TIPO_ESTADO_RUTA_DESPACHO.preparacion ||
                            estado === TIPO_ESTADO_RUTA_DESPACHO.orden_cargada) && ruta &&
                            <InformacionDeCarga rutaDespacho={ruta}
                                estado={estado} />}

                        {(estado === TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                            || estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino) &&
                            <SelectorDeDestino rutaDespacho={ruta} />}

                        {estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta &&
                            <ConfirmacionLlegadaADestino
                                rutaDespacho={ruta}
                                estado={estado} />}

                        {estado === TIPO_ESTADO_RUTA_DESPACHO.descarga && (isLoadingRuta ? <Loader texto="Cargando ruta..." /> :
                            <GestorDeDescarga
                                rutaDespacho={ruta}
                                setScanMode={setScanMode} />)}

                        {(estado === TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado
                        || estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) &&
                            <VolverABase rutaDespacho={ruta} />
                        }

                        {estado === TIPO_ESTADO_RUTA_DESPACHO.regreso
                            &&
                            <FinalizarRuta
                                rutaDespacho={ruta}
                                estado={estado} />}

                    </div>}
                </div>
                {isLoadingRuta && <div className="w-full flex flex-col h-screen items-center justify-center">
                    <Loader texto="Cargando información" />
                </div>}

                {!isLoadingRuta && !loadingDescarga && !ruta && <div className="w-full h-screen py-6 px-12 bg-white mx-auto flex flex-col justify-center items-center">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                </div>}

            </SoundPlayerProvider>
        </ChecklistProvider>
        <Nav />
        <Toaster />
    </Suspense>);
}