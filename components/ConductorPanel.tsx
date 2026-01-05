"use client";

import { useQuery } from "@tanstack/react-query";
import SoundPlayerProvider from "./context/SoundPlayerContext";
import { ChecklistProvider } from "./context/ChecklistContext";
import { ICilindroView, IRutaConductorView, IVehiculoView } from "@/types/types";
import { SessionProvider } from "next-auth/react";
import Nav from "./Nav";
import { Suspense, useState } from "react";
import Loader from "./Loader";
import InformacionDeCarga from "./prefabs/InformacionDeCarga";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import SelectorDeDestino from "./panelConductor/SelectorDeDestino";
import ConfirmacionLlegadaADestino from "./panelConductor/ConfirmacionLlegadaADestino";
import GestorDeDescarga from "./panelConductor/GestorDeDescarga";
import PowerScanView from "./prefabs/powerScan/PowerScanView";
import VehiculoView from "./prefabs/VehiculoView";
import { FaClipboardCheck } from "react-icons/fa";

export default function ConductorPanel() {
    const [scanMode, setScanMode] = useState(false);

    const { data: ruta, isLoading: loadingRuta } = useQuery<IRutaConductorView | null>({
        queryKey: ['ruta-despacho-conductor'],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/rutaAsignada`);
            const data = await response.json();
            if(!data.ruta) return null;
            console.log("Ruta de despacho del conductor:", data.ruta);
            return data.ruta;
        }
    });

    const { data: estado, isLoading: loadingEstado } = useQuery<number>({
        queryKey: ['estado-conductor'],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/estadoRuta?rutaId=${ruta?._id ?? ''}`);  
            const data = await response.json();
            return data.estado;
        },
        enabled: !!ruta
    });    

    const { data: cargados, isLoading: loadingCargados } = useQuery<ICilindroView[]>({
        queryKey: ['carga-vehiculo'],
        queryFn: async () => {
            if(!ruta || ruta === undefined) return [];
            const response = await fetch(`/api/conductor/cilindrosCargados?rutaId=${ruta._id}`);
            const data = await response.json();
            return data.cilindrosCargados;
        },
        enabled: !!ruta
    });

    const { data: descarga, isLoading: loadingDescarga } = useQuery<ICilindroView[]>({
        queryKey: ['descarga-vehiculo'],
        queryFn: async () => {
            if(!ruta) return [];
            const response = await fetch(`/api/conductor/cilindrosDescargados?rutaId=${ruta._id}`);
            const data = await response.json();
            return data.cilindrosDescargados;
        },
        enabled: !!ruta
    });

    return (<SessionProvider>
        <Suspense fallback={<Loader texto="Cargando panel" />}>
            <ChecklistProvider tipo="vehiculo">                
                {ruta && <VehiculoView rutaId={ruta._id} cargados={cargados || []} descargados={descarga || []} />}

                <div className="w-full flex flex-col items-end fixed bottom-0">

                    {!loadingRuta && ruta && ruta && scanMode && <PowerScanView
                        setScanMode={setScanMode}
                        scanMode={scanMode}
                        rutaId={String(ruta._id)}
                        ventaId={ruta._id} />}

                    {!loadingEstado && ruta && <div className="w-full h-screen flex flex-col justify-end px-4 -mb-1 space-y-4">

                        {(estado === TIPO_ESTADO_RUTA_DESPACHO.preparacion ||
                            estado === TIPO_ESTADO_RUTA_DESPACHO.orden_cargada) && ruta &&
                            <InformacionDeCarga rutaDespacho={ruta} 
                                estado={estado}/>}

                        {(estado === TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                            || estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino) &&
                            <SelectorDeDestino rutaDespacho={ruta} />}

                        {estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta &&
                            <ConfirmacionLlegadaADestino 
                                rutaDespacho={ruta}
                                estado={estado} />}

                        {estado === TIPO_ESTADO_RUTA_DESPACHO.descarga && <>
                            <SoundPlayerProvider>
                                {scanMode &&
                                    <PowerScanView setScanMode={setScanMode}
                                        scanMode={scanMode}
                                        rutaId={ruta._id}
                                        ventaId={null} />}
                            </SoundPlayerProvider>
                            <GestorDeDescarga 
                                rutaDespacho={ruta} 
                                estado={estado} 
                                carga={cargados || []} 
                                descarga={descarga || []} />
                        </>}
                    </div>}
                </div>
                {loadingRuta && <div className="w-full flex flex-col h-screen items-center justify-center">
                    <Loader texto="Cargando información" />
                </div>}

                {!loadingRuta && !ruta && <div className="w-full h-screen py-6 px-12 bg-white mx-auto flex flex-col justify-center items-center">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                </div>}
            </ChecklistProvider>
            <Nav />
        </Suspense>
    </SessionProvider>);
}