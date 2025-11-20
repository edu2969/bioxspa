"use client"

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { TiUserAddOutline } from "react-icons/ti";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { FaRegSave, FaRegTrashAlt } from "react-icons/fa";
import { BiSolidCommentDots, BiTargetLock } from "react-icons/bi";
import MapWithDraggableMarker from "@/components/maps/MapWithDraggableMarker";
import { MdAddLocationAlt } from "react-icons/md";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import toast, { Toaster } from 'react-hot-toast';

// Direcciones de despacho editor
export default function Clientes() {
    const [loadingClients, setLoadingClients] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);
    const [clienteSelected, setClienteSelected] = useState(null);
    const [direccionesDespacho, setDireccionesDespacho] = useState([]);
    const { register, handleSubmit, setValue, reset } = useForm();
    const [direccionEditIdx, setDireccionEditIdx] = useState(null);
    const [direccionEdit, setDireccionEdit] = useState(null);
    const router = useRouter();
    const scrollRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const searchParams = useSearchParams();
    const [loadingCliente, setLoadingCliente] = useState(false);
    const clienteId = searchParams.get("id");

    // Abre el modal y carga los datos de la dirección seleccionada
    const handleAjustarDireccion = (idx) => {
        const dir = direccionesDespacho[idx] || {};
        setDireccionEdit({
            direccionId: {
                nombre: dir.direccionId.nombre || "",
                latitud: dir.direccionId.latitud ?? -33.45,
                longitud: dir.direccionId.longitud ?? -70.65,
            },
            comentario: dir.comentario || null            
        });
        setDireccionEditIdx(idx);
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }
        }, 200);
    };

    useEffect(() => {
        if(clienteId) {
            setLoadingCliente(true);
            fetch(`/api/clientes?id=${clienteId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.ok) {
                        setClienteSelected(data.cliente);
                        setDireccionesDespacho(data.cliente.direccionesDespacho || []);
                        Object.entries(data.cliente).forEach(([key, value]) => {
                            if(key == "mesesAumento") {
                                setValue("mesesAumento", Array.isArray(value) ? value.join(",") : "");
                            } else {
                                setValue(key, value ?? "");
                            }
                        });
                    } else {
                        toast.error("Error al cargar cliente");
                    }
                })
                .catch(() => {
                    toast.error("Error al cargar cliente");
                })
                .finally(() => {
                    setLoadingCliente(false);
                });
        }
    }, [clienteId, setValue]);

    // Actualiza la posición del marcador en el modal
    const handleMapMarkerChange = ({ lat, lng }) => {
        setDireccionEdit((prev) => ({ ...prev, lat, lng }));
    };

    // Guarda los cambios en la dirección
    const handleGuardarDireccion = () => {
        setDireccionesDespacho((prev) => {
            const updated = [...prev];
            updated[direccionEditIdx] = {
                ...updated[direccionEditIdx],
                direccionId: {
                    nombre: direccionEdit.nombre,
                    latitud: direccionEdit.latitud,
                    longitud: direccionEdit.longitud,
                },
                comentario: updated[direccionEditIdx].comentario || null
            };
            return updated;
        });
        setDireccionEditIdx(null);
    };


    useEffect(() => {
        if (clienteSelected) {
            // Cargar datos del cliente en el formulario
            Object.entries(clienteSelected).forEach(([key, value]) => {
                setValue(key, value ?? "");
            });
        } else {
            reset();
        }
    }, [clienteSelected, setValue, reset]);

    const handleDireccionChange = (index, field, value) => {
        setDireccionesDespacho(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddDireccion = () => {
        setDireccionesDespacho(prev => [...prev, { nombre: "" }]);
    };

    const handleRemoveDireccion = (index) => {
        setDireccionesDespacho(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data) => {
        setSaving(true);
        const payload = { ...data, direccionesDespacho };
        console.log("Datos a enviar:", payload);
        // Aquí puedes realizar la llamada a la API para guardar el cliente
        try {
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.ok) {
                toast.success("Cliente guardado correctamente");
            } else {
                toast.error("Error al guardar el cliente");
            }
            router.back();
        } catch (error) {
            console.error("Error al guardar el cliente:", error);
        } finally {
            setSaving(false);
        }
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
                                        {...register('cliente')}
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
                                                        setLoadingCliente(true);
                                                        const clienteResp = await fetch(`/api/clientes?id=${cliente._id}`);
                                                        const clienteData = await clienteResp.json();
                                                        if (clienteResp.ok && clienteData.ok) {
                                                            console.log("DATA CLIENTE", clienteData.cliente);
                                                            setClienteSelected(clienteData.cliente);
                                                            setDireccionesDespacho(clienteData.cliente.direccionesDespacho || []);
                                                            setAutocompleteClienteResults([]);
                                                            setValue("cliente", cliente.nombre);
                                                            setLoadingCliente(false);
                                                        } else {
                                                            toast.error("Error al cargar cliente");
                                                        }
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
                                    onClick={() => { setClienteSelected({
                                        direccionesDespacho: [],
                                    }) }}
                                >
                                    <TiUserAddOutline className="mr-1" size="1.25rem" /> Nuevo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {clienteSelected !== null && (<div className="w-full h-[calc(100vh-9.6rem)] overflow-y-auto px-4 pb-4"
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
                                <input type="number" {...register("dias_de_pago")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Crédito</label>
                                <input type="number" {...register("credito", { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo Precio</label>
                                <select {...register("tipoPrecio", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                    <option value={1}>Mayorista</option>
                                    <option value={2}>Minorista</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cilindros Min</label>
                                <input {...register("cilindrosMin")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cilindros Max</label>
                                <input type="number" {...register("cilindrosMax")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
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
                                        {...register(name)}
                                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        defaultChecked={!!clienteSelected[name]}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <hr className="my-4" />
                        <div>
                            <div className="w-full flex">
                            <label className="w-full block text-xl font-bold text-gray-700 mt-6 mb-4">Direcciones de despacho</label>
                            <button
                                type="button"
                                className="flex mt-2 px-3 py-2 mb-4 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                                onClick={handleAddDireccion}
                            >
                                <MdAddLocationAlt size="1.25em" className="mr-2 mt-1" /> Agregar dirección
                            </button>
                            </div>
                            
                            {clienteSelected.direccionesDespacho.map((dir, idx) => {
                                return <div key={`direccion_despacho_${idx}`} className="flex items-center gap-2 mb-2">
                                    <input type="text"
                                        value={dir.direccionId?.nombre || ""}
                                        onChange={e => handleDireccionChange(idx, "nombre", e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        placeholder="Nombre dirección"
                                    />
                                    <button type="button"
                                        className={`flex text-black-500 hover:text-black-700 ${dir.comentario == null ? 'opacity-20' : ''}`}
                                    >
                                        <BiSolidCommentDots size="2.25em" className="mx-auto"/>
                                    </button>
                                    <button type="button"
                                        className="flex text-red-500 hover:text-red-700 border-red-500 border-2 rounded px-2 py-1"
                                        onClick={() => handleRemoveDireccion(idx)}
                                    >
                                        <FaRegTrashAlt size="1.25em" className="mx-auto"/> Quitar
                                    </button>
                                    <button type="button"
                                        className="flex text-blue-500 hover:text-blue-700 border-blue-500 border-2 rounded px-2 py-1"
                                        onClick={() => handleAjustarDireccion(idx)}
                                    >
                                        <BiTargetLock size="1.25em" /> Ajustar
                                    </button>
                                </div>
                            })}


                            <div className={`w-full flex transition-all ease-linear ${direccionEditIdx !== null ? 'h-96' : 'h-0'} overflow-hidden`}>
                                <div className="w-2/3 h-80">
                                    <MapWithDraggableMarker
                                        lat={direccionEdit?.direccionId?.latitud ?? 0}
                                        lng={direccionEdit?.direccionId?.longitud ?? 0}
                                        onMarkerChange={handleMapMarkerChange}
                                    />
                                </div>
                                <div className="w-1/3 pl-4">
                                    <div className="gap-4">                                        
                                        <div className="flex gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs text-gray-500">Latitud</label>
                                                <input
                                                    type="number"
                                                    value={direccionEdit?.direccionId?.latitud ?? ""}
                                                    readOnly
                                                    className="block w-32 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500">Longitud</label>
                                                <input
                                                    type="number"
                                                    value={direccionEdit?.direccionId?.longitud ?? ""}
                                                    readOnly
                                                    className="block w-32 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                                />
                                            </div>
                                        </div> 
                                        <div className="mt-4">
                                            <label className="block text-xs text-gray-500 mb-1">Comentario</label>
                                            <textarea
                                                value={direccionEdit?.comentario || ""}
                                                onChange={e => setDireccionEdit(prev => ({ ...prev, comentario: e.target.value }))}
                                                className="block w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs resize-none"
                                                rows={3}
                                                placeholder="Comentario sobre la dirección"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                                onClick={() => {
                                                    setDireccionEditIdx(null);
                                                }}
                                            >
                                                CANCELAR
                                            </button>
                                            <button
                                                type="button"
                                                className="flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                                onClick={handleGuardarDireccion}
                                            >
                                                <BiTargetLock className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                                            </button>
                                        </div>                                       
                                    </div>
                                </div>
                            </div>

                            
                        </div>

                        <div className="fixed w-full max-w-5xl bg-white pb-4 bottom-0">
                            <div className={`w-full flex justify-end gap-2 ${direccionEditIdx !== null ? 'opacity-20' : ''}`}>
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                    onClick={() => setClienteSelected(null)}
                                >CANCELAR</button>
                                <button
                                    type="submit"
                                    className="flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                >
                                    <FaRegSave className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                                    {saving && <Loader texto=""/>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>)}
            </form>
            <Toaster />
        </div>
    );
}