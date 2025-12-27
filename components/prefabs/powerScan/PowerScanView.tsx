"use client";

import React, { useState } from "react";
import InputManualCodeView from "./InputManualCodeView";
import { PowerScanOptionsModal } from "@/components/modals/PowerScanOptionsModal";
import toast from "react-hot-toast";
import type { IItemCatalogoPowerScanView } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SoundPlayerProvider, { useSoundPlayer } from "@/components/context/SoundPlayerContext";

export default function PowerScanView({ 
    scanMode, 
    setScanMode,
    rutaId,
    ventaId
} : {
    scanMode: boolean;
    setScanMode: (mode: boolean) => void,
    rutaId: string | null;
    ventaId: string | null;
}) { 
    const qryClient = useQueryClient();
    const [powerScanModalVisible, setPowerScanModalVisible] = useState(false);
    const [itemEscaneado, setItemEscaneado] = useState<IItemCatalogoPowerScanView | null>(null);
    const { play } = useSoundPlayer();                

    const mutationItemEscaneado = useMutation({
        mutationFn: async (codigo: string) => {
            const response = await fetch(`/api/cilindros/gestionar/${codigo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rutaId: rutaId,
                    ventaId: ventaId
                })
            });
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {                
                toast.success(`Cilindro ${data.item.codigo} procesado`);
                qryClient.invalidateQueries({ queryKey: ['cargamentos-despacho'] });
                play('/sounds/accept_02.mp3');
            } else {
                toast.error(data.error || 'Cilindro no encontrado');
                play('/sounds/error_01.mp3');
            }
        },
        onError: (error) => {
            console.error('Error al buscar cilindro:', error);
            toast.error('Error al buscar el cilindro');
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