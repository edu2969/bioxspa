"use client";
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { BsGeoAltFill } from 'react-icons/bs';
import { AiFillHome } from 'react-icons/ai';
import { IoIosArrowForward } from 'react-icons/io';
import { MdDragIndicator } from 'react-icons/md';
import { GoCopilot } from 'react-icons/go';

function calculateTubePosition(layerIndex, index) {
    const baseTop = 18; // Posición inicial en el eje Y
    const baseLeft = 22; // Posición inicial en el eje X
    const verticalSpacing = -4.5; // Espaciado vertical entre tubos en la misma columna
    const horizontalSpacing = 3; // Espaciado horizontal entre columnas
    const perspectiveAngle = 55; // Ángulo de perspectiva en grados
    const rowGroupSpacing = 9; // Espaciado adicional entre los grupos de filas (0-2 y 3-5)

    // Conversión del ángulo de perspectiva a radianes
    const angleInRadians = (perspectiveAngle * Math.PI) / 180;

    // Cálculo de desplazamiento en perspectiva
    const perspectiveOffset = layerIndex * Math.tan(angleInRadians);

    // Ajuste para separar los grupos de filas
    const groupOffset = layerIndex >= 3 ? rowGroupSpacing : 0;

    // Variación proporcional en top y left
    const proportionalOffset = layerIndex >= 3 ? rowGroupSpacing * 0.25 : 0; // Ajuste proporcional para las últimas capas

    // Ajuste adicional para la 2da y 5ta fila
    const depthOffset = (layerIndex === 1 || layerIndex === 4) ? -1 : 0; // Medio tubo hacia el fondo

    const top = baseTop + index * verticalSpacing + perspectiveOffset + proportionalOffset + depthOffset; // Ajuste vertical con perspectiva y separación de grupos
    const left = baseLeft + layerIndex * horizontalSpacing + perspectiveOffset + groupOffset - depthOffset; // Ajuste horizontal con perspectiva
    
    return { top, left };
}

const trucks = [
    { patente: "LLSW-71", marca: "Hyundai Porter", revisionTec: "2024-04-07", diasFaltantes: 302, tubosLlenos: 10, tubosVacios: 5, enRuta: true, direccion: "Cliente 1, Talcahuano" },
    { patente: "RPYF-33", marca: "Volkswagen Delivery 9.160", revisionTec: "2024-09-04", diasFaltantes: 152, tubosLlenos: 8, tubosVacios: 7, enRuta: false },
    { patente: "PHBL-23", marca: "Hyundai Porter", revisionTec: "2025-06-01", diasFaltantes: 117, tubosLlenos: 12, tubosVacios: 3, enRuta: true, direccion: "Cliente 2, Concepción" },
    { patente: "JVHP-16", marca: "Ford Ranger XLT", revisionTec: "2025-01-01", diasFaltantes: 33, tubosLlenos: 15, tubosVacios: 0, enRuta: false },
    { patente: "JZYY-59", marca: "Ford Ranger LTD", revisionTec: "2025-01-01", diasFaltantes: 33, tubosLlenos: 7, tubosVacios: 8, enRuta: true, direccion: "Cliente 3, Los Ángeles" },
    { patente: "RPYF-32", marca: "Volkswagen Delivery 9.160", revisionTec: "2024-03-27", diasFaltantes: 313, tubosLlenos: 9, tubosVacios: 6, enRuta: false },
    { patente: "RZRF-18", marca: "Volkswagen Delivery 11.180", revisionTec: "2024-06-14", diasFaltantes: 234, tubosLlenos: 11, tubosVacios: 4, enRuta: true, direccion: "Cliente 4, Talcahuano" },
    { patente: "RPYD-85", marca: "Volkswagen Constellation 17.280", revisionTec: "2024-09-06", diasFaltantes: 150, tubosLlenos: 6, tubosVacios: 9, enRuta: false },
    { patente: "LPHF-83", marca: "Kia Frontier", revisionTec: "2024-06-02", diasFaltantes: 246, tubosLlenos: 13, tubosVacios: 2, enRuta: true, direccion: "Cliente 5, Concepción" },
    { patente: "SBDY-13", marca: "Mitsubishi Work L200", revisionTec: "2025-06-15", diasFaltantes: 131, tubosLlenos: 5, tubosVacios: 10, enRuta: false },
    { patente: "SBSK64", marca: "Mitsubishi", revisionTec: "2024-07-15", diasFaltantes: 203, tubosLlenos: 14, tubosVacios: 1, enRuta: true, direccion: "Cliente 6, Los Ángeles" },
    { patente: "SZFB24", marca: "Ford Transit", revisionTec: "2025-11-18", diasFaltantes: 287, tubosLlenos: 4, tubosVacios: 11, enRuta: false }
];

