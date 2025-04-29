"use client";
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { BsGeoAltFill } from 'react-icons/bs';
import { AiFillHome } from 'react-icons/ai';
import { IoIosArrowForward } from 'react-icons/io';
import { MdDragIndicator } from 'react-icons/md';
import { GoCopilot } from 'react-icons/go';
import { useEffect, useState } from "react";
import dayjs from 'dayjs';
import { RiZzzFill } from 'react-icons/ri';
import { ConfirmModal } from './modals/ConfirmModal';
import 'dayjs/locale/es';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

dayjs.locale('es');

var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);

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

    return { top, left, width: '14px', height: '78px' };
}

export default function AsignacionPanel() {
    const [pedidos, setPedidos] = useState([]);
    const [choferes, setChoferes] = useState([]);
    const [enTransito, setEnTransito] = useState([]);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedChofer, setSelectedChofer] = useState(null);
    const [selectedPedido, setSelectedPedido] = useState(null);

    const nombreChofer = (choferId) => {
        const chofer = choferes.find((chofer) => chofer._id === choferId);
        return chofer ? chofer.nombre : "Desconocido";
    }

    async function fetchPedidos() {
        try {
            const response = await fetch("/api/pedidos/asignacion");
            if (!response.ok) {
                throw new Error("Failed to fetch pedidos");
            }
            const data = await response.json();
            console.log("Fetched pedidos:", data);
            setPedidos(data.pedidos);
            setChoferes(data.choferes);
            setEnTransito(data.flotaEnTransito);
        } catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    }

    useEffect(() => {
        fetchPedidos();
    }, []);

    useEffect(() => {
        console.log("Pedidos:", pedidos);
    }, [pedidos]);

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
            <div className="grid grid-cols-12 h-[calc(100vh-80px)] gap-4 p-4 overflow-hidden">
                <div className="col-span-7 flex flex-col md:flex-row gap-4">
                    <div className="w-1/2 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">PEDIDOS</h2>
                        {pedidos.length === 0 ? (
                            <div
                                className="flex items-center justify-center"
                                style={{ height: "calc(100vh - 200px)" }}
                            >
                                <p className="text-gray-500 text-lg font-semibold">SIN PEDIDOS</p>
                            </div>
                        ) : (
                            pedidos.map((pedido, index) => (
                                <div key={`pedido_${index}`}
                                    className="p-2 border rounded-lg mb-2 bg-gray-100 cursor-pointer flex items-start relative"
                                    draggable
                                    onDragStart={() => setSelectedPedido(pedido._id)}
                                >
                                    <div>
                                        <p className="text-md font-bold uppercase w-full">{pedido.clienteNombre}</p>
                                        <p className="text-xs text-gray-500 ml-2">{dayjs(pedido.createdAt).fromNow()}</p>
                                        <ul className="list-disc ml-4 mt-2">
                                            {pedido.items.map((item, index2) => (<li key={`item_${index2}`}>{item.cantidad}x {item.nombre}</li>))}
                                        </ul>
                                    </div>
                                    <div className="absolute top-2 right-2 text-gray-500">
                                        <MdDragIndicator size="1.5rem" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="w-1/2 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">EN ESPERA</h2>
                        {choferes.map((chofer, index) => (
                            <div
                                key={`en_espera_${index}`}
                                className="p-2 border rounded-lg mb-2 bg-gray-100"
                                data-id={`choferId_${chofer._id}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "rgb(209 213 219)"; // Tailwind gray-300
                                    e.currentTarget.style.transform = "scale(1.1)";
                                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgb(243 244 246)"; // Tailwind gray-100
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "rgb(243 244 246)"; // Tailwind gray-100
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                    setSelectedChofer(chofer._id);
                                    setShowConfirmModal(true); 
                                }}
                            >
                                <div className="font-bold uppercase flex">
                                    <GoCopilot size="1.5rem" /><span className="ml-2">{chofer.nombre}</span>
                                </div>
                                {chofer.pedidos.length ? chofer.pedidos.map((pedido, indexPedido) => <div key={`pedidos_chofer_${indexPedido}`}>
                                    <p className="font-md uppercase font-bold">{pedido.nombreCliente}</p>
                                    <ul className="list-disc ml-4">
                                        {pedido.items?.map((item, indexItem) => <li key={`item_en_espera_${indexItem}`}>{item.cantidad}x {item.nombre}</li>)}                                        
                                    </ul>
                                </div>) : <div className="relative w-32"><div className="relative -top-8 left-64 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-tr-md rounded-bl-md flex items-center">
                                    <RiZzzFill size="1rem" className="mr-1" />
                                    <p>SIN PEDIDOS</p>
                                </div></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* EN TRÁNSITO */}
                <div className="col-span-5 border rounded-lg p-4 bg-white shadow-md h-[calc(100vh-80px)] overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">EN TRÁNSITO</h2>
                    {enTransito.length === 0 ? (
                        <div
                            className="flex items-center justify-center"
                            style={{ height: "calc(100vh - 200px)" }}
                        >
                            <p className="text-gray-500 text-lg font-semibold">NADIE EN RUTA</p>
                        </div>
                    ) : (
                        enTransito.map((truck, index) => (
                            <div
                                key={`truck_${index}`}
                                data-id={truck._id}
                                className="relative w-full border rounded-lg px-4 bg-gray-100 shadow-md mb-4 h-64 pt-4"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "#333333";
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                                }}
                                onDrop={(e) => {
                                    alert(`SOLTADO en camión ${truck.patente}`);
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "green";
                                }}
                            >
                                <Image className="absolute top-4 left-0 ml-12" src="/ui/camion.png" alt={`camion_atras_${index}`} width={247} height={191} style={{ width: '247px', height: '191px' }} priority />
                                <div className="absolute top-0 left-0 ml-12 mt-2 w-full h-fit">
                                    {Array.from({ length: 6 }).map((_, layerIndex) => (
                                        <div key={`${layerIndex}_${truck.patente}`} className="absolute flex" style={calculateTubePosition(layerIndex, 0)}>
                                            {Array.from({ length: 6 }).map((_, index) => (
                                                <Image
                                                    key={index}
                                                    src={`/ui/tanque_biox${(index + layerIndex * 6 > 40) ? '_verde' : (index + layerIndex * 6 > 20) ? '_azul' : ''}.png`}
                                                    alt={`tank_${layerIndex * 6 + index}`}
                                                    width={14}
                                                    height={78}
                                                    className='relative'
                                                    style={calculateTubePosition(layerIndex, index)}
                                                    priority={false}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <Image className="absolute top-4 left-0 ml-12" src="/ui/camion_front.png" alt="camion" width={247} height={191} style={{ width: '247px', height: '191px' }} />
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
                        ))
                    )}
                </div>
            </div>

            <ConfirmModal
                show={showConfirmModal}
                title="Confirmar Asignación"
                confirmationQuestion={`¿Estás seguro de asignar este pedido a ${nombreChofer(selectedChofer)}?`}
                onClose={() => {
                    const item = document.querySelector(`[data-id="choferId_${selectedChofer}"]`);
                    if (item) {
                        item.style.backgroundColor = "#F3F4F6";
                        item.style.transform = "scale(1)";
                        item.style.boxShadow = "none";
                    }
                    setShowConfirmModal(false);
                }} // Cierra el modal
                onConfirm={() => {
                    const assignPedido = async () => {
                        try {
                            const response = await fetch("/api/pedidos/asignacion", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    ventaId: selectedPedido,
                                    choferId: selectedChofer,
                                }),
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || "Error al asignar el pedido");
                            }
                            toast.success("Pedido asignado con éxito");
                            fetchPedidos();
                        } catch (error) {
                            console.error("Error al asignar el pedido:", error);
                            toast.error(error.message || "Error al asignar el pedido");
                        } finally {
                            setShowConfirmModal(false); // Cierra el modal después de confirmar
                        }
                    };
                    assignPedido();
                }}
                confirmationLabel="ASIGNAR"
            />
            <ToastContainer/>
        </main>
    );
}