"use client";

import React, { useState } from "react";
import InputManualCodeView from "./InputManualCodeView";
import { PowerScanOptionsModal } from "@/components/modals/PowerScanOptionsModal";
import toast from "react-hot-toast";
import type { IItemCatalogoPowerScanView } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSoundPlayer } from "@/components/context/SoundPlayerContext";

export default function PowerScanView({ 
    scanMode, 
    setScanMode,
    rutaId,
    ventaId,
    operacion
} : {
    scanMode: boolean;
    setScanMode: (mode: boolean) => void,
    rutaId: string | null;
    ventaId: string | null;
    operacion: 'cargar' | 'descargar' | 'gestionar';
}) { 
    const qryClient = useQueryClient();
    const [powerScanModalVisible, setPowerScanModalVisible] = useState(false);
    const [itemEscaneado, setItemEscaneado] = useState<IItemCatalogoPowerScanView | null>(null);
    const { play } = useSoundPlayer();                

    const mutationItemEscaneado = useMutation({
        mutationFn: async (codigo: string) => {
            const response = await fetch(`/api/cilindros/${operacion}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rutaId: rutaId,
                    ventaId: ventaId,
                    codigo
                })
            });
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success(`Cilindro procesado correctamente`);
                qryClient.invalidateQueries({ queryKey: operacion === 'cargar' ? ['cargamentos-despacho'] : ['listado-descarga-vehiculo'] });
                qryClient.invalidateQueries({ queryKey: ['carga-vehiculo'] });
                qryClient.invalidateQueries({ queryKey: ['descarga-vehiculo'] });
                setScanMode(false);
                play('/sounds/accept_02.mp3');
            } else {
                toast.error(data.error || 'Cilindro no encontrado');
                if(data.item) {
                    setPowerScanModalVisible(true);
                    setItemEscaneado(data.item);
                    setScanMode(false);
                }
                play('/sounds/error_01.mp3');                
            }
        },
        onError: (error) => {
            toast.error('Error al buscar el cilindro');
            play('/sounds/error_02.mp3');
            setScanMode(false);
        }
    });

    const onCodeSubmit = async (codigo: string) => {
        console.log("Código recibido para escaneo:", codigo);
        await mutationItemEscaneado.mutateAsync(codigo);
    };    

    return (<>
        {powerScanModalVisible && <PowerScanOptionsModal item={itemEscaneado} 
            onCloseModal={() => setPowerScanModalVisible(false)} />}
        <InputManualCodeView onCodeSubmit={onCodeSubmit} 
            scanMode={scanMode} 
            setScanMode={setScanMode} />
    </>);
}