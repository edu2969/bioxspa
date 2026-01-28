"use client";

import React, { useState } from "react";
import InputManualCodeView from "./InputManualCodeView";
import { PowerScanOptionsModal } from "@/components/modals/PowerScanOptionsModal";
import toast from "react-hot-toast";
import type { IItemCatalogoPowerScanView } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSoundPlayer } from "@/components/context/SoundPlayerContext";

/**
 * Reordena los nuevos cargamentos según el orden de los cargamentos actuales
 * Preserva el orden personalizado después de actualizar los datos
 */
function reorderCargamentos(nuevosCargamentos: any[], cargamentosActuales: any[]) {
    if (!nuevosCargamentos || !cargamentosActuales) return nuevosCargamentos;
    
    // Crear mapa de IDs para orden rápido
    const ordenActual = cargamentosActuales.map(c => c.rutaId || c.ventas[0]?.ventaId);
    
    // Reordenar nuevos cargamentos según el orden actual
    const reordenados = [];
    
    // Primero agregar los que están en el orden actual
    for (const id of ordenActual) {
        const cargamento = nuevosCargamentos.find(c => 
            (c.rutaId || c.ventas[0]?.ventaId) === id
        );
        if (cargamento) {
            reordenados.push(cargamento);
        }
    }
    
    // Luego agregar cualquier cargamento nuevo que no estuviera antes
    for (const cargamento of nuevosCargamentos) {
        const id = cargamento.rutaId || cargamento.ventas[0]?.ventaId;
        if (!ordenActual.includes(id)) {
            reordenados.push(cargamento);
        }
    }
    
    return reordenados;
}

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
    operacion: 'cargar' | 'descargar' | 'gestionar' | 'entregarEnLocal';
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
            console.log("DATA", data);
            if (data.ok) {
                toast.success(`Cilindro procesado correctamente`);
                
                // Para operaciones de carga, preservar el orden de cargamentos actual
                if (operacion === 'cargar') {
                    // Obtener el orden actual de los cargamentos antes de invalidar
                    const cargamentosActuales = qryClient.getQueryData(['cargamentos-despacho']);
                    
                    // Invalidar para obtener datos actualizados
                    qryClient.invalidateQueries({ queryKey: ['cargamentos-despacho'] });
                    
                    // Si hay un orden personalizado, restaurarlo después de la actualización
                    if (cargamentosActuales && Array.isArray(cargamentosActuales) && cargamentosActuales.length > 1) {
                        // Usar un timeout para permitir que se complete la invalidación
                        setTimeout(() => {
                            const nuevosCargamentos = qryClient.getQueryData(['cargamentos-despacho']);
                            if (nuevosCargamentos && Array.isArray(nuevosCargamentos)) {
                                // Reordenar los nuevos datos según el orden que tenían los actuales
                                const cargamentosReordenados = reorderCargamentos(nuevosCargamentos, cargamentosActuales);
                                qryClient.setQueryData(['cargamentos-despacho'], cargamentosReordenados);
                            }
                        }, 100);
                    }
                } else {
                    // Para otras operaciones, invalidar normalmente
                    qryClient.invalidateQueries({ queryKey: operacion !== 'descargar' ? ['cargamentos-despacho'] : ['listado-descarga-vehiculo'] });
                }
                
                qryClient.invalidateQueries({ queryKey: ['carga-vehiculo'] });
                qryClient.invalidateQueries({ queryKey: ['descarga-vehiculo'] });
                setScanMode(false);
                play('/sounds/accept_02.mp3');
            } else {                                
                toast.error(data.error || 'Cilindro no encontrado');
                if(data.item) {
                    console.log("ITEM ENCONTRADO", data.item);
                    setItemEscaneado(data.item);
                    setPowerScanModalVisible(true);              
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