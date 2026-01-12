import React, { forwardRef, RefObject } from "react";
import Image from "next/image";
import type { ICilindroView, IVehiculoView } from "@/types/types";
import CargaCilindros from "./CargaCilindros";
import Loader from "../Loader";
import { useQuery } from "@tanstack/react-query";
import { getColorEstanque } from "@/lib/uix";
import { useVehicleScaling } from "@/components/uix/useVehicleScaling";

const VehiculoView = forwardRef<HTMLDivElement, {
    rutaId: string,
    cargados: Array<ICilindroView>,
    descargados: Array<ICilindroView>
}>(({ rutaId, cargados, descargados }, ref) => {
    const { data: vehiculo, isLoading: loadingVehiculo } = useQuery<IVehiculoView>({
        queryKey: ['vehiculo-conductor', rutaId],
        queryFn: async () => {
            if (rutaId === undefined) return null;
            const response = await fetch(`/api/conductor/vehiculoAsignado?rutaId=${rutaId ?? ''}`);
            const data = await response.json();
            return data.vehiculo;
        },
        enabled: !!rutaId
    });

    // Usar el hook de escalado con el vehículo actual
    const currentScaling = useVehicleScaling(ref as RefObject<HTMLDivElement>, vehiculo);

    return (
        <div
            ref={ref}
            className="w-full px-4 pt-6 pb-4 relative scroll-none overflow-visible"
            style={{ 
                height: currentScaling.isReady ? currentScaling.vehicleDimensions.height + 80 : 200,
                minHeight: 200
            }}
        >
            {currentScaling.isReady && (
                <>
                    {/* Imagen del camión (fondo) */}
                    <Image 
                        className={`absolute${currentScaling.getVehicleImageName(vehiculo).includes('desconocida') ? ' grayscale' : ''}`} 
                        src={`/ui/${currentScaling.getVehicleImageName(vehiculo)}.png`}
                        alt={`camion_atras_${vehiculo ? vehiculo.marca + vehiculo.modelo : 'desconocido'}`}
                        style={{
                            top: currentScaling.vehiclePosition.top,
                            left: currentScaling.vehiclePosition.left
                        }}
                        width={currentScaling.vehicleDimensions.width}
                        height={currentScaling.vehicleDimensions.height} 
                        priority 
                    />

                    {!loadingVehiculo && (
                        <>
                            {/* Cilindros cargados */}
                            <div className="absolute w-full">
                                <CargaCilindros
                                    cargados={cargados}
                                    calculatePosition={currentScaling.calculateCylinderPosition}
                                />
                            </div>

                            {/* Imagen del camión (frente) */}
                            <Image 
                                className={`absolute${currentScaling.getVehicleImageName(vehiculo).includes('desconocida') ? ' grayscale' : ''}`} 
                                src={`/ui/${currentScaling.getVehicleImageName(vehiculo)}_front.png`}
                                style={{
                                    top: currentScaling.vehiclePosition.top,
                                    left: currentScaling.vehiclePosition.left,
                                    zIndex: 100
                                }}
                                alt="camion_frente" 
                                width={currentScaling.vehicleDimensions.width} 
                                height={currentScaling.vehicleDimensions.height}
                                priority 
                            />

                            {/* Cilindros descargados */}
                            <div className="absolute w-full">
                                {descargados.map((item, index) => {
                                    const position = currentScaling.calculateCylinderPosition(index, false);
                                    return (
                                        <Image
                                            key={`descargado_${index}`}
                                            src={`/ui/tanque_biox${getColorEstanque(item.elemento)}.png`}
                                            alt={`tank_descargado_${index}`}
                                            width={position.width}
                                            height={position.height}
                                            className="absolute"
                                            style={{
                                                top: position.top,
                                                left: position.left,
                                                zIndex: position.zIndex
                                            }}
                                            priority={false}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    )}

                </>
            )}

            {/* Patente del vehículo */}
            {vehiculo?.patente && (
                <div className="absolute bottom-2 right-2">
                    <div className="w-[76px] text-center bg-white rounded-md p-0.5 border-2 border-white">
                        <div className="flex justify-center bg-white rounded-sm border-gray-400 border px-0.5 pb-0.5 space-x-0.5 shadow-md">
                            <p className="font-bold text-sm">{vehiculo.patente.substring(0, 2)}</p>
                            <Image 
                                width={9} 
                                height={9} 
                                src="/ui/escudo.png" 
                                alt="separador" 
                                className="mt-1.5 w-[9px] h-[9px]" 
                            />
                            <p className="font-bold text-sm">{vehiculo.patente.substring(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loader para cuando está cargando */}
            {(loadingVehiculo || !currentScaling.isReady) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader texto="Identificando..." />
                </div>
            )}
        </div>
    );
});

VehiculoView.displayName = 'VehiculoView';

export default VehiculoView;