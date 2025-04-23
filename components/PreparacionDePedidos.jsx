"use client";

import { useEffect, useState } from "react";
import { BsQrCodeScan } from "react-icons/bs";
import { FaRoadCircleCheck } from "react-icons/fa6";
import { TbTruckLoading } from "react-icons/tb";
import Loader from "./Loader";

export default function PreparacionDePedidos({ session }) {
    const ahora = new Date();
    const formatFecha = (fecha) => {
        return fecha.toLocaleString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    const [pedidos, setPedidos] = useState([
        { id: 1, fecha: "2023-03-01 08:15:32", sinSifon: true, items: [
            { name: "CO2", multiplier: 2, quantity: 9, remaining: 2, unit: "kg", code: "NU0270" }, 
            { name: "O2", multiplier: 3, quantity: 10, remaining: 3, unit: "m3", code: "NU0450" }, 
            { name: "Argon", multiplier: 2, quantity: 45, remaining: 2, unit: "kg", code: "NU0780" },
            { name: "Atal", multiplier: 2, quantity: 9, remaining: 2, unit: "kg", code: "NU0270" }, 
            { name: "No3", multiplier: 3, quantity: 10, remaining: 3, unit: "m3", code: "NU0450" }, 
            { name: "O3", multiplier: 2, quantity: 45, remaining: 2, unit: "kg", code: "NU0780" },
        ] },
        { id: 2, fecha: "2023-03-01 06:42:18", sinSifon: false, items: [{ name: "CO2", multiplier: 1, quantity: 5, remaining: 1, unit: "kg", code: "NU0270" }, { name: "O2", multiplier: 4, quantity: 20, remaining: 4, unit: "m3", code: "NU0450" }] },
        { id: 3, fecha: "2023-03-01 04:27:45", sinSifon: true, items: [{ name: "Argon", multiplier: 1, quantity: 15, remaining: 1, unit: "kg", code: "NU0780" }, { name: "CO2", multiplier: 2, quantity: 30, remaining: 2, unit: "m3", code: "NU0270" }] },
        { id: 4, fecha: "2023-03-01 02:53:09", sinSifon: false, items: [{ name: "O2", multiplier: 3, quantity: 12, remaining: 3, unit: "kg", code: "NU0450" }, { name: "Argon", multiplier: 1, quantity: 25, remaining: 1, unit: "m3", code: "NU0780" }] },
        { id: 5, fecha: "2023-03-01 00:34:21", sinSifon: true, items: [{ name: "CO2", multiplier: 2, quantity: 8, remaining: 2, unit: "kg", code: "NU0270" }, { name: "O2", multiplier: 5, quantity: 50, remaining: 5, unit: "m3", code: "NU0450" }] },
        { id: 6, fecha: "2023-02-28 22:11:48", sinSifon: false, items: [{ name: "Argon", multiplier: 1, quantity: 10, remaining: 1, unit: "kg", code: "NU0780" }, { name: "CO2", multiplier: 3, quantity: 35, remaining: 3, unit: "m3", code: "NU0270" }] },
        { id: 7, fecha: "2023-02-28 20:29:36", sinSifon: true, items: [{ name: "O2", multiplier: 4, quantity: 20, remaining: 4, unit: "kg", code: "NU0450" }, { name: "Argon", multiplier: 2, quantity: 40, remaining: 2, unit: "m3", code: "NU0780" }] },
        { id: 8, fecha: "2023-02-28 18:47:03", sinSifon: false, items: [{ name: "CO2", multiplier: 1, quantity: 7, remaining: 1, unit: "kg", code: "NU0270" }, { name: "O2", multiplier: 6, quantity: 60, remaining: 6, unit: "m3", code: "NU0450" }] }
    ]);
    const [animating, setAnimating] = useState(false);
    const [scanMode, setScanMode] = useState(false);

    const handleRemoveFirst = () => {
        if (animating) return; // Evita múltiples clics durante la animación
        setAnimating(true);

        setTimeout(() => {
            setPedidos((prev) => prev.slice(1)); // Elimina el primer pedido después de la animación
            setAnimating(false);
        }, 1000); // Duración de la animación (en ms)
    };

    const handleScanMode = () => {
        setScanMode(!scanMode);        
    };

    const [inputCode, setInputCode] = useState("");

    const isCompleted = () => {
        if (pedidos.length === 0) return false;
        return pedidos[0].items.every((item) => item.remaining === 0);
    }

    const porcentajeCompletado = () => {
        if (pedidos.length === 0) return 0;
        const pedido = pedidos[0];
        const totalItems = pedido.items.reduce((sum, item) => sum + item.multiplier, 0);
        const scannedItems = pedido.items.reduce((sum, item) => sum + (item.multiplier - item.remaining), 0);
        return Math.round((scannedItems / totalItems) * 100);
    }

    useEffect(() => {
        if (!scanMode) return;
    
        const handleKeyDown = (e) => {
            console.log("Key pressed:", e.key, new Date());
            if (e.key === "Enter") {
                console.log(`Código ingresado: ${inputCode}`);
                setPedidos((prevPedidos) => {
                    const updatedPedidos = [...prevPedidos];
                    if (updatedPedidos.length === 0) return updatedPedidos;

                    const pedido = updatedPedidos[0];
                    const items = pedido.items;

                    // Filtrar los índices de los items con remaining > 0
                    const availableIndices = items
                        .map((item, index) => (item.remaining > 0 ? index : null))
                        .filter((index) => index !== null);

                    if (availableIndices.length > 0) {
                        // Elegir un índice aleatorio de los disponibles
                        const randomIndex =
                            availableIndices[
                                Math.floor(Math.random() * availableIndices.length)
                            ];
                        items[randomIndex].remaining -= 1;
                    }

                    if (items.every((i) => i.remaining === 0)) {
                        console.log("COMPLETADO");
                        setScanMode(false);
                    }

                    return updatedPedidos;
                });
                setInputCode(""); // Reinicia el código ingresado
            } else if (!isNaN(e.key)) {
                setInputCode((prev) => prev + e.key); // Agrega el número al código
            }
        };
    
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [scanMode, inputCode]);

    return (
        <div className="w-full h-screen overflow-hidden">
            <div className="w-full">
                {pedidos.map((pedido, index) => (
                    <div
                        key={pedido.id}
                        className={`absolute w-9/12 h-3/4 bg-white shadow-lg rounded-lg p-4 transition-all duration-500`}
                        style={{
                            top: `${index * 10 + 72}px`,
                            left: `${index * 10 + 160}px`,
                            zIndex: pedidos.length - index,
                            scale: 1 - index * 0.009,
                            transform: `translateX(${animating && index == 0 ? "-100%" : "0"})`,
                            opacity: animating && index == 0 ? 0 : 1,
                        }}
                    >
                        <h1 className="flex text-xl font-bold">
                            <TbTruckLoading className="text-5xl m-4" />
                            <div className="mt-2">
                                <p className="text-sm font-light">SOLCITADO EL</p>
                                <p className="text-3xl orbitron">{pedido.fecha}</p>
                            </div>
                        </h1>                                                    
                        <ul className="flex flex-wrap h-3/4 items-center justify-center">
                            <li className={`w-48 mr-2 text-sm border border-gray-300 rounded-xl px-2 flex flex-col items-center justify-center py-2 ${scanMode ? 'bg-green-600' : 'bg-sky-600'} text-white cursor-pointer hover:${scanMode ? 'bg-green-700' : 'bg-sky-700'} transition duration-300 ease-in-out h-40`}
                            onClick={handleScanMode}>
                                <p className="font-bold mb-2">{scanMode ? 'ESCANEO' : 'INICIAR'}</p>
                                <BsQrCodeScan className="text-4xl"/>                                
                                {scanMode ? <Loader texto="INICIADO"/> : <p className="font-bold mt-2">ESCANEO</p>}                                
                            </li>
                            {pedido.items.map((item, idx) => (
                                <li
                                    key={idx}
                                    className="w-48 mr-2 text-sm border border-gray-300 rounded-xl p-2 flex flex-col items-center justify-center py-8 shadow-md h-40"
                                >
                                    <div className="flex">
                                        <span className="font-bold text-2xl">{item.name.substring(0, item.name.length - 1)}{!isNaN(item.name.charAt(item.name.length - 1)) ? <small>{item.name.charAt(item.name.length - 1)}</small> : item.name.charAt(item.name.length - 1)}</span>
                                        <div className="text-white bg-red-600 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-1.5">{item.code}</div>
                                    </div>
                                    <p className="text-4xl orbitron"><b>{item.quantity}</b><small>{item.unit}</small></p>
                                    <p className="text-2xl font-bold orbitron">{item.multiplier - item.remaining} <small>/</small> {item.multiplier}</p>
                                </li>
                            ))}
                            <li className={`w-48 mr-2 text-sm border border-gray-300 rounded-xl px-2 flex flex-col items-center justify-center py-2  text-white h-40 ${isCompleted() ? 'bg-green-500' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                onClick={index === 0 ? handleRemoveFirst : undefined}>
                                <p className="font-bold mb-2">CONFIRMAR</p>
                                <FaRoadCircleCheck className="text-4xl"/>
                                <p className="font-bold mt-2">CARGA</p>
                            </li>
                        </ul>
                        
                        
                        <div className="w-full flex justify-center items-center mt-4">
                            <div className="w-1/2">
                                <div className="orbitron text-lg"><small>PROGRESO: </small>{porcentajeCompletado()}<small>%</small></div>
                                <div className="flex h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-neutral-700" role="progressbar" aria-valuenow={porcentajeCompletado} aria-valuemin="0" aria-valuemax="100">
                                    <div className="flex flex-col justify-center rounded-full overflow-hidden bg-blue-600 text-xs text-white text-center whitespace-nowrap transition duration-500 dark:bg-blue-500" style={{ "width": porcentajeCompletado() + "%" }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 bg-blue-200 text-black rounded-xl rounded-tl-none rounded-br-none px-6">
                            <p>CHOFER</p>
                            <p className="font-bold text-2xl">ANDRÉS VIDAL</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}