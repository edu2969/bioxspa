'use client'

import { useEffect, useState } from "react";
import { CircularProgressbar } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { MdOutlineVisibility } from "react-icons/md";
import { FiPhone, FiMail } from "react-icons/fi";
import Loader from "../Loader";
import { LiaPencilAltSolid } from "react-icons/lia";
import { useRouter } from "next/navigation";

const PERIODS = [
    { label: "Actual", value: 0 },
    { label: "30 días", value: 30 },
    { label: "60 días", value: 60 },
    { label: "90 días", value: 90 },
];

export default function Deudas() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(0);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        setClientes([]);
        setLoading(true);
        fetch(`/api/cobros?q=${period}`)
            .then(res => res.json())
            .then(data => {
                setClientes(data.clientes || []);
                setLoading(false);
            });
    }, [period]);

    const filtered = clientes.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(search.toLowerCase())
    );    

    return (
        <main className="w-full h-dvh overflow-hidden mt-10">
            <div className="bg-white dark:bg-gray-900 px-6 pt-6 sticky top-0 z-10">
                <div className="flex gap-2 mb-4">
                    {PERIODS.map(p => (
                        <button
                            key={p.value}
                            className={`px-4 py-2 rounded-full font-bold text-xs ${period === p.value ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Buscar cliente..."
                    className="w-full p-2 mb-2 border rounded"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 h-[calc(100vh-166px)]">
                {loading && (
                    <div
                        className="flex justify-center items-center"
                        style={{
                            minHeight: "calc(100vh - 220px)", // Ajusta 120px según el margen superior real
                        }}
                    >
                        <Loader texto="Cargando..." />
                    </div>
                )}
                {!loading && filtered.length === 0 && (
                    <div
                        className="flex justify-center items-center"
                        style={{
                            minHeight: "calc(100vh - 220px)", // Ajusta 120px según el margen superior real
                        }}
                    >
                        <p className="text-xl mt-2 ml-4 uppercase">Sin deudores</p>
                    </div>
                )}
                <div className="flex flex-wrap gap-6">
                    {filtered.map(cliente => {
                        const credito = cliente.credito ?? 0;
                        const utilizado = cliente.totalDeuda ?? 0;
                        const disponible = cliente.disponible ?? 0;
                        let riesgoPorc = credito > 0 ? Math.round((utilizado / credito) * 100) : 0;
                        if (riesgoPorc < 0) riesgoPorc = 0;
                        if (riesgoPorc > 100) riesgoPorc = 100;
                        let riesgoTexto = "BIEN";
                        let riesgoColor = "#22c55e";
                        if (riesgoPorc > 80) {
                            riesgoTexto = "QUIEBRA";
                            riesgoColor = "#dc2626";
                        } else if (riesgoPorc > 50) {
                            riesgoTexto = "RIESGOSO";
                            riesgoColor = "#f59e42";
                        }
                        return (
                            <div
                                key={cliente._id}
                                className="w-full sm:w-1/3 max-w-[420px] flex-1 min-w-[300px] bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="flex font-semibold text-lg uppercase" onClick={() => router.push(`/modulos/configuraciones/clientes?id=${cliente._id}`)}>
                                            {cliente.nombre}
                                            <LiaPencilAltSolid size="1.5rem" className="mt-1 ml-2 text-blue-600 hover:text-blue-500 cursor-pointer"/>
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {cliente.ventas.length} venta{cliente.ventas.length !== 1 ? "s" : ""} por cobrar
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            última venta: {new Date(cliente.ultimaVenta || 0).toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center mb-4">
                                    <div className="w-20 text-center">
                                        <div className="w-14 h-14 mx-auto">
                                            <CircularProgressbar
                                                className="w-14 h-14"
                                                strokeWidth={16}
                                                value={riesgoPorc}
                                                text={`${riesgoPorc}%`}
                                                styles={{
                                                    path: { stroke: riesgoColor },
                                                    text: { fill: riesgoColor, fontWeight: "bold" }
                                                }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold px-2`} style={{ color: riesgoColor }}>{riesgoTexto}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-gray-50 rounded-md px-4 py-1 border border-gray-200">
                                            <span className="text-xs font-bold text-gray-400">Crédito</span>
                                            <div className="grid grid-cols-2 gap-x-4 text-xs mb-1">
                                                <div className="flex flex-col items-start space-y-1">
                                                    <span className="font-semibold">Autorizado</span>
                                                    <span className="font-semibold text-orange-700">Utilizado</span>
                                                    <span className="font-semibold text-green-600">Disponible</span>
                                                </div>
                                                <div className="flex flex-col items-end space-y-1">
                                                    <span className="font-semibold">
                                                        {credito.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                                    </span>
                                                    <span className="font-semibold text-orange-700">
                                                        {utilizado.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                                    </span>
                                                    <span className="font-semibold text-green-600">
                                                        {disponible.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                                    </span>                                        
                                                </div>
                                                <p className="text-xs text-gray-500 text-right col-span-2 italic mt-2">
                                                    Ultimo pago: {new Date(cliente.ultimoPago || 0).toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-center items-center mt-2">
                                    {cliente.telefono && (
                                        <a href={`tel:${cliente.telefono}`} className="hover:text-blue-500 flex items-center gap-1 px-2 py-1 border rounded">
                                            <FiPhone /> <span className="text-xs">Llamar</span>
                                        </a>
                                    )}
                                    {cliente.email && (
                                        <a href={`mailto:${cliente.email}`} className="hover:text-blue-500 flex items-center gap-1 px-2 py-1 border rounded">
                                            <FiMail /> <span className="text-xs">Mail</span>
                                        </a>
                                    )}
                                    <a href={`/modulos/cobros/${cliente._id}`} className="hover:text-blue-400 px-2 py-1 flex items-center gap-1 border rounded">
                                        <MdOutlineVisibility size="1.2rem" /> <span className="text-xs">Ver deuda</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
