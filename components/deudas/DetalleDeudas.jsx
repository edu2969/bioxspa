'use client'

import { useEffect, useState, useRef, useCallback } from "react";
import { CircularProgressbar } from "react-circular-progressbar";
import 'react-circular-progressbar/dist/styles.css';
import { FiPhone, FiMail } from "react-icons/fi";
import Loader from "../Loader";
import MultiLineChart from "@/components/charts/MultiLineChart";
import { IoChevronBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { LiaPencilAltSolid, LiaTimesSolid } from "react-icons/lia";
import { FaChevronDown, FaChevronUp, FaCloudUploadAlt, FaRegSave } from "react-icons/fa";
dayjs.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs.extend(relative);
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from "react-hook-form";
import { TbMoneybag } from "react-icons/tb";
import Image from "next/image";

export default function DetalleDeudas({ clienteId }) {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [editandoCreditoDisponible, setEditandoCreditoDisponible] = useState(false);
    const { register, getValues, setValue, resetField, watch } = useForm();
    const [creditoAutorizado, setCreditoAutorizado] = useState(0);
    const [pagarModal, setPagarModal] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [faltaMonto, setFaltaMonto] = useState(true);
    const [montoAPagar, setMontoAPagar] = useState(0);
    const [archivoCargado, setArchivoCargado] = useState(null);
    const [pagosSeleccionados, setPagosSeleccionados] = useState(new Set());
    const [detalleExpandido, setDetalleExpandido] = useState(null);
    const [formasPago, setFormasPago] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [cilindros, setCilindros] = useState([]);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [loadingPagos, setLoadingPagos] = useState(false);
    const [loadingCilindros, setLoadingCilindros] = useState(false);
    const [updatingCredito, setUpdatingCredito] = useState(false);
    const [tabSelected, setTabSelected] = useState(0);

    const uploadFileRef = useRef(null);

    const fetchFormasPago = async () => {
        const res = await fetch("/api/formaPago");
        const data = await res.json();
        setFormasPago(data);
    };

    const fetchVentas = useCallback(async () => {
        setLoadingVentas(true);
        fetch(`/api/clientes/ventas?id=${clienteId}`)
            .then(res => res.json())
            .then(data => {
                console.log("Datos de ventas:", data);
                setVentas(data.ventas);
            })
            .finally(() => {
                setLoadingVentas(false);
            });
    }, [clienteId, setVentas, setLoadingVentas]);

    const fetchPagos = useCallback(async () => {
        setLoadingPagos(true);
        fetch(`/api/clientes/pagos?id=${clienteId}`)
            .then(res => res.json())
            .then(data => {
                console.log("Datos de pagos:", data);
                setPagos(data.pagos);
            })
            .finally(() => {
                setLoadingPagos(false);
            });
    }, [clienteId, setPagos, setLoadingPagos]);

    const fetchCilindros = useCallback(async () => {
        setLoadingCilindros(true);
        fetch(`/api/clientes/cilindros?id=${clienteId}`)
            .then(res => res.json())
            .then(data => {
                console.log("Datos de cilindros:", data);
                setCilindros(data.cilindros);
            })
            .finally(() => {
                setLoadingCilindros(false); 
            });
    }, [clienteId, setCilindros, setLoadingCilindros]);    

    const fetchCobros = useCallback(async () => {
        fetch(`/api/cobros/detalle?id=${clienteId}`)
        .then(res => res.json())
        .then(data => {
            console.log("Datos del cliente:", data);
            setCliente(data.cliente);
            setCreditoAutorizado(data.cliente.credito || 0);
            setLoading(false);
        });
    }, [clienteId, setCliente, setCreditoAutorizado, setLoading]);

    useEffect(() => {
        const actualizarCobros = async() => {
            await fetchCobros();
            await fetchVentas();
            await fetchCilindros();
        }
        fetchFormasPago();
        if (!clienteId) return;
        setLoading(true);
        actualizarCobros();
    }, [clienteId, fetchCobros]);

    useEffect(() => {
        console.log("PAGOS SELECCIONADOS", pagosSeleccionados);
    }, [pagosSeleccionados]);

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
    let riesgoColor = "#16a34a ";
    if (riesgoPorc > 80) {
        riesgoTexto = "RIESGOSO";
        riesgoColor = "#dc2626";
    } else if (riesgoPorc > 50) {
        riesgoTexto = "MODERADO";
        riesgoColor = "#f59e42";
    }

    // Prepara datos para MultiLineChart
    const meses = Array.from({ length: 12 }, (_, i) => {
        return new Date(new Date().getFullYear(), new Date().getMonth() - (11 - i), 1);
    });

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

    const guardarCambios = () => {
        setUpdatingCredito(true);
        fetch("/api/clientes/creditos/nuevoDisponible", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clienteId, credito: creditoAutorizado })
        })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    toast.success("Crédito actualizado correctamente");
                    setCliente(prev => ({ ...prev, credito: creditoAutorizado }));
                } else {
                    toast.error(data.error || "Error al actualizar crédito");
                    setCreditoAutorizado(cliente.credito || 0);
                }
            })
            .catch(() => {
                toast.error("Error de red al actualizar crédito");
            })
            .finally(() => {
                setUpdatingCredito(false);
                setEditandoCreditoDisponible(false);
            });
    };

    const handlePrecioChange = (value) => {
        const clean = value.replace(/\D/g, "");
        const nuevoMonto = clean === "" ? 0 : Number(clean);
        setMontoAPagar(nuevoMonto);
        setFaltaMonto(nuevoMonto === 0);
    };

    const formaPago = watch("formaPago");
    const numeroDocumento = watch("numeroDocumento");

    const pagoInvalido = () => {
        // Validaciones adicionales
        const montoValido = montoAPagar > 0;
        const montoCubierto = Array.from(pagosSeleccionados).reduce((acc, venta) => acc + (venta.pago ?? venta.saldo), 0) === montoAPagar;

        console.log("PAGO INVALIDO >>", !(
            montoValido &&
            formaPago != "" &&
            (numeroDocumento?.trim() ?? "") != "" &&
            montoCubierto
        ))

        // Retorna true si alguna validación falla
        return !(
            montoValido &&
            formaPago != "" &&
            (numeroDocumento?.trim() ?? "") != "" &&
            montoCubierto
        );
    }

    const handlePagar = () => {
        setPagarModal(true);

        // Distribuir montoAPagar entre las ventas seleccionadas
        let montoRestante = montoAPagar;
        const nuevasVentas = Array.from(pagosSeleccionados).map((venta) => {
            const maxPago = Math.min(venta.total, montoRestante);
            montoRestante -= maxPago;
            return { ...venta, pago: maxPago };
        });

        setPagosSeleccionados(new Set(nuevasVentas));
        nuevasVentas.forEach((venta, idx) => {
            setValue(`pagos.${idx}.monto`, venta.pago);
        });
    };

    const reset = () => {
        setMontoAPagar(0);
        setFaltaMonto(true);
        setPagosSeleccionados(prev => {
            return new Set(Array.from(prev).map(v => ({ ...v, pago: 0 })));
        });
        resetField("formaPago");
        resetField("numeroDocumento");
    };

    const handleEnviarPago = async() => {
        setGuardando(true);
        const ventas = Array.from(pagosSeleccionados).map(v => ({
            _id: v.ventaId,
            monto: v.pago ?? v.saldo
        }));

        const body = {
            ventas,
            formaPagoId: formaPago,
            numeroDocumento: numeroDocumento.trim(),
            fecha: new Date().toISOString(),
            adjuntoUrls: [] // puedes agregar URLs si tienes archivos
        };

        try {
            const res = await fetch("/api/cobros/pagar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Pago registrado correctamente");
                setPagarModal(false);
                reset();
            } else {
                toast.error(data.error || "Error al registrar pago");
            }
        } catch {
            toast.error("Error de red al registrar pago");
        } finally {
            setGuardando(false);
            for(var i=0; i<pagosSeleccionados.size; i++) {
                setValue(`ventas.${i}.selected`, false);
            }
            setPagosSeleccionados(new Set());            
            await fetchVentas();
        }
    }

    return (
        <main className="w-full mt-3">
            <div className="w-full h-[calc(100vh-16px)] overflow-hidden">
                <div className="ml-24">
                    <button
                        type="button"
                        className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                        onClick={() => router.back()}
                    >
                        <IoChevronBack size="1.25rem" />Volver
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

                    <div className="w-[220px] mr-4 border rounded-lg px-2 relative "
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
                                    {(cilindros ?? []).map((cil, idx) => (
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
                        {loadingCilindros && <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-76">
                            <Loader texto="Cargando..."/>
                        </div>}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 w-[220px] mr-4 border rounded-lg px-2">
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
                            <span className="text-xs font-bold text-gray-400">Crédito{editandoCreditoDisponible && ' autorizado'}</span>
                            <div className="relative grid grid-cols-2 gap-x-4 mb-1">
                                <div className="absolute -top-6 -right-2">
                                    {editandoCreditoDisponible
                                        ? <div className="flex">
                                            <LiaTimesSolid size={22} className="text-gray-400 hover:text-blue-500 cursor-pointer" onClick={() => setEditandoCreditoDisponible(false)} />
                                            <FaRegSave size={22} className="text-gray-400 hover:text-blue-500 cursor-pointer" onClick={() => guardarCambios()} />
                                        </div>
                                        : <LiaPencilAltSolid size={22} className="text-gray-400 hover:text-blue-500 cursor-pointer" onClick={() => setEditandoCreditoDisponible(true)} />}
                                </div>
                                {!editandoCreditoDisponible && <div className="flex flex-col items-start text-xs space-y-3 mt-1">
                                    <span className="font-semibold">Autorizado</span>
                                    <span className="font-semibold text-orange-700">Utilizado</span>
                                    <span className="font-semibold text-green-600">Disponible</span>
                                </div>}

                                {editandoCreditoDisponible ? <span className="font-semibold text-green-600 flex items-center col-span-2">
                                    <span className="text-gray-500 mr-1">$</span>
                                    <input
                                        type="text"
                                        {...register("creditoAutorizado")}
                                        className="border rounded px-2 py-1 w-24 text-right transition border-green-400 bg-green-50 text-green-700"
                                        placeholder="Precio"
                                        value={creditoAutorizado === "" ? "" : Number(creditoAutorizado).toLocaleString("es-CL")}
                                        onChange={e => {
                                            // Remove all dots (thousand separators) before parsing
                                            const clean = e.target.value.replace(/\./g, "").replace(/\D/g, "");
                                            console.log("clean:", clean);
                                            const num = clean ? parseInt(clean, 10) : 0;
                                            console.log("num:", num);
                                            setCreditoAutorizado(num);
                                        }}
                                    />
                                </span>
                                    : <div className="flex flex-col items-end space-y-1">
                                        <span className="font-semibold">
                                            {credito.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                        </span>
                                        <span className="font-semibold text-orange-700">
                                            {utilizado.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {disponible.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
                                        </span>
                                    </div>}

                                {updatingCredito && <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-76">
                                    <Loader texto="Actualizando..."/>
                                </div>}
                            </div>
                        </div>
                    </div>

                    <div className="flex-col items-ce</div>nter justify-center gap-2 border pt-4 px-6 rounded-lg w-[512px] h-[284px]">
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
                    <div className="flex mt-2">
                        <span className={`border border-b-0 border-gray-200 rounded-tr-xl text-md px-4 py-1 z-20 ${tabSelected == 0 ? 'bg-gray-100 font-bold' : 'bg-white text-gray-400 cursor-pointer hover:font-bold hover:text-gray-600'}`}
                            onClick={() => {
                                if(tabSelected == 0) return;
                                fetchVentas();
                                setTabSelected(0);                                
                            }}>POR COBRAR</span>
                        <span className={`border border-b-0 border-gray-200 rounded-tr-xl text-md px-4 py-1 z-10 -ml-2 ${tabSelected == 1 ? 'bg-gray-100 font-bold' : 'bg-white text-gray-400 cursor-pointer hover:font-bold hover:text-gray-600'}`}
                            onClick={() => {
                                if(tabSelected == 1) return;
                                fetchPagos();
                                setTabSelected(1);
                            }}>PAGOS</span>
                        <button className={`flex h-10 rounded-md px-3 text-white -mt-3 ml-12 justify-center items-center ${pagosSeleccionados.size ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                            onClick={handlePagar}
                            disabled={!pagosSeleccionados.size}
                        >
                            <TbMoneybag className="mr-2" size={22} />{pagosSeleccionados.size ? `Pagar ${Array.from(pagosSeleccionados).reduce((acc, curr) => acc + curr.total, 0).toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `Seleccione ventas`}
                        </button>
                    </div>
                    {tabSelected == 0 &&<div className="overflow-x-auto">
                        <div className="min-w-full text-md border">
                            <div className="flex bg-gray-100 pr-4 font-bold">
                                <div className="w-2/12 p-2 border">Sel / Fecha</div>
                                <div className="w-1/5 p-2 border">Total</div>
                                <div className="w-1/5 p-2 border">Saldo</div>
                                <div className="w-2/12 p-2 border">Vendedor</div>
                                <div className="w-2/12 p-2 border">Documento</div>
                                <div className="w-3/12 p-2 border">Detalle</div>
                            </div>
                            <div className="w-full overflow-y-scroll h-80">                                
                                <div className="relative">                                    
                                    {ventas.map((v, idx) => (
                                        <div key={idx} className="w-full border-b flex">
                                            <div className="w-2/12 p-2 border">
                                                <input type="checkbox"
                                                    {...register(`ventas.${idx}.selected`)}
                                                    className="mr-2 w-5 h-5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPagosSeleccionados(prev => {
                                                            const newSelected = new Set(prev);
                                                            if (e.target.checked) {
                                                                newSelected.add(v);
                                                            } else {
                                                                newSelected.delete(v);
                                                            }
                                                            return newSelected;
                                                        });
                                                    }}
                                                    defaultChecked={getValues(`ventas.${idx}.selected`)}
                                                /> {new Date(v.fecha).toLocaleDateString("es-CL")}
                                            </div>
                                            <div className="w-1/5 p-2 border">{v.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</div>
                                            <div className="w-1/5 p-2 border">{v.saldo.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</div>
                                            <div className="w-2/12 p-2 border">{v.vendedor}</div>
                                            <div className="w-2/12 p-2 border">{v.documento}</div>
                                            <div className="w-3/12 p-2 border">
                                                <ul className="list-disc pl-4 relative">
                                                    {(() => {
                                                        const detalles = v.detalles;
                                                        const expandido = detalleExpandido === `${idx}`;
                                                        const mostrarDetalles = expandido ? detalles : detalles.slice(0, 1);
                                                        const detallesCount = detalles.length;

                                                        return (
                                                            <div
                                                                className="relative"
                                                                style={{
                                                                    maxHeight: expandido ? `${detallesCount * 2.2}em` : "2.2em",
                                                                    transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
                                                                    overflow: "hidden"
                                                                }}
                                                            >
                                                                {mostrarDetalles.map((d, i) => {
                                                                    const detalleTexto = `${d.cantidad}x ${d.glosa} | Total: ${d.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}`;
                                                                    return (
                                                                        <li key={i} className="flex items-center">
                                                                            <div className="w-full truncate">{detalleTexto}</div>
                                                                        </li>
                                                                    );
                                                                })}
                                                                {detallesCount > 1 && (
                                                                    <button
                                                                        className="absolute top-0 right-0 text-blue-500 ml-1 text-xs z-10 bg-white px-1"
                                                                        type="button"
                                                                        style={{ borderRadius: 4 }}
                                                                        onClick={() => setDetalleExpandido(expandido ? null : `${idx}`)}
                                                                    >
                                                                        {expandido ? <FaChevronUp /> : <FaChevronDown />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                    {ventas.length == 0 && !loadingVentas && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-80">
                                            <span>No hay ventas disponibles</span>
                                        </div>
                                    )}
                                    {loadingVentas && <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-80">
                                        <Loader texto="Cargando..."/>
                                    </div>}
                                </div>
                            </div>
                        </div>
                    </div>}
                    {tabSelected == 1 &&<div className="overflow-x-auto">
                        <div className="min-w-full text-md border">
                            <div className="flex bg-gray-100 pr-4 font-bold">
                                <div className="w-3/12 p-2 border">Tipo de pago</div>
                                <div className="w-3/12 p-2 border">Número documento</div>
                                <div className="w-3/12 p-2 border">Monto</div>
                                <div className="w-3/12 p-2 border">Fecha</div>                                
                            </div>
                            <div className="w-full overflow-y-scroll h-80">                                
                                <div className="relative">                                    
                                    {pagos.map((pago, idx) => (
                                        <div key={idx} className="w-full border-b flex">
                                            <div className="w-3/12 p-2 border">{pago.formaPagoId.nombre}</div>
                                            <div className="w-3/12 p-2 border">{pago.numeroDocumento}</div>
                                            <div className="w-3/12 p-2 border">{pago.monto.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</div>
                                            <div className="w-3/12 p-2 border">{pago.fecha}</div>
                                        </div>
                                    ))}
                                    {loadingPagos && <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-80">
                                        <Loader texto="Cargando..."/>
                                    </div>}
                                    {pagos.length == 0 && !loadingPagos && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white opacity-90 h-80">
                                            <span>No hay pagos disponibles</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>}
                </div>
            </div>
            <ToastContainer />

            {pagarModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                            onClick={() => setPagarModal(false)}
                            aria-label="Cerrar"
                            type="button"
                        >
                            <LiaTimesSolid />
                        </button>
                        <h2 className="text-xl font-bold mb-2 text-center">Efectuar pago</h2>

                        <div className="flex flex-wrap gap-4">
                            <div className="space-y-4">
                                <div className="flex space-x-3">
                                    <div>
                                        <span className="ml-2">Monto a cubrir</span>
                                        <div className="relative mt-1">
                                            <span className="absolute top-2 left-3 text-gray-500 -mr-1">$</span>
                                            <input
                                                type="text"
                                                className={
                                                    `block border rounded px-2 py-2 w-36 text-right transition ` +
                                                    (faltaMonto
                                                        ? "border-red-400 bg-red-50 text-red-700"
                                                        : "border-green-400 bg-green-50 text-green-700")
                                                }
                                                placeholder="Precio"
                                                value={montoAPagar === "" ? "" : Number(montoAPagar).toLocaleString("es-CL")}
                                                onChange={e => handlePrecioChange(e.target.value)}
                                                inputMode="numeric"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-48">
                                        <span className="ml-2">Forma de pago</span>
                                        <select
                                            {...register("formaPago", { required: true, defaultValue: 0 })}
                                            className="w-full rounded border p-2 mt-1">
                                            <option value="">Seleccione</option>
                                            {formasPago.map((fp) => (
                                                <option key={fp._id} value={fp._id}>{fp.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <div className="w-48">
                                        <span className="ml-2">N° documento</span>
                                        <input {...register("numeroDocumento", { required: true, defaultValue: "" })}
                                            type="text"
                                            className="block border rounded px-2 py-2 mt-1"
                                            placeholder="Número"
                                            inputMode="text"
                                        />
                                    </div>
                                    <div className="w-full text-center mt-1">
                                        {(() => {
                                            const totalMontos = Array.from(pagosSeleccionados).reduce((acc, curr) => {
                                                return acc + Number(curr.pago);
                                            }, 0);
                                            console.log("NUEVO TOTAL", totalMontos, montoAPagar);
                                            // Suma el monto a cubrir (input de cada venta)
                                            const porcentaje = montoAPagar > 0 ? Math.round((totalMontos / montoAPagar) * 100) : 0;
                                            return (
                                                <>
                                                    <p className="text-4xl font-bold orbitron">{porcentaje}<small>%</small></p>
                                                    <span className="text-gray-500">Cubierto</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {archivoCargado ? <div className="relative w-64 block">
                                <LiaTimesSolid className="absolute top-9 right-2 cursor-pointer" />
                                <span className="ml-2">Documento / Archivo</span>
                                <Image src="/yga-logo.png" alt="Documento" width={256} height={128} className="mt-1 rounded border p-2" />
                            </div> : <div className="relative w-64 block">
                                <span className="ml-2">Documento / Archivo</span>
                                <div className="w-full h-32 flex flex-col items-center justify-center mt-1">
                                    <FaCloudUploadAlt size={46} className="mb-1" />
                                    <span>Arrastrar / Click</span>
                                </div>
                                <div className="absolute top-6 w-full h-32 rounded-lg border-dashed border-2 border-gray-600 bg-gray-100 flex flex-col items-center justify-center mt-1 opacity-50"
                                    onDragEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#16a34a "; // verde
                                        e.currentTarget.style.backgroundColor = "#e6fffa"; // verde claro                                        
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#9ca3af"; // gris
                                        e.currentTarget.style.backgroundColor = "#f3f4f6"; // gris claro                                        
                                    }}
                                    onDrop={(e) => {
                                        e.currentTarget.style.borderColor = "#16a34a "; // verde
                                        e.currentTarget.style.backgroundColor = "#e6fffa"; // verde claro 
                                        setArchivoCargado(true);
                                    }}>
                                </div>
                                <input type="file" className="hidden" ref={uploadFileRef}></input>
                            </div>}

                        </div>

                        <div className="mt-6">
                            <table className="min-w-full text-md border mb-4">
                                <thead>
                                    <tr className="bg-gray-100 font-bold">
                                        <th className="p-2 border">n°</th>
                                        <th className="p-2 border">Total</th>
                                        <th className="p-2 border">Saldo</th>
                                        <th className="p-2 border">Monto a pagar / Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from(pagosSeleccionados).map((venta, idx) => {
                                        const pago = venta.pago ?? venta.saldo;
                                        const saldoRestante = (venta.total - pago);
                                        return (
                                            <tr key={idx}>
                                                <td className="p-2 border">{idx + 1}.</td>
                                                <td className="p-2 border">{venta.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</td>
                                                <td className="p-2 border">{saldoRestante.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}</td>
                                                <td className="p-2 border">
                                                    $ <input
                                                        type="number"
                                                        {...register(`pagos.${idx}.monto`)}
                                                        min={0}
                                                        max={venta.total}
                                                        className="border rounded px-2 py-1 w-24 text-right"
                                                        onChange={e => {
                                                            const nuevoPago = Number(e.target.value);
                                                            setPagosSeleccionados(prev => {
                                                                // Mantener el orden, actualizando solo el objeto correspondiente
                                                                return new Set(Array.from(prev).map((v, i) =>
                                                                    i === idx ? { ...v, pago: nuevoPago } : v
                                                                ));
                                                            });
                                                        }}
                                                    />
                                                    <span
                                                        className={`text-xs text-white rounded px-1 ml-2 cursor-pointer ${
                                                            Number(venta.pago ?? venta.saldo) < venta.total
                                                                ? "bg-blue-400 hover:bg-blue-300 cursor-pointer"
                                                                : "bg-gray-400 cursor-not-allowed"
                                                        }`}
                                                        onClick={() => {
                                                            if (Number(venta.pago ?? venta.saldo) < venta.total) {
                                                                // Calcular el monto restante a cubrir
                                                                const cubiertos = Array.from(pagosSeleccionados)
                                                                    .reduce((acc, v, i) => i === idx ? acc : acc + (v.pago ?? v.saldo), 0);
                                                                const restante = Math.max(0, montoAPagar - cubiertos);
                                                                const maxPago = Math.min(restante, venta.total);
                                                                setPagosSeleccionados(prev => {
                                                                    return new Set(Array.from(prev).map((v, i) =>
                                                                        i === idx ? { ...v, pago: maxPago } : v
                                                                    ));
                                                                });
                                                                setValue(`pagos.${idx}.monto`, maxPago);
                                                            }
                                                        }}
                                                    >
                                                        Cubrir max
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
                                onClick={() => {                                    
                                    setPagarModal(false);
                                    reset();
                                }}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>
                            <button
                                className={`w-full h-12 rounded font-semibold text-white ${!guardando && !pagoInvalido() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
                                onClick={handleEnviarPago}
                                disabled={pagoInvalido()}
                            >
                                {guardando ? <div className="relative"><Loader texto="Guardando pago" /></div> : "Guardar pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}