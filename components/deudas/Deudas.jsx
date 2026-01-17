'use client'

import { useEffect, useState } from "react";
import { CircularProgressbar } from "react-circular-progressbar";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import { TiUserAddOutline } from "react-icons/ti";
import 'react-circular-progressbar/dist/styles.css';
import Loader from "../Loader";
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { useForm } from "react-hook-form";
import Nav from "../Nav";
import { SessionProvider } from "next-auth/react";

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
    const [search] = useState("");
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingCliente, setLoadingCliente] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);
    const [pagination, setPagination] = useState({});
    const router = useRouter();
    const { setValue } = useForm();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        setClientes([]);
        setLoading(true);
        fetch(`/api/cobros?q=${period}&page=${pagination.page || 1}&sortBy=nombre&sortOrder=asc`)
            .then(res => res.json())
            .then(data => {
                console.log("Clientes data:", data);
                setClientes(data.clientes || []);
                setPagination(data.pagination || {});
                setLoading(false);
            });
    }, [period, pagination.page]);

    const filtered = clientes.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(search.toLowerCase())
    );

    // Cambia a una página específica
    const goToPage = (page) => {
        setLoading(true);
        setPagination(prev => ({ ...prev, page }));
    };

    // Página anterior
    const goToPrevPage = () => {
        if (pagination.page > 1) {
            goToPage(pagination.page - 1);
        }
    };

    // Página siguiente
    const goToNextPage = () => {
        if (pagination.page < pagination.totalPages) {
            goToPage(pagination.page + 1);
        }
    };

    return (<SessionProvider>
        <main className="w-full h-dvh overflow-hidden mt-2">
            <div className="px-6 sticky top-0">
                <div className="mx-32 mb-2">
                    <div className="flex items-end gap-2">
                        <div>
                            <button
                                type="button"
                                className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                                onClick={() => router.back()}
                            >
                                <IoChevronBack size="1.25rem" className="mr-2" />Volver
                            </button>
                        </div>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700">Nombre cliente / RUT</label>
                            <div className="relative">
                                <div className="w-full pr-0 md:pr-4 flex items-end">
                                    <div className="relative w-full">
                                        <input
                                            id="cliente"
                                            type="text"
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setLoadingClients(true);
                                                if (value.length > 2) {
                                                    fetch(`/api/clientes/search?q=${encodeURIComponent(value)}`)
                                                        .then(response => response.json())
                                                        .then(data => {
                                                            setAutocompleteClienteResults(data.clientes || []);
                                                            setLoadingClients(false);
                                                        })
                                                        .catch(() => {
                                                            setAutocompleteClienteResults([]);
                                                            setLoadingClients(false);
                                                        });
                                                } else {
                                                    setAutocompleteClienteResults([]);
                                                    setLoadingClients(false);
                                                }
                                            }}
                                        />
                                        {(loadingClients || loadingCliente) && <div className="absolute -right-2 top-1.5">
                                            <Loader texto="" />
                                        </div>}
                                        {autocompleteClienteResults.length > 0 && (
                                            <ul className="absolute z-10 border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full">
                                                {autocompleteClienteResults.map(cliente => (
                                                    <li
                                                        key={cliente._id}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                        onClick={async () => {
                                                            console.log("CLIENTE", cliente);
                                                            setLoadingCliente(true);
                                                            setValue("cliente", cliente.nombre);
                                                            router.push(`/pages/cobros/${cliente._id}`);
                                                        }}
                                                    >
                                                        <p>{cliente.nombre}</p>
                                                        <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="ml-2 flex items-center px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold"
                                        onClick={() => { setClienteSelected(null) }}
                                    >
                                        <TiUserAddOutline className="mr-1" size="1.25rem" /> Nuevo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
            </div>
            <div className="flex-1 overflow-y-auto px-6 h-[calc(100vh-176px)]">
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
                            riesgoTexto = "RIESGOSO";
                            riesgoColor = "#dc2626";
                        } else if (riesgoPorc > 50) {
                            riesgoTexto = "MODERADO";
                            riesgoColor = "#f59e42";
                        }
                        return (
                            <div
                                key={cliente._id}
                                onClick={() => {
                                    setRedirecting(true);
                                    router.push(`/pages/cobros/${cliente._id}`);
                                }}
                                className="relative w-full sm:w-1/3 max-w-[420px] flex-1 min-w-[300px] rounded-lg shadow p-4 border border-gray-200 flex flex-col hover:scale-105 hover:bg-blue-50 hover:top-2 transition-all cursor-pointer"
                            >

                                <div className="flex justify-between items-center mb-2">
                                    <div className="overflow-hidden">
                                        <p
                                            className="font-semibold text-md uppercase"
                                            style={{
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                maxWidth: "380px",
                                                display: "block"
                                            }}
                                            onClick={() => router.push(`/modulos/configuraciones/clientes?id=${cliente._id}`)}
                                            title={cliente.nombre}
                                        >
                                            {cliente.nombre}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {cliente.ventasPorCobrar} venta{cliente.ventasPorCobrar !== 1 ? "s" : ""} por cobrar
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            última venta: {new Date(cliente.ultimaVenta || 0).toLocaleDateString("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" })} ({dayjs(cliente.ultimaVenta).fromNow()})
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
                            </div>
                        );
                    })}
                </div>
            </div>
            {!loading && clientes.length > 0 && (
                <div className="w-full flex justify-center items-center">
                    <nav className="flex gap-2">
                        {/* Botón anterior */}
                        {pagination?.page > 1 && (
                            <button
                                className="px-3 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                onClick={goToPrevPage}
                            >
                                &laquo; Anterior
                            </button>
                        )}
                        {/* Números de página con ellipsis */}
                        {(() => {
                            const totalPages = pagination?.totalPages || 1;
                            const currentPage = pagination?.page || 1;
                            const maxPagesToShow = 11;
                            let pages = [];

                            if (totalPages <= maxPagesToShow) {
                                // Mostrar todas las páginas
                                for (let i = 1; i <= totalPages; i++) {
                                    pages.push(i);
                                }
                            } else {
                                // Siempre mostrar la primera y última página
                                let start = Math.max(2, currentPage - 4);
                                let end = Math.min(totalPages - 1, currentPage + 4);

                                // Ajustar si estamos cerca del inicio o fin
                                if (currentPage <= 6) {
                                    start = 2;
                                    end = maxPagesToShow - 2;
                                } else if (currentPage >= totalPages - 5) {
                                    start = totalPages - (maxPagesToShow - 3);
                                    end = totalPages - 1;
                                }

                                pages.push(1);
                                if (start > 2) {
                                    pages.push('left-ellipsis');
                                }
                                for (let i = start; i <= end; i++) {
                                    pages.push(i);
                                }
                                if (end < totalPages - 1) {
                                    pages.push('right-ellipsis');
                                }
                                pages.push(totalPages);
                            }

                            return pages.map((num, idx) => {
                                if (num === 'left-ellipsis' || num === 'right-ellipsis') {
                                    return (
                                        <span key={num + idx} className="px-2 py-2 text-gray-400 select-none">...</span>
                                    );
                                }
                                return (
                                    <button
                                        key={num}
                                        className={`px-3 py-2 rounded-md font-semibold text-xs ${pagination?.page === num ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                        onClick={() => goToPage(num)}
                                        disabled={pagination?.page === num}
                                    >
                                        {num}
                                    </button>
                                );
                            });
                        })()}
                        {pagination?.page < (pagination?.totalPages || 1) && (
                            <button
                                className="px-3 py-2 rounded-md bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                onClick={goToNextPage}
                            >
                                Próximo &raquo;
                            </button>
                        )}
                    </nav>
                </div>
            )}
            {redirecting && (
                <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                    <Loader texto="Cargando..." />
                </div>
            )}
            <Nav />
        </main>
    </SessionProvider>);
}