export default function AsignacionPanel({ session }) {
    return (
        <main className="mt-4 h-screen overflow-hidden">
            <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pt-4 mx-10 bg-white dark:bg-gray-900 mb-4">
                <div className="flex items-center space-x-4 text-ship-cove-800">
                    <Link href="/">
                        <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                    </Link>
                    <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                    <Link href="/modulos">
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">ASIGNACION</span>
                    </Link>
                </div>
            </div>
            <div className="grid grid-cols-12 h-full gap-4 p-4">                
                <div className="col-span-7 flex flex-col md:flex-row gap-4">                    
                    <div className="w-1/2 border rounded-lg p-4 bg-white shadow-md overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">PEDIDOS</h2>
                        <div
                            className="p-2 border rounded-lg mb-2 bg-gray-100 cursor-pointer flex items-start relative"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", "SIMEN LIMITADA RUT 11.111.111-1 2x C02 9Kgs - 3xAtal 10m3")}
                        >
                            <div>
                                <div className="flex">
                                    <p className="text-md font-bold">SIMEN LIMITADA</p>
                                    <p className="text-xs text-gray-500 ml-2 mt-1.5">11.111.111-1</p>
                                </div>
                                <ul className="list-disc ml-4 mt-2">
                                <li>2x C02 9Kgs</li>
                                <li>3x Atal 10m3</li>
                                </ul>
                            </div>
                            <div className="absolute top-2 right-2 text-gray-500">
                                <MdDragIndicator size="1.5rem" />
                            </div>                                                
                        </div>
                        <div
                            className="p-2 border rounded-lg mb-2 bg-gray-100 cursor-pointer flex items-start relative"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", "INDUSTRIAS ABC RUT 22.222.222-2 1x Argón 5L - 4x C02 15Kgs")}
                        >
                            <div className="absolute top-2 right-2 text-gray-500">
                                <MdDragIndicator size="1.5rem" />
                            </div>
                            <div>
                                <div className="flex">
                                    <p className="text-md font-bold">INDUSTRIAS ABC RUT</p>
                                    <p className="text-xs text-gray-500 ml-2 mt-1.5">22.222.222-2</p>
                                </div>
                                <ul className="list-disc ml-4 mt-2">
                                    <li>1x Argón 5L</li>
                                    <li>4x C02 15Kgs</li>
                                </ul>
                            </div>
                        </div>
                        <div
                            className="p-2 border rounded-lg mb-2 bg-gray-100 cursor-pointer flex items-start relative"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", "CONSTRUCCIONES XYZ RUT 33.333.333-3 3x Atal 10m3")}
                        >
                            <div className="absolute top-2 right-2 text-gray-500">
                                <MdDragIndicator size="1.5rem" />
                            </div>
                            <div>
                                <div className="flex">
                                    <p className="text-md font-bold">CONSTRUCCIONES XYZ</p>
                                    <p className="text-xs text-gray-500 ml-2 mt-1.5">33.333.333-3</p>
                                </div>
                                <ul className="list-disc ml-4 mt-2">
                                <li>3x Atal 10m3</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="w-1/2 border rounded-lg p-4 bg-white shadow-md overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">EN ESPERA</h2>
                        {["Juan Pérez", "María López", "Carlos Gómez"].map((name, index) => (
                            <div
                                key={index}
                                className="p-2 border rounded-lg mb-2 bg-gray-100"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "#f0f0f0"; // Cambia el fondo al pasar el drag
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "white"; // Restaura el fondo al salir el drag
                                }}
                                onDrop={(e) => {
                                    alert(`SOLTADO en ${name}`);
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "white"; // Restaura el fondo al soltar
                                }}
                            >
                                <div className="font-bold uppercase flex">
                                    <GoCopilot size="1.5rem"/><span className="ml-2">{name}</span>
                                </div>
                                <p className="font-md uppercase font-bold">SIMEN LIMITADA</p>
                                <ul className="list-disc ml-4">
                                    {index === 0 && (
                                        <>                                            
                                            <li>1x C02 9Kgs</li>
                                            <li>2x Atal 10m3</li>
                                        </>
                                    )}
                                    {index === 1 && (
                                        <>
                                            <li>3x Argón 5L</li>
                                            <li>1x C02 15Kgs</li>
                                        </>
                                    )}
                                    {index === 2 && (
                                        <>
                                            <li>2x Atal 10m3</li>
                                        </>
                                    )}
                                </ul>
                                <p className="font-md uppercase font-bold">SIMEN LIMITADA</p>
                                <ul className="list-disc ml-4">
                                    {index === 0 && (
                                        <>                                            
                                            <li>1x C02 9Kgs</li>
                                            <li>2x Atal 10m3</li>
                                        </>
                                    )}
                                    {index === 1 && (
                                        <>
                                            <li>3x Argón 5L</li>
                                            <li>1x C02 15Kgs</li>
                                        </>
                                    )}
                                    {index === 2 && (
                                        <>
                                            <li>2x Atal 10m3</li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* EN TRÁNSITO */}
                <div className="col-span-5 border rounded-lg p-4 bg-white shadow-md overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">EN TRÁNSITO</h2>
                    {trucks.filter(t => t.enRuta).map((truck, index) => (
                        <div
                            key={index}
                            className="relative w-full border rounded-lg px-4 bg-gray-100 shadow-md mb-4 h-64 pt-4"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.backgroundColor = "#f0f0f0"; // Cambia el fondo al pasar el drag
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "white"; // Restaura el fondo al salir el drag
                            }}
                            onDrop={(e) => {
                                alert(`SOLTADO en camión ${truck.patente}`);
                                e.preventDefault();
                                e.currentTarget.style.backgroundColor = "white"; // Restaura el fondo al soltar
                            }}
                        >
                            <Image className="absolute top-4 left-0 ml-12" src="/ui/camion.png" alt="camion" width={247} height={145} />
                            <div className="absolute top-0 left-0 ml-12 mt-2 w-full h-fit">
                                {Array.from({ length: 6 }).map((_, layerIndex) => (
                                    <div key={`${layerIndex}_${truck.patente}`} className="absolute flex" style={calculateTubePosition(layerIndex, 0)}>
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <Image
                                                key={index}
                                                src={`/ui/tanque_biox${(index + layerIndex * 6 > 40) ? '_verde' : (index + layerIndex * 6 > 20) ? '_azul' : ''}.png`}
                                                alt={`tank_${layerIndex * 6 + index}`}
                                                width={14}
                                                height={50}
                                                className='relative'
                                                style={calculateTubePosition(layerIndex, index)}
                                                priority={true}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <Image className="absolute top-4 left-0 ml-12" src="/ui/camion_front.png" alt="camion" width={247} height={145} />
                            <div className="absolute ml-16 mt-6" style={{ transform: "translate(60px, 34px) skew(0deg, -20deg)" }}>
                                <div className="ml-4 text-slate-800">
                                    <p className="text-xl font-bold">{truck.patente}</p>
                                    <p className="text-xs">{truck.marca.split(" ")[0]}</p>
                                </div>
                            </div>
                            <div className="absolute bottom-4 flex items-center ml-4 mb-2">
                                <BsGeoAltFill size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                <p className="text-xs text-gray-500 ml-2">{truck.direccion}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}