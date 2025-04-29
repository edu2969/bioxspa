"use client";
// filepath: d:/git/bioxspa/components/CamionConCarga.jsx
import { useCallback, useEffect, useState } from "react";

import Image from "next/image";
import { MdCleaningServices } from "react-icons/md";

export default function Despacho() {
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [certificaOk, setCertificaOk] = useState(false);
    const [setRutaDespacho] = useState(null);
    const [vehiculos, setVehiculos] = useState([]);

    function calculateTubePosition(layerIndex, index) {
        const scaleFactor = 3; // Factor de escala basado en el tamaño triplicado del camión
        const baseTop = 18 * scaleFactor; // Escalar la posición inicial en el eje Y
        const baseLeft = 22 * scaleFactor; // Escalar la posición inicial en el eje X
        const verticalSpacing = -4.5 * scaleFactor; // Escalar el espaciado vertical entre tubos
        const horizontalSpacing = 3 * scaleFactor; // Escalar el espaciado horizontal entre columnas
        const perspectiveAngle = 55; // Ángulo de perspectiva en grados (sin cambios)
        const rowGroupSpacing = 9 * scaleFactor; // Escalar el espaciado adicional entre grupos de filas

        // Conversión del ángulo de perspectiva a radianes
        const angleInRadians = (perspectiveAngle * Math.PI) / 180;

        // Cálculo de desplazamiento en perspectiva
        const perspectiveOffset = layerIndex * Math.tan(angleInRadians) * scaleFactor;

        // Ajuste para separar los grupos de filas
        const groupOffset = layerIndex >= 3 ? rowGroupSpacing : 0;

        // Cálculo de las posiciones escaladas
        const top = baseTop + index * verticalSpacing + perspectiveOffset;
        const left = baseLeft + layerIndex * horizontalSpacing + perspectiveOffset + groupOffset;

        return { top, left, width: `${14 * scaleFactor}px`, height: `${78 * scaleFactor}px` }; // Escalar el tamaño de los tanques
    }

    const vehiculoPorId = (id) => {
        if(id == null) return { patente: "", marca: ""};
        return vehiculos?.find((vehiculo) => vehiculo._id === id);
    };

    const fetchRutaAsignada = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer");
            const data = await response.json();
            if (data.ok) {
                console.log("Data result:", data);
                setRutaDespacho(data.rutaDespacho);
                if(data.vehiculos.length == 1) {
                    setVehiculoSeleccionado(data.vehiculos[0]._id);
                    console.log("VehiculoId", data.vehiculos[0]._id);
                }
                setVehiculos(data.vehiculos);
            } else {
                console.error("Error fetching rutaDespacho:", data.error);
            }
        } catch (error) {
            console.error("Error in fetchRutaAsignada:", error);
        }
    }, [setRutaDespacho, setVehiculoSeleccionado]);

    useEffect(() => {
        fetchRutaAsignada();
    }, [fetchRutaAsignada]);

    useEffect(() => {
        console.log("Vehículo seleccionado:", vehiculoSeleccionado);
    }, [vehiculoSeleccionado]);

    return (
        <div className="absolute w-full px-4 mb-4 pt-4">
            {vehiculos.length >= 2 && <div className="w-full text-center">
                <select className="text-2xl font-bold mb-4 p-2 border rounded-lg bg-white shadow-sm w-1/3 mt-10"
                    onChange={(e) => setVehiculoSeleccionado(e.target.value)}>
                    <option>Selecciona un vehiculos</option>
                    {vehiculos.map((vehiculo) => (
                        <option key={`vehiculo_${vehiculo._id}`} value={vehiculo._id}>
                            {vehiculo.patente} - {vehiculo.marca}
                        </option>
                    ))}
                </select>
            </div>}
            <div className={`${!vehiculoSeleccionado && "opacity-20"}`}>
                <Image
                    className="absolute top-32 left-0 ml-12"
                    src="/ui/camion.png"
                    alt="camion_atras"
                    width={741} // 3x the original width (247 * 3)
                    height={573} // Proportional height (191 * 3)
                    style={{ width: "741px", height: "573px" }}
                    priority
                />
                <div className="absolute top-28 left-0 ml-12 mt-2 w-full h-fit">
                    {Array.from({ length: 6 }).map((_, layerIndex) => (
                        <div key={layerIndex} className="absolute flex" style={calculateTubePosition(layerIndex, 0)}>
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${(index + layerIndex * 6 > 40) ? '_verde' : (index + layerIndex * 6 > 20) ? '_azul' : ''}.png`}
                                    alt={`tank_${layerIndex * 6 + index}`}
                                    width={14 * 3} // Escalar el ancho
                                    height={78 * 3} // Escalar el alto
                                    className="relative"
                                    style={calculateTubePosition(layerIndex, index)}
                                    priority={false}
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <Image
                    className="absolute top-32 left-0 ml-12"
                    src="/ui/camion_front.png"
                    alt="camion"
                    width={741} // 3x the original width (247 * 3)
                    height={573} // Proportional height (191 * 3)
                    style={{ width: "741px", height: "573px" }}
                />
                <div className="absolute top-52 left-48 ml-16 mt-6" style={{ transform: "translate(200px, 102px) skew(0deg, -20deg) scale(3)" }}>
                    <div className="ml-4 text-slate-800">
                        <p className="text-md font-bold">{vehiculoPorId(vehiculoSeleccionado).patente || "SELECCIONE"}</p>
                        <p className="text-xs">{vehiculoPorId(vehiculoSeleccionado).marca?.split(" ")[0] || "UN VEHICULO"}</p>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-1/2 h-screen flex items-center justify-center">
                {!certificaOk && <div>
                    <div className="text-center bg-yellow-200 py-6 px-12 rounded-xl shadow-lg">
                        <MdCleaningServices className="inline-block mr-2" size="6rem" />
                        <p className="text-xl font-bold text-gray-700 mt-4"></p>
                        <div className="flex">
                            <input
                                onChange={(e) => setCertificaOk(e.target.checked)}
                                type="checkbox"
                                className="h-8 w-8 text-green-500 mx-auto"
                            />

                            <p className="w-72 text-left text-xl ml-4">CERTIFICO QUE EL INTERIOR DEL VEHÍCULO ESTÁ LIMPIO</p>
                        </div>
                    </div>
                </div>}
                {certificaOk && <div className="text-center bg-yellow-200 py-6 px-12 rounded-xl shadow-lg">
                    <p>LISTADO DE CILINDROS</p>
                </div>}
            </div>
        </div>
    );
}
