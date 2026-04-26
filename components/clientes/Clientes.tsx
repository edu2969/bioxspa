"use client"

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { TiUserAddOutline } from "react-icons/ti";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { FaRegSave } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import toast, { Toaster } from 'react-hot-toast';
import ClientAddressManagerView from "../_prefabs/ClientAddressManagerView";
import { IClienteSeachResult } from "../_prefabs/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ICliente } from "@/types/cliente";

interface IClienteForm {
    id: string;
    nombre: string;
    rut: string;
    direccionId: string;
    giro: string;
    telefono: string;
    email: string;
    emailIntercambio: string;
    envioFactura: boolean;
    envioReporte: boolean;
    seguimiento: boolean;
    ordenCompra: boolean;
    reporteDeuda: boolean;
    arriendo: boolean;
    diasDePago?: number;
    notificacion: boolean;
    credito: number;
    urlWeb?: string;
    comentario?: string;
    contacto?: string;
    cilindrosMin: number;
    cilindrosMax: number;
    enQuiebra: boolean;
    mesesAumento: string;
    documentoTributarioId: string;
    activo: boolean;
}

// Direcciones de despacho editor
export default function Clientes() {
    const [loadingClients, setLoadingClients] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState<IClienteSeachResult[]>([]);
    const [direccionesDespacho, setDireccionesDespacho] = useState([]);
    const { register, handleSubmit, setValue, reset } = useForm<IClienteForm>({
        defaultValues: {
            nombre: '',
            rut: '',
            direccionId: '',
            giro: '',
            telefono: '',
            email: '',
            emailIntercambio: '',
            envioFactura: false,
            envioReporte: false,
            seguimiento: false,
            ordenCompra: false,
            reporteDeuda: false,
            arriendo: false,
            notificacion: false,
            credito: 0,
            urlWeb: '',
            comentario: '',
            contacto: '',
            cilindrosMin: 0,
            cilindrosMax: 9999,
            enQuiebra: false,
            mesesAumento: [],
            documentoTributarioId: '',
        }
    });
    const router = useRouter();
    const scrollRef = useRef(null);
    const searchParams = useSearchParams();
    const [clienteId, setClienteId] = useState<string | null>(null);

    const { data: cliente, isLoading: isLoadingCliente } = useQuery<ICliente>({
        queryKey: ["cliente-by-id", clienteId],
        queryFn: async () => {
            const response = await fetch(`/api/clientes?id=${clienteId}`);
            const data = await response.json();
            console.log("Cliente", data);
            return data.cliente;
        },
        enabled: !!clienteId
    });

    useEffect(() => {
        const paramId = searchParams.get("id");
        setClienteId(paramId);        
    }, [searchParams]);

    useEffect(() => {
        if(!isLoadingCliente && cliente) {            
            console.log("Reseteando...", cliente);
            reset({
                id: cliente.id,
                nombre: cliente.nombre,
                rut: cliente.rut,
                direccionId: cliente.direccionId || '',
                giro: cliente.giro,
                telefono: cliente.telefono,
                email: cliente.email,
                emailIntercambio: cliente.emailIntercambio || '',
                envioFactura: cliente.envioFactura,
                envioReporte: cliente.envioReporte,
                seguimiento: cliente.seguimiento,
                ordenCompra: cliente.ordenCompra,
                reporteDeuda: cliente.reporteDeuda,
                arriendo: cliente.arriendo,
                notificacion: cliente.notificacion,
                credito: cliente.credito,
                urlWeb: cliente.urlWeb,
                comentario: cliente.comentario,
                contacto: cliente.contacto,
                cilindrosMin: cliente.cilindrosMin,
                cilindrosMax: cliente.cilindrosMax,
                enQuiebra: cliente.enQuiebra,
                mesesAumento: cliente.mesesAumento?.join(",") || "",
                documentoTributarioId: cliente.documentoTributarioId || '',
                diasDePago: cliente.diasDePago,
                activo: cliente.activo,
            });
        }
    }, [clienteId, isLoadingCliente, cliente]);

    const guardarClienteMutation = useMutation({
        mutationFn: async (data: IClienteForm) => {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...data })
            });
            return await response.json();
        },
        onSuccess: (data: { ok: boolean, error?: string }) => {
            if(data.ok) {
                toast.success("Guardado correctamente");
                router.back();
            } else {
                toast.error("Error: " + data.error)
            }            
        },
        onError: (error) => {
            toast.error("Error: " + error);
        }
    });

    const onSubmit = async (data: any) => {
        guardarClienteMutation.mutate(data);
    };

    return (
        <div className="max-w-5xl mx-auto p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                                    {loadingClients && <div className="absolute -right-2 top-1.5">
                                        <Loader texto="" />
                                    </div>}
                                    {autocompleteClienteResults.length > 0 && (
                                        <ul className="absolute z-10 border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full">
                                            {autocompleteClienteResults.map(cliente => (
                                                <li
                                                    key={cliente.id}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                    onClick={async () => {
                                                        setAutocompleteClienteResults([]);
                                                        router.push(`/pages/configuraciones/clientes?id=${cliente.id}`);
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
                                    onClick={() => {
                                        reset({                                            
                                            nombre: '',
                                            rut: '',
                                            direccionId: '',
                                            giro: '',
                                            telefono: '',
                                            email: '',
                                            emailIntercambio: '',
                                            activo: false,
                                            envioFactura: false,
                                            envioReporte: false,
                                            seguimiento: false,
                                            ordenCompra: false,
                                            reporteDeuda: false,
                                            arriendo: false,
                                            notificacion: false,
                                            credito: 0,
                                            urlWeb: '',
                                            comentario: '',
                                            contacto: '',
                                            cilindrosMin: 0,
                                            cilindrosMax: 99999,
                                            enQuiebra: false,
                                            mesesAumento: "",
                                            documentoTributarioId: '',
                                            diasDePago: 0
                                        });
                                        setClienteId(null);
                                    }}
                                >
                                    <TiUserAddOutline className="mr-1" size="1.25rem" /> Nuevo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-[calc(100vh-9.6rem)] overflow-y-auto px-4 pb-4"
                ref={scrollRef}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input {...register("nombre", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">RUT</label>
                                <input {...register("rut", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Giro</label>
                                <input {...register("giro")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                <input {...register("telefono")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input {...register("email")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div className="col-span-2">
                                <ClientAddressManagerView 
                                    tipo={'comercial'} 
                                    register={register("direccionId")} 
                                    direccionIdInicialId={cliente?.direccionId} 
                                    label="Dirección comercial"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email XML (intercambio)</label>
                                <input {...register("emailIntercambio")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Comentario</label>
                                <input {...register("comentario")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contacto</label>
                                <input {...register("contacto")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">URL Web</label>
                                <input {...register("urlWeb")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Días de pago</label>
                                <input type="number" {...register("diasDePago", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Crédito</label>
                                <input type="number" {...register("credito", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cilindros Min</label>
                                <input type="number" {...register("cilindrosMin", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cilindros Max</label>
                                <input type="number" {...register("cilindrosMax", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Meses Aumento</label>
                                <input {...register("mesesAumento")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" placeholder="Ej: 1,2,3" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { name: "envioFactura", label: "Envío Factura" },
                                { name: "envioReporte", label: "Envío Reporte" },
                                { name: "seguimiento", label: "Seguimiento" },
                                { name: "ordenCompra", label: "Orden Compra" },
                                { name: "reporteDeuda", label: "Reporte Deuda" },
                                { name: "arriendo", label: "Arriendo" },
                                { name: "notificacion", label: "Notificación" },
                                { name: "activo", label: "Activo" },
                                { name: "enQuiebra", label: "En Quiebra" },
                            ].map(({ name, label }) => (
                                <label key={name} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        {...register(name as keyof IClienteForm)}
                                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"                                        
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <hr className="my-4" />
                        <div>
                            <ClientAddressManagerView                             
                                label={`Direcciones de despacho`}
                                register={register('direccionId')}
                                direcciones={cliente?.direccionesDespacho}
                                tipo={'despacho'} />                            
                        </div>
                                                  

                        <div className="fixed w-full max-w-5xl bg-white pb-4 bottom-0">
                            <div className={`w-full flex justify-end gap-2`}>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                    onClick={() => {
                                        router.back();
                                    }}
                                >CANCELAR</button>
                                <button
                                    type="submit"
                                    className="relative flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                >
                                    <FaRegSave className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                                    {guardarClienteMutation.isPending && <div className="absolute top-0 left-0 pl-2 w-full bg-white/70 py-1">
                                        <Loader texto=""/>
                                    </div>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
            <Toaster />
        </div>
    );
}