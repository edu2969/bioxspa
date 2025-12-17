import React, { useRef, useEffect, useState, Ref } from "react";
import Image from "next/image";
import type { IVehicleView } from "./types";
import CargaCilindros from "./CargaCilindros";

const sizeByModel = (vehiculo: IVehicleView): { width: number; height: number } => {
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    if (!marca || !modelo) return { width: 247, height: 191 };
    const sizes: { [key: string]: [number, number] } = {
        "hyundai_porter": [247, 173], "ford_ranger": [300, 200], "mitsubishi_l200": [247, 191],
        "volkswagen_constellation": [300, 200], "volkswagen_delivery": [300, 200], "kia_frontier": [247, 191],
        "ford_transit": [300, 200], "desconocido_desconocido": [247, 191]
    };
    const size = sizes[marca + "_" + modelo] || sizes["desconocido_desconocido"];
    return { width: size[0], height: size[1] };
};



const calculateUploadTubePosition = (index: number) => {
    const baseTop = 146;
    const baseLeft = 176;
    const scaleFactor = 1.5;
    const verticalIncrement = 4;

    const top = baseTop + Number(!(index % 2)) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
    const left = baseLeft + Number(!(index % 2)) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

    return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
};

const imagenVehiculo = (vehiculo: IVehicleView): { url: string; width: number; height: number } => {
    const defecto = { url: "desconocido_desconocido", width: 247, height: 191 };
    if (!vehiculo) return defecto;
    const marca = (vehiculo.marca.split(" ")[0] || "").toLowerCase();
    const modelo = (vehiculo.modelo.split(" ")[0] || "").toLowerCase();
    const imagen = `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase();
    return { url: imagen, ...sizeByModel(vehiculo)};
};

export default function VehicleView({ vehicle }: { vehicle: IVehicleView }) {
    const parentRef: Ref<HTMLDivElement> = useRef(null);
    const [parentSize, setParentSize] = useState({ width: 200, height: 100 });

    useEffect(() => {
        if (parentRef.current) {
            const { width, height } = parentRef.current.getBoundingClientRect();
            setParentSize({ width, height });
        }
    }, [parentRef]);

    return (
        <div
            ref={parentRef}
            className="w-full px-4 pt-6 pb-4 bg-orange-50 relative"
            style={{ position: "relative", overflow: "hidden", height: parentSize.width * 0.75 }}
        >
            {/* Imagen del camión */}
            <Image className="absolute" src={`/ui/${imagenVehiculo(vehicle).url}.png`}
                alt={`camion_atras_${vehicle ? vehicle.marca + vehicle.modelo : 'desconocido_front'}`}
                style={{ top: parentSize.height * 0.4, left: parentSize.width * 0.1 }}
                width={imagenVehiculo(vehicle).width}
                height={imagenVehiculo(vehicle).height} priority />

            <CargaCilindros vehiculoId={vehicle.vehicleId} 
                marca={vehicle?.marca || ''} 
                modelo={vehicle?.modelo || ''} />

            <Image className="absolute" src={`/ui/${imagenVehiculo(vehicle).url}_front.png`} 
                style={{ top: parentSize.height * 0.4, left: parentSize.width * 0.1 }}
                alt="camion" width={imagenVehiculo(vehicle).width} height={imagenVehiculo(vehicle).height} priority />

            {/* Render cilindros descargados (puedes cambiar posición/fondo si lo necesitas) */}
            {vehicle && vehicle.descargados.map((cilindro, idx) => {
                const pos = calculateUploadTubePosition(idx);
                return (
                    <div
                        key={`descargado_${idx}`}
                        style={{
                            position: "absolute",
                            left: pos.left,
                            top: pos.top + 70, // desplazado abajo
                            zIndex: 2,
                            width: 32,
                            height: 64,
                            background: "#A3A3A3",
                            borderRadius: "8px",
                            border: "2px dashed #333",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            opacity: 0.7,
                        }}
                        title={`Elemento: ${cilindro.elementos}, Peso: ${cilindro.peso}kg`}
                    >
                        {cilindro.elementos}
                    </div>
                );
            })}
            {/* Patente y datos */}
            <div
                style={{
                    position: "absolute",
                    right: parentSize.width * 0.05,
                    bottom: parentSize.height * 0.09,
                    background: "#fff",
                    borderRadius: "4px",
                    padding: "4px 12px",
                    zIndex: 3,
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    boxShadow: "0 2px 8px #0002",
                }}
            >
                {vehicle?.patente || '...'}
            </div>
        </div>
    );
};