"use client";

import React, { useEffect, useState, useCallback } from "react";
import { LiaTimesSolid } from "react-icons/lia";
import Loader from "./Loader";
import { FaClipboardCheck } from "react-icons/fa";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import Link from "next/link";
import { MdAddTask } from "react-icons/md";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).toUpperCase();
}

function amountFormat(num) {
    if (!num && num !== 0) return "";
    return num.toLocaleString("es-CL");
}

export default function GestionPedidos() {
    const [pedidoEdit, setPedidoEdit] = useState(null);
    const [pedido, setPedido] = useState({});
    const [items, setItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [credito, setCredito] = useState(null);
    const [redirecting, setRedirecting] = useState(false);
    const [sucursales, setSucursales] = useState([]);
    const { setValue, getValues } = useForm();    

    const fetchPedidos = useCallback(async (sucursalId) => {
        const res = await fetch(`/api/pedidos/borradores${sucursalId ? `?sucursalId=${sucursalId}` : ""}`);
        if (res.ok) {
            const data = await res.json();
            console.log("Pedidos obtenidos:", data.pedidos);
            setPedidos(data.pedidos);
            setLoading(false);
        } else {
            console.error("Error al obtener pedidos");
        }
    }, [setPedidos, setLoading]);

    const fetchSucursales = useCallback(async () => {
        try {
            const response = await fetch(`/api/pedidos/borradores/sucursales`);
            if (!response.ok) {
                throw new Error("Failed to fetch sucursales");
            }
            const data = await response.json();
            console.log("Fetched sucursales:", data);
            setSucursales(data.sucursales);
            if (data.sucursales.length === 1) {
                setValue("sucursalId", data.sucursales[0]._id);
                fetchPedidos(data.sucursales[0]._id);
            }
        } catch (error) {
            console.error("Error fetching sucursales:", error);
        }
    }, [setSucursales, setValue, fetchPedidos]);

    const handleOpenPedido = (pedidoData) => {
        console.log("Abriendo pedido:", pedidoData);
        const fetchCreditoCliente = async () => {
            if (!pedidoData.cliente?._id) return;
            const res = await fetch(`/api/clientes/creditos?id=${pedidoData.cliente._id}`);
            if (res.ok) {
                const data = await res.json();
                console.log("CREDITO", data);
                setCredito({ ...data });
            } else {
                console.error("Error al obtener crédito del cliente");
            }
        }

        setPedidoEdit(pedidoData._id);
        setPedido(pedidoData);
        // Deep copy de items, asegurando que los precios vacíos sean string vacío
        setItems(
            pedidoData.items.map(item => ({
                ...item,
                precio: item.precio !== undefined && item.precio !== null ? Number(item.precio) : ""
            }))
        );
        fetchCreditoCliente();
    };

    const handlePrecioChange = (idx, value) => {
        const clean = value.replace(/\D/g, "");
        const newItems = [...items];
        // Si el input está vacío, deja string vacío, si no, número
        newItems[idx].precio = clean === "" ? "" : Number(clean);
        setItems(newItems);
    };

    const allPreciosOk = items.length > 0 && items.every((item) =>
        item.precio !== "" && Number(item.precio) > 0
    );

    const handleSave = async () => {
        console.log("Guardando pedido con items:", items);
        setSaving(true);
        try {
            const precios = items
                .map(item => {
                    // Busca el identificador de subcategoría en el item
                    const subcategoriaCatalogoId = item.subcategoriaCatalogoId;
                    return {
                        subcategoriaCatalogoId,
                        precio: Number(item.precio)
                    };
                });

            console.log("Precios a enviar:", precios);

            if (!precios.length) {
                toast.error("Debe ingresar todos los precios antes de aprobar.");
                setSaving(false);
                return;
            }

            const res = await fetch("/api/pedidos/borradores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ventaId: pedidoEdit,
                    precios
                })
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                toast.success("Pedido aprobado correctamente");
                setPedidoEdit(null);
                setItems([]);
                fetchPedidos();
            } else {
                toast.error(data.error || "Error al aprobar pedido");
            }
        } catch {
            toast.error("Error de red al aprobar pedido");
        } finally {
            setSaving(false);
        }
    };

    const onClose = () => {
        setPedidoEdit(null);
        setItems([]);
    };

    useEffect(() => {
        fetchSucursales();
        const sucursalId = localStorage.getItem("sucursalId") || null;
        if (sucursalId) {
            setValue("sucursalId", sucursalId);
        }
        fetchPedidos(sucursalId);
    }, [fetchPedidos, setValue, fetchSucursales]);

    const riesgo = (credito) => {
        if (!credito) return { porcentaje: 0, color: "green" };
        const valor = Math.min(100, Math.max(0, (credito.utilizado / credito.autorizado) * 100));
        return {
            texto: valor > 80 ? "RIESGOSO" : valor > 50 ? "ACEPTABLE" : "BUENO",
            porcentaje: Math.round(valor),
        }
    }

    return (
        <main className="w-full py-4 h-screen bg-gray-50">
            <div className="flex text-center items-center justify-center space-x-2">                
                {sucursales.length > 0 && (
                    <div className="flex justify-start">
                        <div className="flex">
                            {sucursales.map((sucursal, idx) => {
                                const isActive = getValues("sucursalId") === sucursal._id;
                                const isFirst = idx === 0;
                                const isLast = idx === sucursales.length - 1;
                                return (
                                    <button
                                        key={sucursal._id}
                                        className={`
                                        flex items-center px-5 py-2 font-semibold
                                        ${isFirst && isLast ? "rounded-md" : ""}
                                        ${isFirst && !isLast ? "rounded-r-none rounded-l-md" : ""}
                                        ${isLast && !isFirst ? "rounded-l-none rounded-r-md" : ""}
                                        ${!isFirst && !isLast ? "" : ""}
                                        ${isActive
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-blue-100"}
                                        border-0
                                        ${!isFirst ? "-ml-px" : ""}
                                        transition-colors
                                        relative
                                    `}
                                        onClick={() => {
                                            if (isActive) return;
                                            setValue("sucursalId", sucursal._id);
                                            localStorage.setItem("sucursalId", sucursal._id);
                                            setLoading(true);
                                            fetchPedidos(sucursal._id);
                                        }}
                                        type="button"
                                    >
                                        <span>{sucursal.nombre}</span>
                                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-blue-600 rounded-full border border-blue-200">
                                            {sucursal.ventasActivas || 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div>
                    <Link href="/modulos/pedidos/nuevo" className="relative -mt-2" onClick={() => setRedirecting(true)}>
                        <button className="flex items-center bg-blue-500 text-white h-10 rounded hover:bg-blue-600 transition-colors font-semibold px-3"
                            disabled={redirecting}>
                            <MdAddTask size={32} className="pl-0.5 mr-2" /> NUEVO
                        </button>
                        {redirecting && <div className="absolute -top-0 -left-16 w-32 h-full pt-1 pl-4">
                            <div className="absolute -top-0 -left-0 w-full h-full bg-white opacity-70"></div>
                            <Loader texto="" />
                        </div>}
                    </Link>
                </div>
            </div>
            <div className="w-full pb-4 px-4 h-[calc(100vh-98px)] overflow-y-scroll">
                {!loading && pedidos.length > 0 && <div className="flex flex-wrap gap-6">
                    {pedidos.map((pedido) => (
                        <div
                            key={pedido._id}
                            className="w-full sm:w-1/3 max-w-[420px] flex-1 min-w-[300px] space-y-6 cursor-pointer"
                            onClick={() => handleOpenPedido(pedido)}
                        >
                            <div
                                data-edit-pedido
                                data-id={pedido._id}
                                className={`${'bg-yellow-50'} rounded-lg shadow px-4 pt-4 pb-2 border border-gray-200 hover:shadow-lg hover:scale-105 transition`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="-mt-8">
                                        <p className="font-semibold text-lg">{pedido.cliente.nombre}</p>
                                        <p className="text-xs text-gray-500">{pedido.cliente.rut}</p>
                                    </div>
                                    <div className="flex flex-col space-y-1 mt-4">
                                        <p className="text-center text-xs bg-yellow-100 text-yellow-700 rounded px-2 py-0.5 -mt-6">
                                            COTIZACION
                                        </p>
                                        <p className="text-xs bg-blue-100 text-yellow-700 rounded px-2 py-0.5 -mt-6">
                                            {formatFecha(pedido.fecha)}
                                        </p>
                                        <p className="text-xs text-right">
                                            4 días atrás
                                        </p>
                                    </div>
                                </div>
                                <div className="mb-2 -mt-6">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Solicitante:</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="font-semibold">{pedido.solicitante.nombre}</span>
                                        <span>|</span>
                                        <span>{pedido.solicitante.telefono}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Pedido:</p>
                                <div className="border-2 border-gray-100 rounded max-h-48 overflow-y-auto">
                                    <ul>
                                        {pedido.items.map((item, idx2) => (
                                            <li
                                                key={idx2}
                                                className={`flex justify-between items-center text-sm ${idx2 % 2 === 0 ? "bg-gray-100" : "bg-gray-50"
                                                    } px-2 py-1 rounded`}
                                            >
                                                <span>
                                                    <b>{item.cantidad}</b> x {item.producto} {item.capacidad}
                                                </span>
                                                <span className="ml-2 flex items-center">
                                                    {/*idx2 === 1 && item.precio !== undefined && (
                                                        <span className="mr-1 text-red-600 text-lg">
                                                            <IoMdAlert />
                                                        </span>
                                                    ). Esta es una alerta que iría en caso del que precio haya vencido. */}
                                                    {item.precio !== undefined ? (
                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                            ${amountFormat(item.precio)}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                            Sin precio
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                        {/* Totalizador */}
                                        <li className="flex justify-between items-center text-sm bg-gray-200 px-2 py-1 rounded font-bold rounded-t-none border-yellow-200">
                                            <span>Total</span>
                                            <span className="text-yellow-700">
                                                ${pedido.items.reduce((acc, item) => acc + ((parseInt(item.cantidad) || 0) * (parseInt(item.precio) || 0)), 0).toLocaleString("es-CL")}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>}
                {!loading && pedidos.length === 0 && <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">No hay pedidos disponibles</p>
                </div>}
            </div>

            {pedidoEdit && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                            onClick={onClose}
                            aria-label="Cerrar"
                            type="button"
                        >
                            <LiaTimesSolid />
                        </button>
                        <h2 className="text-xl font-bold mb-2 text-center">Gestionar Pedido</h2>
                        <div className="flex flex-start">
                            <div className="w-1/3">
                                <div className="mb-4">
                                    <div className="mb-1 text-sm text-gray-700 font-semibold">{pedido.cliente?.nombre}</div>
                                    <div className="text-xs text-gray-500">{pedido.cliente?.rut}</div>
                                </div>
                                <div className="mb-4">
                                    <div className="text-sm font-medium text-gray-700 mb-1">Solicitante:</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="font-semibold">{pedido.solicitante?.nombre}</span>
                                        <span>|</span>
                                        <span>{pedido.solicitante?.telefono}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative flex w-2/3 justify-end">
                                <div className="ml-3 mt-4">
                                    <div className="bg-white rounded-md px-4 -pt-4 border border-gray-300">
                                        <span className="relative -top-[14px] text-xs font-bold bg-white px-2 text-gray-400">Crédito</span>
                                        <div className="grid grid-cols-2 gap-x-4 text-xs -mt-4 mb-1">
                                            <div className="flex flex-col items-start space-y-1">
                                                <span className="font-semibold text-green-600">Disponible</span>
                                                <span className="font-semibold text-orange-700">Utilizado</span>
                                                <span className="font-semibold">Saldo</span>
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                <span className="font-semibold text-green-600">
                                                    {credito?.autorizado.toLocaleString("es-CL", { style: "currency", currency: "CLP" }) || '-.---.---'}
                                                </span>
                                                <span className="font-semibold text-orange-700">
                                                    {credito?.utilizado.toLocaleString("es-CL", { style: "currency", currency: "CLP" }) || '-.---.---'}
                                                </span>
                                                <span className="font-semibold">
                                                    {credito && (credito?.autorizado - credito?.utilizado).toLocaleString("es-CL", { style: "currency", currency: "CLP" }) || '-.---.---'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-20 ml-3 mt-3 text-center">
                                    <div className="w-14 h-14 relative mx-auto orbitron">
                                        <CircularProgressbar className="w-14 h-14" strokeWidth={16} value={riesgo(credito).porcentaje} text={`${!credito ? '-' : riesgo(credito).porcentaje}%`}
                                            styles={buildStyles({
                                                // Invertido: 0 (verde) -> 120, 100 (rojo) -> 0
                                                pathColor: `hsl(${120 - Math.round((riesgo(credito).porcentaje / 100) * 120)}, 100%, 40%)`
                                            })} />
                                    </div>
                                    <span className="text-xs font-bold bg-white px-2 text-gray-400">{riesgo(credito).texto}</span>
                                </div>
                                {!credito && <div className="absolute top-0 right-0 -mt-2 -mr-2 w-full h-24 justify-center items-center flex">
                                    <div className="absolute top-0 right-0 bg-white w-full h-24 opacity-70"></div>
                                    <Loader texto="Cargando información" />
                                </div>}
                            </div>
                        </div>
                        <div>
                            <div className="overflow-x-auto rounded border border-gray-200 bg-gray-50">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700">
                                            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                                            <th className="px-3 py-2 text-left font-semibold">Producto</th>
                                            <th className="px-3 py-2 text-right font-semibold">Precio unitario</th>
                                            <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                                            const isMissing = item.precio === "" || Number(item.precio) <= 0;
                                            const precioNum = item.precio === "" ? 0 : Number(item.precio);
                                            const subtotal = precioNum * Number(item.cantidad);
                                            return (
                                                <tr key={idx} className="border-t border-gray-200">
                                                    <td className="px-3 py-2 text-right">{item.cantidad}</td>
                                                    <td className="px-3 py-2">
                                                        <span>{item.producto} {item.capacidad}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex items-center justify-end">
                                                            <span className="text-gray-500 mr-1">$</span>
                                                            <input
                                                                type="text"
                                                                className={
                                                                    `border rounded px-2 py-1 w-24 text-right transition ` +
                                                                    (isMissing
                                                                        ? "border-red-400 bg-red-50 text-red-700"
                                                                        : "border-green-400 bg-green-50 text-green-700")
                                                                }
                                                                placeholder="Precio"
                                                                value={item.precio === "" ? "" : Number(item.precio).toLocaleString("es-CL")}
                                                                onChange={e => handlePrecioChange(idx, e.target.value)}
                                                                inputMode="numeric"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="font-semibold text-gray-700">
                                                            ${subtotal > 0 ? subtotal.toLocaleString("es-CL") : "-"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100 border-t border-gray-300">
                                            <td className="px-3 py-2 font-bold text-right" colSpan={3}>Total</td>
                                            <td className="px-3 py-2 text-right font-bold text-blue-700">
                                                ${items.reduce((acc, item) => {
                                                    const precioNum = item.precio === "" ? 0 : Number(item.precio);
                                                    return acc + precioNum * Number(item.cantidad);
                                                }, 0).toLocaleString("es-CL")}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                className={`w-full h-12 rounded font-semibold text-white ${allPreciosOk && !saving ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
                                disabled={!allPreciosOk || saving}
                                onClick={handleSave}
                            >
                                {saving ? <div className="relative"><Loader texto="Guardando" /></div> : "Aprobar venta"}
                            </button>
                            <button
                                className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                <p className="text-xl font-bold">Cargando borradores</p>
            </div>}

            {!loading && pedidos.length == 0 && (
                <div className="flex items-center justify-center h-full -mt-16">
                    <div className="w-full mx-auto">
                        <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                        <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                        <p className="text-center uppercase font-xl">No pedido pendientes</p>
                    </div>
                </div>
            )}
        </main>
    );
}