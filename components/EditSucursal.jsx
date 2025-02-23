"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { IoIosArrowBack, IoIosArrowForward, IoIosInformationCircle } from 'react-icons/io';
import { MdAddBusiness, MdDeleteForever } from 'react-icons/md';
import { FaCheck, FaRegSave, FaTimes } from 'react-icons/fa';
import { LuPencil } from 'react-icons/lu';
import Autocomplete from "react-google-autocomplete";
import { SiHomeassistantcommunitystore } from 'react-icons/si';
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";
import { ConfirmModal } from './modals/ConfirmModal';
import Loader from '@/components/Loader';
import Link from 'next/link';
import { AiFillHome } from 'react-icons/ai';

export default function EditSucursal({ googleMapsApiKey }) {
    const params = useSearchParams();
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm();
    const [sucursal, setSucursal] = useState(null);
    const [dependencias, setDependencias] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const autocompleteRef = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [loadingForm, setLoadingForm] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);

    const fetchClientes = async () => {
        try {
            const response = await fetch('/api/clientes');
            const data = await response.json();
            if (data.ok) {
                console.log("Clientes fetched successfully:", data.clientes);
            } else {
                console.error("Error fetching clientes:", data.error);
            }
        } catch (error) {
            console.error("Error fetching clientes:", error);
        }
    };

    const handleDelete = () => {
        const updatedDependencias = dependencias.filter((dependencia, index) => index !== selectedIndex);
        setDependencias(updatedDependencias);
        setEditingIndex(null);
        setShowModal(false);
    }

    const onSubmit = async (data) => {
        try {
            const body = { ...data, ...sucursal, dependencias };
            console.log("POST Sucursales->", body, ">>>", JSON.stringify(body));
            await fetch(`/api/sucursales/${params.get("id") ?? ''}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body)
            });
            router.back();
        } catch (error) {
            console.log("ERROR", error);
        }
    };

    const onSubmitDependencia = async (data) => {
        console.log("onSubmitdependencia", data);
        const values = getValues();
        data.nombre = values.newdependenciaNombre;
        data.operativa = values.newdependenciaOperativa;
        data.direccion = dependencias[editingIndex].direccion;
        data.clienteId = dependencias[editingIndex].clienteId;
        data.tipo = values.newdependenciaTipo;
        const updateddependencias = dependencias.map((dependencia, index) =>
            index === editingIndex ? data : dependencia
        );
        setDependencias(updateddependencias);
        setEditingIndex(null);
        setAutocompleteResults([]);
    };

    const fetchSucursal = async () => {
        const response = await fetch(`/api/sucursales/${params.get("id") ?? ''}`);
        const data = await response.json();
        const sucursal = data.sucursal;
        setSucursal(sucursal);
        setDependencias(data.dependencias);
        setValue("nombre", sucursal.nombre);
        setValue("visible", sucursal.visible);
        setValue("prioridad", sucursal.prioridad);
        setValue("direccion", sucursal.direccion?.nombre);
        setValue("newdependenciaCliente", sucursal.cliente?.nombre);
    };

    useEffect(() => {
        if (params.get("id")) {
            Promise.all([fetchClientes(), fetchSucursal()]).then(() => setLoadingForm(true));
        }
    }, [params, setValue]);

    const handlePlaceChanged = (autocomplete) => {
        const place = autocomplete;
        if (!place || !place.geometry) {
            return;
        }
        const updatedDependencias = [...dependencias];
        updatedDependencias[editingIndex] = {
            ...updatedDependencias[editingIndex],
            direccion: {
                nombre: place.formatted_address,
                latitud: place.geometry.location.lat(),
                longitud: place.geometry.location.lng(),
                apiId: place.place_id
            }
        };
        setDependencias(updatedDependencias);
        setAutocompleteResults([]);
    };

    const handleSelectPlace = (place) => {
        console.log("SELECTED PLACE?", place);
        const address = {
            nombre: place.formatted_address,
            apiId: place.place_id,
            latitud: place.geometry.location.lat(),
            longitud: place.geometry.location.lng(),
            categoria: place.types[0]
        };
        const updatedDependencias = [...dependencias];
        updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], direccion: address };
        setDependencias(updatedDependencias);
        setAutocompleteResults([]);
    };

    return (
        <main className="w-full h-screen">
            <div className="py-10 w-full h-screen overflow-y-scroll">
                <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 pt-4 mx-10 bg-white dark:bg-gray-900">
                    <div className="flex items-center space-x-4 text-ship-cove-800">
                        <Link href="/modulos">
                            <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                        </Link>
                        <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => router.back() }>SUCURSAL</span>
                        <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">EDICIÓN</span>
                    </div>
                </div>
                {loadingForm ? <form onSubmit={handleSubmit(onSubmit)} className="px-4">
                    <div className="flex my-6 space-x-4">
                        <div className="flex">
                            <div className="mr-4">
                                <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700">Prioridad</label>
                                <input id="prioridad" type="number" {...register("prioridad")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="visible" className="block text-sm font-medium text-gray-700">Visible</label>
                                <input id="visible" type="checkbox" {...register("visible")} className="block w-6 h-6 m-2 mt-3" />
                            </div>
                        </div>
                        <div className="w-4/12">
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input id="nombre" type="text" {...register("nombre", { required: "El nombre es requerido" })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" />
                            {errors.nombre && <p className="text-red-500 text-xs mt-1">{String(errors.nombre.message)}</p>}
                        </div>
                        <div className="w-6/12">
                            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
                            <Autocomplete
                                apiKey={googleMapsApiKey}
                                onPlaceSelected={(place) => {
                                    setValue("direccion", place.formatted_address);
                                    setSucursal({
                                        ...sucursal, direccion: {
                                            nombre: place.formatted_address,
                                            latitud: place.geometry.location.lat(),
                                            longitud: place.geometry.location.lng(),
                                            apiId: place.place_id
                                        }
                                    });
                                }}
                                options={{
                                    types: ['address'],
                                    componentRestrictions: { country: 'cl' }
                                }}
                                defaultValue={sucursal?.direccion?.nombre || ""}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                            />
                            {errors.direccion && <p className="text-red-500 text-xs mt-1">{String(errors.direccion.message)}</p>}
                        </div>
                    </div>
                    <div className="my-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-700 flex items-center">
                                <SiHomeassistantcommunitystore className="mr-2" />
                                DEPENDENCIAS
                            </h2>
                            <button
                                type="button"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => {
                                    const newDependencia = { id: Date.now(), nombre: '', operativa: false, direccion: {} };
                                    setDependencias([...dependencias, newDependencia]);
                                    setEditingIndex(dependencias.length);
                                    setValue("newdependenciaNombre", '');
                                    setValue("newdependenciaOperativa", false);
                                    setValue("newdependenciaTipo", 1);
                                }}
                            >
                                <MdAddBusiness className="mr-2" />
                                AGREGAR
                            </button>
                        </div>
                        {!editingIndex && dependencias.length == 0 && (
                            <div className="flex w-full items-center justify-between mt-2">
                                <div className="flex items-center text-sm text-gray-500">
                                    <IoIosInformationCircle className="mr-2 text-lg" />
                                    NO HAY DEPENDENCIAS AÚN
                                </div>
                            </div>
                        )}
                        {(dependencias.length > 0 || editingIndex !== null) && (
                            <div className="min-w-full mt-4 divide-y divide-gray-200">                                
                                <div className="bg-white divide-y divide-gray-200">
                                    {dependencias.map((dependencia, index) => (
                                        <div className="flex" key={`dependencia_${index}`}>
                                            <div className="px-6 py-4 whitespace-nowrap">
                                                {editingIndex === index ? (
                                                    <div>
                                                        <div className="flex">
                                                            <div className="block">
                                                                <label htmlFor={`newdependenciaNombre_${index}`} className="block text-sm font-medium text-gray-700">Nombre Corto</label>
                                                                <input
                                                                    id={`newdependenciaNombre_${index}`}
                                                                    type="text"
                                                                    defaultValue={dependencia.nombre}
                                                                    {...register("newdependenciaNombre", {
                                                                        onBlur: (e) => {
                                                                            const updatedDependencias = [...dependencias];
                                                                            updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], nombre: e.target.value };
                                                                            setDependencias(updatedDependencias);
                                                                        }
                                                                    })}
                                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                />
                                                            </div>
                                                            <div className="ml-4">
                                                                <label htmlFor={`newdependenciaOperativa_${index}`} className="block text-sm font-medium text-gray-700">Operativa</label>
                                                                <input
                                                                    id={`newdependenciaOperativa_${index}`}
                                                                    type="checkbox"
                                                                    defaultChecked={dependencia.operativa}
                                                                    {...register("newdependenciaOperativa", {
                                                                        onChange: (e) => {
                                                                            const updatedDependencias = [...dependencias];
                                                                            updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], operativa: e.target.checked };
                                                                            setDependencias(updatedDependencias);
                                                                        }
                                                                    })}
                                                                    className="block w-6 h-6 mt-2"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="relative w-full mt-1">
                                                            <label htmlFor={`newdependenciaNombre_${index}`} className="block text-sm font-medium text-gray-700">Empresa</label>
                                                            <input id={`newdependenciaCliente_${index}`}
                                                                {...register(`newdependenciaCliente_${index}`)}
                                                                type="text"
                                                                placeholder="Buscar cliente"
                                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm pr-10"
                                                                onChange={async (e) => {
                                                                    const query = e.target.value;
                                                                    if (query.length > 2) {
                                                                        const response = await fetch(`/api/clientes/search?q=${query}`);
                                                                        const data = await response.json();
                                                                        setAutocompleteClienteResults(data.clientes);
                                                                    } else {
                                                                        setAutocompleteResults([]);
                                                                    }
                                                                }}
                                                            />
                                                            <div className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center pointer-events-none">
                                                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                    <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            {autocompleteClienteResults.length > 0 && (
                                                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                                    {autocompleteClienteResults.map((cliente, index) => (
                                                                        <li
                                                                            key={index}
                                                                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                                                                            onClick={() => {
                                                                                const updatedDependencias = [...dependencias];
                                                                                updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], clienteId: cliente._id, cliente };
                                                                                console.log(">>>>", { ...updatedDependencias[editingIndex], clienteId: cliente._id, cliente });
                                                                                setDependencias(updatedDependencias);
                                                                                setAutocompleteClienteResults([]);
                                                                                setValue(`newdependenciaCliente_${editingIndex}`, cliente.nombre);
                                                                            }}
                                                                        >
                                                                            {cliente.nombre}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex">                                                                                                                        
                                                            <div className="mr-6">
                                                                <div className="text-xs text-gray-900">{Object.keys(TIPO_DEPENDENCIA).find(key => TIPO_DEPENDENCIA[key] === dependencia.tipo)?.replace(/_/g, ' ').toUpperCase()}</div>
                                                                <div className="text-lg font-medium text-gray-900">{dependencia.nombre}</div>                                                                
                                                            </div>
                                                            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${dependencia.operativa ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} h-6`}>
                                                                {dependencia.operativa ? (
                                                                    <>
                                                                        Operativa <FaCheck className="inline ml-1" />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        INOPERATIVA <FaTimes className="inline ml-1" />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-900">{dependencia.direccion.nombre}</p>
                                                        <div className="text-sm text-gray-500">
                                                            {dependencia.cliente?.nombre}
                                                        </div>
                                                        <div className="text-xs">
                                                            {dependencia.cliente?.rut}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-6 py-4 whitespace-nowrap">
                                                {editingIndex === index ? (
                                                    <>
                                                        <div className="relative w-full mt-1">
                                                            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
                                                            <Autocomplete
                                                                apiKey={googleMapsApiKey}
                                                                onPlaceSelected={(place) => {
                                                                    handlePlaceChanged(place);
                                                                }}
                                                                options={{
                                                                    types: ['address'],
                                                                    componentRestrictions: { country: 'cl' }
                                                                }}
                                                                ref={autocompleteRef}
                                                                defaultValue={dependencia.direccion.nombre}
                                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                            />

                                                            {autocompleteResults.length > 0 && (
                                                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                                    {autocompleteResults.map((result, index) => (
                                                                        <li
                                                                            key={index}
                                                                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                                            onClick={() => handleSelectPlace(result)}
                                                                        >
                                                                            {result.formatted_address}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
                                                        <select
                                                            {...register("newdependenciaTipo", {
                                                                onChange: (e) => {
                                                                    const updatedDependencias = [...dependencias];
                                                                    updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], tipo: parseInt(e.target.value) };
                                                                    setDependencias(updatedDependencias);
                                                                }
                                                            })}
                                                            defaultValue={dependencia.tipo}
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                        >
                                                            {Object.entries(TIPO_DEPENDENCIA).map(([key, value]) => (
                                                                <option key={value} value={value}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                                                            ))}
                                                        </select>

                                                    </>
                                                ) : (
                                                    <div className="text-sm text-gray-900">CARGOS</div>
                                                )}
                                            </div>
                                            <div className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {editingIndex === index ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-green-600 text-xl hover:bg-green-100 rounded-md p-2"
                                                            onClick={() => onSubmitDependencia(dependencias[editingIndex])}
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-red-600 text-xl hover:bg-red-100 rounded-md p-2"
                                                            onClick={() => setEditingIndex(null)}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex space-x-4">
                                                        <button
                                                            type="button"
                                                            className="text-xl text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-md p-2"
                                                            onClick={() => {
                                                                setEditingIndex(index);
                                                                setValue("newdependenciaNombre", dependencia.nombre);
                                                                setValue("newdependenciaOperativa", dependencia.operativa);
                                                                setValue("newdependenciaTipo", dependencia.tipo);
                                                            }}
                                                        >
                                                            <LuPencil />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-xl text-red-600 hover:bg-red-100 rounded-md p-2"
                                                            onClick={() => {
                                                                setSelectedIndex(index);
                                                                setShowModal(true);
                                                                console.log("DELETE", dependencias[index]);
                                                            }}
                                                        >
                                                            <MdDeleteForever />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full flex justify-end">
                        <div className="w-96 flex">
                            <button className="flex w-1/2 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.back()
                                }}><IoIosArrowBack size="1.15rem" className="mt-0.5 mr-3" />VOLVER</button>
                            <button className="flex w-1/2 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1"
                                type="submit" disabled={editingIndex !== null}><FaRegSave size="1.15rem" className="mt-0.5 mr-3" />GUARDAR</button>
                        </div>
                    </div>
                </form> : <Loader />}
            </div>
            <ConfirmModal show={showModal} confirmationLabel={"Eliminar"} title={"Eliminar Dependencia"}
                confirmationQuestion={`¿Estás seguro de eliminar la dependencia ${showModal && dependencias[selectedIndex]?.nombre}?`} onClose={() => setShowModal(false)} onConfirm={handleDelete} />
        </main>
    );
}