'use client'

import { useEffect, useState } from "react";
import { CircularProgressbar } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { FiPhone, FiMail } from "react-icons/fi";
import Loader from "../Loader";
import MultiLineChart from "@/components/charts/MultiLineChart";
import { IoChevronBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);

export default function DetalleDeudas({ clienteId }) {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!clienteId) return;
        setLoading(true);
        fetch(`/api/cobros/detalle?id=${clienteId}`)
            .then(res => res.json())
            .then(data => {
                console.log("Datos del cliente:", data);
                setCliente(data.cliente);
                setLoading(false);
            });
    }, [clienteId]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
                <Loader texto="Cargando..." />
            </div>
        );
    }
    if (!cliente) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
                <span className="text-xl">Cliente no encontrado</span>
            </div>
        );
    }

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

    // Prepara datos para MultiLineChart
    const meses = Array.from({ length: 12 }, (_, i) => {
        return new Date(new Date().getFullYear(), new Date().getMonth() - (11 - i), 1);
    });

    // const chartData = [
    //     {
    //         category: "Deuda",
    //         points: meses.map((date, i) => ({
    //             date,
    //             value: deudasData[i]?.deuda ?? 0
    //         }))
    //     },
    //     {
    //         category: "Pagos",
    //         points: meses.map((date, i) => ({
    //             date,
    //             value: pagosData[i]?.pago ?? 0
    //         }))
    //     }
    // ];

    // Valores aleatorios para los últimos 6 meses
    const chartData = [
        {
            category: "Deuda",
            points: meses.map((date) => ({
                date,
                value: Math.floor(Math.random() * 1000000) + 100000
            }))
        },
        {
            category: "Pagos",
            points: meses.map((date) => ({
                date,
                value: Math.floor(Math.random() * 800000) + 50000
            }))
        }
    ];

    return (
        <main className="w-full mt-3">
            <div className="w-full h-[calc(100vh-80px)] overflow-y-scroll">
                <div className="ml-24">
                    <button
                        type="button"
                        className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                        onClick={() => router.back()}
                    >
                        <IoChevronBack size="1.25rem"/>Volver
                    </button>
                </div>
                
                <div className="bg-white dark:bg-gray-900 px-6 pt-4 flex flex-col md:flex-row gap-1">


                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2 uppercase">{cliente.nombre}</h2>
                        <p className="text-md text-gray-500 mb-1">RUT: {cliente.rut}</p>
                        <p className="text-sm text-gray-500 mb-1">
                            Última venta: {cliente.ultimaVenta ? new Date(cliente.ultimaVenta).toLocaleDateString("es-CL") : "Sin ventas"} ({dayjs(cliente.ultimaVenta).fromNow()})
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            Último pago: {cliente.ultimoPago ? new Date(cliente.ultimoPago).toLocaleDateString("es-CL") : "Sin pagos"}
                        </p>
                        <div className="flex gap-2 mt-4">
                            <a href={`tel:${cliente.telefono}`} className="hover:text-blue-500 flex items-center gap-1 px-2 py-1 border rounded">
                                <FiPhone /> <span className="text-xs">Llamar</span>
                            </a>
                            <a href={`mailto:${cliente.email}`} className="hover:text-blue-500 flex items-center gap-1 px-2 py-1 border rounded">
                                <FiMail /> <span className="text-xs">Mail</span>
                            </a>
                        </div>
                    </div>

                    <div className="w-[220px] mr-4 border rounded-lg px-2"
                        style={{ height: "284px" }}>
                        <span className="text-xs font-bold mb-2">Cilindros</span>                        
                        <div className="overflow-y-auto w-full" style={{ maxHeight: "210px" }}>
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="p-1 border-b font-semibold">Código</th>
                                        <th className="p-1 border-b font-semibold">Gas / Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(cliente.cilindros ?? []).map((cil, idx) => (
                                        <tr key={cil._id || idx} className="border-b">
                                            <td className="p-1">{cil.codigo}</td>
                                            <td className="p-1">
                                                <span className="font-semibold">{cil.elemento ?? "Gas"}</span>
                                                {" "}
                                                <span className="text-gray-600">
                                                    {cil.cantidad} {cil.unidad ?? ""}
                                                </span>
                                                {cil.sinSifon ? <span className="text-white bg-red-500 font-bold ml-1 rounded-md px-1">S/S</span> : null}
                                                {cil.esIndustrial ? <span className="text-white bg-blue-500 font-bold ml-1 rounded-md px-1">IND</span> : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 min-w-[120px] mr-4 border rounded-lg px-2">
                        <div className="w-24 h-24">
                            <CircularProgressbar
                                value={riesgoPorc}
                                text={`${riesgoPorc}%`}
                                strokeWidth={16}
                                styles={{
                                    path: { stroke: riesgoColor },
                                    text: { fill: riesgoColor, fontWeight: "bold" }
                                }}
                            />
                        </div>
                        <span className="text-xs font-bold" style={{ color: riesgoColor }}>{riesgoTexto}</span>
                        <div className="bg-gray-50 rounded-md px-4 py-2 border border-gray-200 w-full mt-2">
                            <span className="text-xs font-bold text-gray-400">Crédito</span>
                            <div className="grid grid-cols-2 gap-x-4 text-md mb-1">
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
                            </div>
                        </div>
                    </div>

                    <div className="flex-col items-center justify-center gap-2 border pt-4 px-6 rounded-lg w-[512px] h-[284px]">
                        <h3 className="text-lg font-bold mb-4">Gráfico de Deuda y Pagos últimos 6 meses</h3>
                        <div className="w-full mx-auto">
                            <MultiLineChart
                                data={chartData}
                                width={492}
                                height={224}
                                colorIndexes={[3, 7]}
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 -mt-8">
                    <h3 className="text-lg font-bold mb-4">Detalle de Ventas por Cobrar</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border">Fecha</th>
                                    <th className="p-2 border">Total</th>
                                    <th className="p-2 border">Vendedor</th>
                                    <th className="p-2 border">Documento</th>
                                    <th className="p-2 border">Detalle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cliente.ventas.map((v, idx) => (
                                    <tr key={idx} className="border-b">
                                        <td className="p-2 border">{new Date(v.fecha).toLocaleDateString("es-CL")}</td>
                                        <td className="p-2 border">{v.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</td>
                                        <td className="p-2 border">{v.vendedor}</td>
                                        <td className="p-2 border">{v.documento}</td>
                                        <td className="p-2 border">
                                            <ul className="list-disc pl-4">
                                                {v.detalles.map((d, i) => (
                                                    <li key={i} className="flex">
                                                        <div className="w-2/3">{d.cantidad}x {d.glosa}</div>
                                                        <div className="w-1/3">Total: {d.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}