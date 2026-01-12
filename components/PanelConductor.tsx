"use client";

import { useQuery } from "@tanstack/react-query";
import SoundPlayerProvider from "./context/SoundPlayerContext";
import { ChecklistProvider } from "./context/ChecklistContext";
import { ICilindroView, IRutaConductorView, IVehiculoView } from "@/types/types";
import { SessionProvider } from "next-auth/react";
import Nav from "./Nav";
import { Suspense, useState, useRef } from "react";
import Loader from "./Loader";
import InformacionDeCarga from "./prefabs/InformacionDeCarga";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import SelectorDeDestino from "./panelConductor/SelectorDeDestino";
import ConfirmacionLlegadaADestino from "./panelConductor/ConfirmacionLlegadaADestino";
import GestorDeDescarga from "./panelConductor/GestorDeDescarga";
import PowerScanView from "./prefabs/powerScan/PowerScanView";
import VehiculoView from "./prefabs/VehiculoView";
import { FaClipboardCheck } from "react-icons/fa";
import { Toaster } from "react-hot-toast";
import VolverABase from "./panelConductor/VolverABase";
import FinalizarRuta from "./panelConductor/FinalizarRuta";

export default function PanelConductor() {
    const [scanMode, setScanMode] = useState(false);
    const vehicleContainerRef = useRef<HTMLDivElement>(null);

    const { data: ruta, isLoading: isLoadingRuta } = useQuery<IRutaConductorView | null>({
        queryKey: ['ruta-despacho-conductor'],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/rutaAsignada`);
            const data = await response.json();
            if (!data.ruta) return null;
            console.log("Ruta de despacho del conductor:", data.ruta);
            return data.ruta;
        }
    });

    const { data: estado, isLoading: loadingEstado } = useQuery<number>({
        queryKey: ['estado-ruta-conductor', ruta?._id],
        queryFn: async () => {
            if (!ruta || !ruta._id) return 0;
            const response = await fetch(`/api/conductor/estadoRuta?rutaId=${ruta?._id}`);
            const data = await response.json();
            console.log("Estado de la ruta de despacho:", data.estado);
            return data.estado;
        },
        enabled: !!ruta,
        initialData: -1
    });

    const { data: cargados } = useQuery<ICilindroView[]>({
        queryKey: ['carga-vehiculo', ruta?._id],
        queryFn: async () => {
            if (!ruta || ruta === undefined) return [];
            const response = await fetch(`/api/conductor/cilindrosCargados?rutaId=${ruta._id}`);
            const data = await response.json();
            return data.cilindrosCargados;
        },
        enabled: !!ruta
    });

    const { data: descarga, isLoading: loadingDescarga } = useQuery<ICilindroView[]>({
        queryKey: ['descarga-vehiculo', ruta?._id],
        queryFn: async () => {
            if (!ruta) return [];
            const response = await fetch(`/api/conductor/cilindrosDescargados?rutaId=${ruta._id}`);
            const data = await response.json();
            return data.cilindrosDescargados;
        },
        enabled: !!ruta
    });

    return (<SessionProvider>
        <Suspense fallback={<Loader texto="Cargando panel" />}>
            <ChecklistProvider tipo="vehiculo">
                <SoundPlayerProvider>
                    {ruta && (
                        <div
                            ref={vehicleContainerRef}
                            className="fixed top-4 right-4 w-80 z-10"
                            style={{ maxHeight: '300px' }}
                        >
                            <VehiculoView
                                rutaId={ruta._id}
                                cargados={cargados || []}
                                descargados={descarga || []}
                                ref={vehicleContainerRef}
                            />
                        </div>
                    )}

                    <div className="w-full flex flex-col items-end fixed bottom-0 rounded-t-lg pt-3" style={{ zIndex: 101 }}>

                        {!isLoadingRuta && ruta && scanMode &&
                            <PowerScanView
                                setScanMode={setScanMode}
                                scanMode={scanMode}
                                rutaId={String(ruta._id)}
                                ventaId={ruta._id}
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

                            {estado === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada &&
                                <VolverABase rutaDespacho={ruta} />
                            }

                            {(estado === TIPO_ESTADO_RUTA_DESPACHO.regreso
                                || estado === TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado)
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
        </Suspense>
    </SessionProvider>);
}