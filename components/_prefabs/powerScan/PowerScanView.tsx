"use client";

import { useState } from "react";
import InputManualCodeView from "./InputManualCodeView";
import { PowerScanOptionsModal } from "@/components/modals/PowerScanOptionsModal";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSoundPlayer } from "@/components/context/SoundPlayerContext";
import { IItemCatalogo } from "@/types/itemCatalogo";

function getCargamentoKey(cargamento: any) {
    return cargamento?.rutaDespachoId || cargamento?.clientes?.flatMap((cliente: any) => cliente.ventas || [])?.[0]?.ventaId || null;
}

/**
 * Reordena los nuevos cargamentos según el orden de los cargamentos actuales
 * Preserva el orden personalizado después de actualizar los datos
 */
function reorderCargamentos(nuevosCargamentos: any[], cargamentosActuales: any[]) {
    if (!nuevosCargamentos || !cargamentosActuales) return nuevosCargamentos;

    // Crear mapa de IDs para orden rápido
    const ordenActual = cargamentosActuales.map((c) => getCargamentoKey(c));

    // Reordenar nuevos cargamentos según el orden actual
    const reordenados = [];

    // Primero agregar los que están en el orden actual
    for (const id of ordenActual) {
        const cargamento = nuevosCargamentos.find(c =>
            getCargamentoKey(c) === id
        );
        if (cargamento) {
            reordenados.push(cargamento);
        }
    }

    // Luego agregar cualquier cargamento nuevo que no estuviera antes
    for (const cargamento of nuevosCargamentos) {
        const id = getCargamentoKey(cargamento);
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
}: {
    scanMode: boolean;
    setScanMode: (mode: boolean) => void,
    rutaId: string | null;
    ventaId: string | null;
    operacion: 'cargar' | 'descargar' | 'gestionar' | 'entregarEnLocal';
}) {
    const qryClient = useQueryClient();
    const [powerScanModalVisible, setPowerScanModalVisible] = useState(false);
    const [itemEscaneado, setItemEscaneado] = useState<IItemCatalogo | null>(null);
    const { play } = useSoundPlayer();

    const mutationItemEscaneado = useMutation({
        mutationFn: async (codigo: string) => {
            const response = await fetch(`/api/cilindros/${operacion === 'gestionar' ? '/byCodigo/' + codigo : operacion}`, operacion === 'gestionar' ? {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            } : {
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
            console.log("///////////////////>>> Response ITEM", data);
            if (data.ok) {
                if(operacion !== 'gestionar') {
                    toast.success(`Cilindro procesado correctamente`);
                }

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
                    if(operacion === 'gestionar') {
                        console.log("Gestionar", data.item);
                        setItemEscaneado(data.item);
                        setPowerScanModalVisible(true);
                        play('/sounds/bubble_02.mp3');
                        return;
                    }
                    qryClient.invalidateQueries({ queryKey: operacion !== 'descargar' ? ['cargamentos-despacho'] : ['listado-descarga-vehiculo'] });
                }

                qryClient.invalidateQueries({ queryKey: ['carga-vehiculo'] });
                qryClient.invalidateQueries({ queryKey: ['descarga-vehiculo'] });
                setScanMode(false);
                play('/sounds/accept_02.mp3');
            } else {
                toast(data.error || 'Cilindro no encontrado', {
                    icon: '⚠️',
                });
                if (operacion !== 'gestionar' && data.item) {
                    console.log("ITEM ENCONTRADO", data.item);
                    setItemEscaneado(data.item);
                    setPowerScanModalVisible(true);
                }
                if (operacion === 'gestionar') {
                    play('/sounds/bubble_02.mp3');
                    setItemEscaneado({
                        id: '',
                        carga: 0,
                        subcategoria: {
                            categoria: {
                                id: ''
                            },
                            id: ''
                        },
                        estado: 0,
                        stockActual: 0,
                        stockMinimo: 0,
                        codigo: data.item.codigo                        
                    });
                    setPowerScanModalVisible(true);
                    return;
                }
                play('/sounds/error_01.mp3');
            }
        },
        onError: (error) => {
            play('/sounds/error_02.mp3');
            setScanMode(false);
        }
    });

    const onCodeSubmit = async (codigo: string) => {
        await mutationItemEscaneado.mutateAsync(codigo);
    };

    return (<>
        {powerScanModalVisible && <PowerScanOptionsModal 
            item={itemEscaneado} initialEditMode={operacion === 'gestionar'}
            onCloseModal={() => setPowerScanModalVisible(false)} />}
        <InputManualCodeView onCodeSubmit={onCodeSubmit}
            scanMode={scanMode}
            setScanMode={setScanMode} />
    </>);
}