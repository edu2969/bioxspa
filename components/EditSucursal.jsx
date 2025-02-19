"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { IoIosArrowBack, IoIosInformationCircle } from 'react-icons/io';
import { MdAddBusiness } from 'react-icons/md';
import { FaCheck, FaRegSave, FaTimes } from 'react-icons/fa';
import { LuPencil } from 'react-icons/lu';
import Autocomplete from "react-google-autocomplete";
import { SiHomeassistantcommunitystore } from 'react-icons/si';

export default function EditSucursal({ googleMapsApiKey }) {
    const params = useSearchParams();
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm();
    const [sucursal, setSucursal] = useState(null);
    const [bodegas, setBodegas] = useState([]);
    const [newBodega, setNewBodega] = useState(null);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const autocompleteRef = useRef(null);

    const onSubmit = async (data) => {
        try {
            const body = { ...data, ...sucursal, bodegas };
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

    const onSubmitBodega = async (data) => {
        console.log("onSubmitBodega", data);
        const values = getValues();
        data.nombre = values.newBodegaNombre;
        data.operativa = values.newBodegaOperativa;
        data.direccion = newBodega.direccion;
        const updatedBodegas = bodegas.map((bodega) => 
            bodega.direccion.apiId === data.direccion.apiId ? data : bodega
        );
        setBodegas(updatedBodegas);
        setNewBodega(null);
        setAutocompleteResults([]);
    };

    const fetchSucursal = async () => {
        const response = await fetch(`/api/sucursales/${params.get("id") ?? ''}`);
        const data = await response.json();
        const sucursal = data.sucursal;
        setSucursal(sucursal);
        setBodegas(data.bodegas);
        setValue("nombre", sucursal.nombre);
        setValue("visible", sucursal.visible);
        setValue("prioridad", sucursal.prioridad);
        setValue("direccion", sucursal.direccion?.nombre);
    };

    useEffect(() => {
        if (params.get("id")) {
            fetchSucursal();
        }
    }, [params, setValue]);

    const handlePlaceChanged = (autocomplete) => {        
        const place = autocomplete;
        if (!place || !place.geometry) {
            return;
        }
        setNewBodega({
            ...newBodega,
            direccion: {
                nombre: place.formatted_address,
                latitud: place.geometry.location.lat(),
                longitud: place.geometry.location.lng(),
                apiId: place.place_id
            }
        });
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
        setNewBodega({ ...newBodega, direccion: address });
        setAutocompleteResults([]);
    };

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
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
                            BODEGAS
                        </h2>
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={() => {
                                setBodegas([...bodegas, { nombre: '', operativa: false, direccion: {} }]);
                                setNewBodega({ nombre: '', operativa: false, direccion: {} });
                                setValue("newBodegaNombre", '');
                                setValue("newBodegaOperativa", false);
                            }}
                        >
                            <MdAddBusiness className="mr-2" />
                            AGREGAR
                        </button>
                    </div>
                    {!newBodega && bodegas.length == 0 && (
                        <div className="flex w-full items-center justify-between mt-2">
                            <div className="flex items-center text-sm text-gray-500">
                                <IoIosInformationCircle className="mr-2 text-lg" />
                                NO HAY BODEGAS AÚN
                            </div>
                        </div>
                    )}
                    {(bodegas.length > 0 || newBodega) && (
                        <table className="min-w-full mt-4 divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre y Operativa</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bodegas.map((bodega, index) => (
                                    <tr key={`bodega_${index}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {newBodega && newBodega.direccion?.apiId === bodega.direccion?.apiId ? (
                                                <div className="flex items-center">
                                                    <input
                                                        type="text"
                                                        defaultValue={bodega.nombre}
                                                        {...register("newBodegaNombre", {
                                                            onBlur: (e) => {
                                                                setNewBodega({ ...newBodega, nombre: e.target.value });
                                                            }
                                                        })}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    />
                                                    <div className="flex items-center ml-4">
                                                        <input
                                                            type="checkbox"
                                                            defaultChecked={bodega.operativa}
                                                            {...register("newBodegaOperativa", {
                                                                onChange: (e) => {
                                                                    setNewBodega({ ...newBodega, operativa: e.target.checked });
                                                                }
                                                            })}
                                                            className="block w-6 h-6"
                                                        />
                                                        <span className="ml-2 text-xs">OPERATIVA</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{bodega.nombre}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {`Operativa: ${bodega.operativa ? "Sí" : "No"}`}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {newBodega && newBodega === bodega ? (
                                                <div className="relative w-full mt-1">
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
                                                        defaultValue={bodega.direccion.nombre}
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
                                            ) : (
                                                <div className="text-sm text-gray-900">{bodega.direccion.nombre}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {newBodega && newBodega.direccion?.apiId === bodega.direccion?.apiId ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="ml-4 text-green-600 text-xl hover:bg-green-100 rounded-md p-2"
                                                        onClick={() => onSubmitBodega(newBodega)}
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="ml-4 text-red-600 text-xl hover:bg-red-100 rounded-md p-2"
                                                        onClick={() => setNewBodega(null)}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="text-blue-600 hover:text-blue-900"
                                                    onClick={() => {
                                                        setNewBodega(bodega);
                                                        setValue("newBodegaNombre", bodega.nombre);
                                                        setValue("newBodegaOperativa", bodega.operativa);
                                                    }}
                                                >
                                                    <LuPencil />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}                                
                            </tbody>
                        </table>
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
                            type="submit" disabled={!!newBodega}><FaRegSave size="1.15rem" className="mt-0.5 mr-3" />GUARDAR</button>
                    </div>
                </div>
            </form>
        </main>
    );
}