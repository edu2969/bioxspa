"use client";

import { useState } from "react";
import { MdAddBusiness } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";

export default function DependenciasList({

}: {

}) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    return <div className="my-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-700 flex items-center">
                                <SiHomeassistantcommunitystore className="text-2xl mr-2" />
                                DEPENDENCIAS
                            </h2>
                            <button
                                type="button"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => {
                                    const newDependencia = { id: Date.now(), nombre: '', operativa: false, direccion: {} };
                                    setEditingIndex(dependencias.length);                                    
                                }}
                            >
                                <MdAddBusiness className="mr-2" />
                                AGREGAR
                            </button>
                        </div>
                        {(dependencias.length > 0 || editingIndex !== null) && (
                            <div className="min-w-full mt-4 divide-y divide-gray-200">
                                <div className="divide-y divide-gray-200">
                                    {dependencias.map((dependencia, index) => (
                                        <div className="flex" key={`dependencia_${index}`}>
                                            <div className="px-6 py-4 whitespace-nowrap w-4/12">
                                                {editingIndex === index ? (
                                                    <div className="w-full">
                                                        <div className="flex">
                                                            <div className="w-1/2">
                                                                <label htmlFor={`newdependenciaNombre_${index}`} className="block text-sm font-medium text-gray-700">Nombre Corto</label>
                                                                <input
                                                                    id={`newdependenciaNombre_${index}`}
                                                                    type="text"
                                                                    defaultValue={dependencia.nombre}
                                                                    {...register(`dependencias.${index}.nombre`, {
                                                                        onBlur: (e) => {
                                                                            const updatedDependencias = [...dependencias];
                                                                            updatedDependencias[editingIndex] = { ...updatedDependencias[editingIndex], nombre: e.target.value };
                                                                            setDependencias(updatedDependencias);
                                                                        }
                                                                    })}
                                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                />
                                                            </div>
                                                            <div className="relative ml-4 w-full">
                                                                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                                                <Autocomplete
                                                                    onPlaceSelected={(place) => {
                                                                        console.log(place);
                                                                    }}
                                                                    options={{
                                                                        types: ['address'],
                                                                        componentRestrictions: { country: 'cl' }
                                                                    }}
                                                                    ref={autocompleteRef}                                                                    
                                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-4">
                                                            <div className="relative w-1/2 mt-1">
                                                                <label htmlFor={`newdependenciaNombre_${index}`} className="block text-sm font-medium text-gray-700">Empresa</label>
                                                                <input id={`newdependenciaCliente_${index}`}
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
                                                                            setAutocompleteUserResults([]);
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
                                                                                    setDependencias(updatedDependencias);
                                                                                    setAutocompleteClienteResults([]);
                                                                                }}
                                                                            >
                                                                                {cliente.nombre}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 w-1/2">
                                                                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
                                                                <select
                                                                    defaultValue={dependencia.tipo}
                                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                >
                                                                    {Object.entries(TIPO_DEPENDENCIA).map(([key, value]) => (
                                                                        <option key={value} value={value}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <div className="flex">
                                                                <div className="mr-6">
                                                                    <div className="text-xs text-gray-900">{
                                                                            (Object.keys(TIPO_DEPENDENCIA) as Array<keyof typeof TIPO_DEPENDENCIA>)
                                                                                .find(key => TIPO_DEPENDENCIA[key] === dependencia.tipo)
                                                                                ?.replace(/_/g, ' ')
                                                                                .toUpperCase()
                                                                        }</div>
                                                                    <div className="text-lg font-medium text-gray-900">{dependencia.nombre}</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-gray-900">{dependencia.direccion?.direccionCliente || ''}</p>
                                                            <div className="text-sm text-gray-500">
                                                                {dependencia.cliente?.nombre}
                                                            </div>
                                                            <div className="text-xs">
                                                                {dependencia.cliente?.rut}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-6 py-4 w-7/12">
                                                <div className="flex bg-blue-50 shadow-md p-4 rounded-md">
                                                    <div className="w-full">
                                                        {dependencia.cargos?.length > 0 ? <div className="flex flex-wrap gap-4">
                                                            {dependencia.cargos?.map((cargo, idx) => (
                                                                <div key={`avatar_${index}_${idx}`}
                                                                    className={`w-32 h-32 rounded-md flex justify-center items-center shadow-md p-2 hover:scale-105 duration-200 ${editingCargoDependenciaIndex != null && editingCargoDependenciaIndex !== idx ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                    onClick={() => {
                                                                        
                                                                    }}>
                                                                    <div className="w-full flex flex-col justify-center items-center m-auto h-24 rounded-full">
                                                                        <div className="relative w-full text-center flex flex-col items-center">
                                                                            <Image
                                                                                src={getUsuarioAvatarFromUsuarioId(cargo.usuario.id)}
                                                                                alt="avatar"
                                                                                className="w-20 h-20 rounded-full"
                                                                                width={56} height={56}
                                                                            />
                                                                            {cargo.tipo === TIPO_CARGO.gerente && <FaCrown className="text-yellow-500 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.cobranza && <RiMoneyDollarCircleFill className="text-gray-400 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.neo && <TbMoneybag className="text-gray-400 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.encargado && <FaStar className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.responsable && <TbBadges className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.conductor && <GoCopilot className="text-sky-600 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.proveedor && <FaHandsHelping className="text-orange-5000 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            {cargo.tipo === TIPO_CARGO.despacho && <TbTruckLoading className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                                            <span className="absolute bottom-6 left-2 text-sm text-white cursor-pointer bg-red-500 rounded-full hover:text-red-400 hover:bg-white" onClick={() => {
                                                                                const updatedCargos = dependencia.cargos.filter((_, i) => i !== idx);
                                                                                const updatedDependencias = [...dependencias];
                                                                                updatedDependencias[index].cargos = updatedCargos;
                                                                                setDependencias(updatedDependencias);
                                                                            }}>
                                                                                <MdDeleteForever className="border border-gray-400 rounded-full" size="1.5rem" />
                                                                            </span>
                                                                            <span className="mt-2 font-bold text-xs text-center overflow-ellipsis">{cargo.usuario.nombre.split(" ").slice(0, 2).join(" ")}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div> : <div className="flex items-center text-sm text-gray-500">
                                                            <IoIosInformationCircle className="mr-2 text-lg" />
                                                            NO HAY CARGOS DESIGNADOS AÚN
                                                        </div>}
                                                    </div>
                                                    <div className="w-1/12 text-right">
                                                        {editingIndex === index && <button
                                                            type="button"
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            onClick={() => { }}
                                                        >
                                                            <TbMedal2 size="1.5rem" className="mr-2" />
                                                            AGREGAR
                                                        </button>}
                                                    </div>
                                                </div>




                                                {editingCargoDependenciaIndex != null && editingCargoDependenciaParentIndex === index && (
                                                    <div>
                                                        <div className="flex mt-4 space-x-4">
                                                            <div className="w-5/12 relative">
                                                                <label htmlFor="newCargoDependenciaUsuario" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Buscar usuario"
                                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                    onChange={async (e) => {
                                                                        const query = e.target.value;
                                                                        if (query.length > 2) {
                                                                            const response = await fetch(`/api/users/search?q=${query}`);
                                                                            const data = await response.json();
                                                                            setAutocompleteUserResults(data.users);
                                                                        } else {
                                                                            setAutocompleteUserResults([]);
                                                                        }
                                                                    }}
                                                                />
                                                                {autocompleteUserResults.length > 0 && (
                                                                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                                        {autocompleteUserResults.map((usuario, index) => (
                                                                            <li
                                                                                key={index}
                                                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                                                                                onClick={() => {
                                                                                    setAutocompleteUserResults([]);
                                                                                }}
                                                                            >
                                                                                {usuario.nombre}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                            <div className="w-5/12">
                                                                <label htmlFor="newCargoDependenciaTipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                                                <select
                                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                >
                                                                    {Object.entries(TIPO_CARGO).filter(([, value]) => value !== 0).map(([key, value]) => (
                                                                        <option key={value} value={value}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="w-2/12 flex h-10">
                                                                <button
                                                                    type="button"
                                                                    className="ml-4 text-green-600 text-xl hover:bg-green-500 hover:text-white rounded-md p-2"
                                                                    onClick={() => {}}
                                                                >
                                                                    <FaCheck />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="ml-4 text-red-600 text-xl hover:bg-red-100 rounded-md p-2"
                                                                    onClick={() => {
                                                                        setEditingCargoDependenciaIndex(null);
                                                                        setEditingCargoDependenciaParentIndex(null);
                                                                    }}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="flex mt-4 space-x-4">
                                                            <div className="w-4/12">
                                                                <label htmlFor="newCargoDependenciaDesde" className="block text-sm font-medium text-gray-700">Desde</label>
                                                                <input
                                                                    type="date"
                                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                />                                                                
                                                            </div>
                                                            <div className="w-4/12">
                                                                <label htmlFor="newCargoDependenciaHasta" className="block text-sm font-medium text-gray-700">Hasta</label>
                                                                <input
                                                                    type="date"
                                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                                />                                                                
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>





                                            <div className="px-6 py-4 whitespace-nowrap text-sm font-medium w-1/12">
                                                {editingIndex === index ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-green-600 text-xl hover:bg-green-100 rounded-md p-2"
                                                            onClick={() => {}}
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
                                                    <div className="flex space-x-4 justify-end">
                                                        <button
                                                            type="button"
                                                            className="text-xl text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-md p-2"
                                                            onClick={() => {
                                                                setEditingIndex(index);
                                                            }}
                                                        >
                                                            <LuPencil />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-2xl text-red-600 hover:bg-red-100 rounded-md p-2"
                                                            onClick={() => {
                                                                setSelectedIndex(index);
                                                                setShowModal(true);
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
                        {!editingIndex && dependencias.length == 0 && (
                            <div className="flex w-full items-center justify-between mt-2">
                                <div className="flex items-center text-sm text-gray-500">
                                    <IoIosInformationCircle className="mr-2 text-lg" />
                                    NO HAY DEPENDENCIAS AÚN
                                </div>
                            </div>
                        )}
                    </div>
}