"use client";

import React, { useCallback, useState } from "react";
import InputManualCodeView from "./InputManualCodeView";
import { PowerScanOptionsModal } from "./PowerScanOptionsModal";
import toast from "react-hot-toast";
import type { IItemCatalogoPowerScanView } from "../types";

export default function PowerScanView({ 
    setSelectedItem, 
    scanMode, 
    setScanMode
} : {
    setSelectedItem: (item: IItemCatalogoPowerScanView) => void;
    scanMode: boolean;
    setScanMode: (mode: boolean) => void
}) { 
    const [powerScanModalVisible, setPowerScanModalVisible] = useState(false);
    const [itemEscaneado, setItemEscaneado] = useState<IItemCatalogoPowerScanView | null>(null);

    const gestionarItem = useCallback(async (codigo: string) => {
        // Lógica para gestionar el item escaneado
        try {
            const response = await fetch(`/api/cilindros/gestionar/${codigo}`);
            const data = await response.json();

            if (data.ok && data.item) {
                setSelectedItem(data.item);
                toast.success(`Cilindro encontrado: ${codigo}`);
                setScanMode(false);

                // Cargar datos completos y mostrar modal
                setPowerScanModalVisible(true);
            } else {
                toast.error(data.error || 'Cilindro no encontrado');
                setScanMode(false);
            }
        } catch (error) {
            console.error('Error al buscar cilindro:', error);
            toast.error('Error al buscar el cilindro');
            setScanMode(false);
        }
    }, [setSelectedItem, setScanMode]);    

    return (<>
        <PowerScanOptionsModal item={itemEscaneado} 
            onCloseModal={() => setPowerScanModalVisible(false)} 
            visible={powerScanModalVisible} />
        <InputManualCodeView onCodeSubmit={gestionarItem} 
            scanMode={scanMode} 
            setScanMode={setScanMode} 
            setSelectedItem={setSelectedItem} />
    </>);
}