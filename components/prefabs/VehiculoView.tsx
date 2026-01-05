import React, { useRef, useEffect, useState, Ref } from "react";
import Image from "next/image";
import type { ICilindroView, IVehiculoView } from "@/types/types";
import CargaCilindros from "./CargaCilindros";
import Loader from "../Loader";
import { useQuery } from "@tanstack/react-query";
import { getColorEstanque } from "@/lib/uix";

const sizeByModel = (vehiculo: IVehiculoView): { width: number; height: number, factor: number } => {
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    if (!marca || !modelo) return { width: 247, height: 191, factor: 1.8 };
    const sizes: { [key: string]: [number, number, number] } = {
        "hyundai_porter": [247, 173, 1.8], "ford_ranger": [300, 200, 1.8], "mitsubishi_l200": [247, 191, 1.8],
        "volkswagen_constellation": [300, 200, 1.8], "volkswagen_delivery": [300, 200, 1.8], "kia_frontier": [247, 191, 1.8],
        "ford_transit": [300, 200, 1.8], "desconocida_desconocido": [247, 191, 1.8]
    };
    const size = sizes[marca + "_" + modelo] || sizes["desconocida_desconocido"];
    return { width: size[0], height: size[1], factor: size[2] };
};

const calculateTubePosition = (index: number) => {
    const baseTop = 146;
    const baseLeft = 176;
    const scaleFactor = 1.5;
    const verticalIncrement = 4;

    const top = baseTop + Number(!(index % 2)) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
    const left = baseLeft + Number(!(index % 2)) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

    return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
};

export default function VehiculoView({
    rutaId,
    cargados,
    descargados
}: {
    rutaId: string,
    cargados: Array<ICilindroView>,
    descargados: Array<ICilindroView>
}) {
    const parentRef: Ref<HTMLDivElement> = useRef(null);
    const [parentSize, setParentSize] = useState({ width: 200, height: 100 });

    const { data: vehiculo, isLoading: loadingVehiculo } = useQuery<IVehiculoView>({
        queryKey: ['vehiculo-conductor'],
        queryFn: async () => {
            console.log("RUTA", rutaId);
            if (rutaId === undefined) return null;
            const response = await fetch(`/api/conductor/vehiculoAsignado?rutaId=${rutaId ?? ''}`);
            const data = await response.json();
            return data.vehiculo;
        },
        enabled: !!rutaId
    });

    

const imagenVehiculo = (vehiculo: IVehiculoView | undefined): { url: string; width: number; height: number } => {
    const defecto = { url: "desconocida_desconocido", width: 247, height: 191 };
    if (!vehiculo || vehiculo === undefined) return defecto;
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    const imagen = `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase();
    return escalar({ url: imagen, ...sizeByModel(vehiculo) });
};
    
    const escalar = (imagen: { 
        url: string; 
        width: number; 
        height: number; 
        factor: number 
    }): 
        { url: string; width: number; height: number, factor: number } => {
        const factor = 1.8 * imagen.width / parentSize.width;
        return {
            url: imagen.url,
            width: imagen.width * factor,
            height: imagen.height * factor,
            factor: imagen.factor
        };
    }

    useEffect(() => {
        if (parentRef.current) {
            const { width, height } = parentRef.current.getBoundingClientRect();
            setParentSize({ width, height });
        }
    }, [parentRef]);

    return (
        <div
            ref={parentRef}
            className="w-full px-4 pt-6 pb-4 relative"
            style={{ position: "relative", overflow: "hidden", height: parentSize.width * 0.8 }}
        >
            {/* Imagen del camión */}
            <Image className="absolute" src={`/ui/${imagenVehiculo(vehiculo).url}.png`}
                alt={`camion_atras_${vehiculo ? vehiculo.marca + vehiculo.modelo : 'desconocido_front'}`}
                style={{ top: parentSize.height * 0.4, left: parentSize.width * 0.1 }}
                width={imagenVehiculo(vehiculo).width}
                height={imagenVehiculo(vehiculo).height} priority />

            {!loadingVehiculo && <>
                <div className="absolute top-10 mt-2 w-full">
                    <CargaCilindros
                        cargados={cargados}
                        marca={vehiculo?.marca || ''}
                        modelo={vehiculo?.modelo || ''}
                        factor={1.2 * imagenVehiculo(vehiculo).width / parentSize.width} />
                </div>

                <Image className="absolute" src={`/ui/${imagenVehiculo(vehiculo).url}_front.png`}
                    style={{ top: parentSize.height * 0.4, left: parentSize.width * 0.1 }}
                    alt="camion" width={imagenVehiculo(vehiculo).width} height={imagenVehiculo(vehiculo).height} priority />

                <div className="absolute top-6 mt-2 w-full">
                    {descargados.reverse().map((item, index) => {
                        // Deducción de descargado usando historialCarga                                                        
                        const elem = item.elemento;
                        return (
                            <Image
                                key={index}
                                src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                alt={`tank_${index}`}
                                width={14 * 4}
                                height={78 * 4}
                                className={`absolute`}
                                style={calculateTubePosition(descargados.length - index - 1)}
                                priority={false}
                            />
                        );
                    })}
                </div>
            </>}

            {vehiculo && vehiculo.patente ? <div className="w-full text-gray-500 mr-0 items-end flex justify-end mb-0 h-full">
                <div className="w-[76px] text-center bg-white rounded-md p-0.5 border-2 border-white">
                    <div className="flex justify-start md:justify-start bg-white rounded-sm border-gray-400 border px-0.5 pb-0.5 space-x-0.5 shadow-md">
                        <p className="font-bold text-sm">{vehiculo.patente.substring(0, 2)}</p>
                        <Image width={82} height={78} src="/ui/escudo.png" alt="separador" className="w-[9px] h-[9px]" style={{ "marginTop": "7px" }} />
                        <p className="font-bold text-sm">{vehiculo.patente.substring(2, vehiculo.patente.length)}</p>
                    </div>
                </div>
            </div> : <Loader texto="" />}
        </div>
    );
};