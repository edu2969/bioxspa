"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { IoIosArrowBack, IoIosInformationCircle } from 'react-icons/io';
import { MdAddBusiness, MdDeleteForever } from 'react-icons/md';
import { FaCheck, FaCrown, FaHandsHelping, FaRegSave, FaStar, FaTimes } from 'react-icons/fa';
import { LuPencil } from 'react-icons/lu';
import Autocomplete from "react-google-autocomplete";
import { SiHomeassistantcommunitystore } from 'react-icons/si';
import { TIPO_CARGO, TIPO_DEPENDENCIA } from "@/app/utils/constants";
import { ConfirmModal } from './modals/ConfirmModal';
import Loader from '@/components/Loader';
import { RiMoneyDollarCircleFill } from 'react-icons/ri';
import { TbBadges, TbMedal2, TbMoneybag, TbTruckLoading } from 'react-icons/tb';
import { GoCopilot } from 'react-icons/go';
import Image from 'next/image';
import { IoChevronBack } from 'react-icons/io5';
import { GoogleMapsProvider } from './providers/GoogleMapProvider';
import { useUsuarios } from '@/hooks/useUsuarios';
import { ISucursal } from '@/types/sucursal';
import { IDependencia } from '@/types/dependencia';
import { useSucursales } from '@/hooks/useSucursales';
import { IDependenciaForm, ISucursalForm } from './editSucursal/types';
import { IUsuario } from '@/types/usuario';
import { ICliente } from '@/types/cliente';
import SucursalInfo from './editSucursal/SucursalInfo';

export default function EditSucursal() {
    const params = useSearchParams();
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<ISucursalForm>();
    const [sucursal, setSucursal] = useState<ISucursal | null>(null);

    const [dependencias, setDependencias] = useState<IDependenciaForm[]>([]);
    
    const [selectedIndex, setSelectedIndex] =  useState<number | null>(null);

    const autocompleteRef = useRef<HTMLInputElement | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [loadingForm, setLoadingForm] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState<ICliente[]>([]);
    const [autocompleteUserResults, setAutocompleteUserResults] = useState<IUsuario[]>([]);
    const [users, setUsers] = useState([]);
    const [editingCargoSucursalIndex, setEditingCargoSucursalIndex] = useState<number | null>(null);
    const [editingCargoDependenciaIndex, setEditingCargoDependenciaIndex] = useState(null);
    const [editingCargoDependenciaParentIndex, setEditingCargoDependenciaParentIndex] = useState(null);

    const { usuarios, isLoading } = useUsuarios();

    const getUsuarioAvatarFromUsuarioId = (usuarioId: string) => {
        const usuario = usuarios?.find(usuario => usuario.id === usuarioId);
        if (usuario) {
            return `/profiles/${usuario.email.split('@')[0].toLowerCase()}.jpg`;
        }
        return '/profiles/undefined.jpg';
    }

    const { sucursales, isLoading: isLoadingSucursales } = useSucursales();

    const handleDelete = () => {
        const updatedDependencias = dependencias.filter((dependencia, index) => index !== selectedIndex);
        setDependencias(updatedDependencias);
        setEditingIndex(null);
        setShowModal(false);
    }

    const onSubmit = async () => {
        
    };

    const onSubmitDependencia = async () => {
        
    };

    const handlePlaceChanged = (autocomplete: any, editingIndex: number) => {
        const place = autocomplete;
        if (!place || !place.geometry) {
            return;
        }
        console.log("place", place);
    };

    const handleSelectPlace = (place: { formatted_address: string, place_id: string }) => {
        console.log("Place", place);
    };


    return (<GoogleMapsProvider>
        <main className="w-full h-screen pt-3">
            <div className="ml-24">
                    <button
                        type="button"
                        className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                        onClick={() => router.back()}
                    >
                        <IoChevronBack size="1.25rem"/>Volver
                    </button>
                </div>
            <div className="w-full h-[calc(100vh-80px)] overflow-y-scroll">
                
                <h2 className="text-lg font-medium text-gray-700 flex items-center ml-4 mt-4">
                    <IoIosInformationCircle className="text-2xl mr-2" />
                    INFORMACIÓN PRINCIPAL
                </h2>
                {loadingForm ? <form onSubmit={handleSubmit(onSubmit)} className="px-4">
                    <SucursalInfo errors={errors} register={register} />                    
                    
                    <div className="flex my-6 space-x-4">
                        <div className="w-full">
                            <h2 className="text-lg font-medium text-gray-700 flex items-center">
                                <TbMedal2 className="text-2xl mr-2" />
                                CARGOS DE LA SUCURSAL
                            </h2>
                            <div className="flex bg-blue-50 shadow-md p-4 rounded-md mt-4">
                                <div className="w-10/12">
                                    {sucursal && (sucursal?.cargos?.length ?? 0) > 0 ? (
                                        <div className="flex flex-wrap gap-4">
                                            {sucursal?.cargos.map((cargo, idx) => (
                                                <div key={`sucursal_cargo_${idx}`}
                                                    className={`w-32 h-32 rounded-md flex justify-center items-center shadow-md p-2 hover:scale-105 duration-200 ${editingCargoSucursalIndex != null && editingCargoSucursalIndex !== idx ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <div className="w-full flex flex-col justify-center items-center m-auto h-24 rounded-full">
                                                        <div className="relative w-full text-center flex flex-col items-center">
                                                            <Image
                                                                src={getUsuarioAvatarFromUsuarioId(cargo.usuario.id ?? "")}
                                                                alt="avatar"
                                                                className="w-20 h-20 rounded-full"
                                                                onClick={() => {
                                                                    if (editingCargoSucursalIndex != null && editingCargoSucursalIndex !== idx) return;
                                                                    setEditingCargoSucursalIndex(idx);
                                                                }}
                                                                width={56} height={56}
                                                            />
                                                            {cargo.tipo === TIPO_CARGO.gerente && <FaCrown className="text-yellow-600 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.cobranza && <RiMoneyDollarCircleFill className="text-gray-500 absolute -top-1 left-0 bg-white rounded-full p-0.5 border border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.neo && <TbMoneybag className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.encargado && <FaStar className="text-blue-500 absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.conductor && <GoCopilot className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.proveedor && <FaHandsHelping className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.despacho && <TbTruckLoading className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            {cargo.tipo === TIPO_CARGO.responsable && <TbBadges className="text-black absolute -top-1 left-0 bg-white rounded-full p-0.5 border-gray-400" size="2rem" />}
                                                            <span className="absolute -bottom-1 left-2 text-sm text-white cursor-pointer bg-red-500 rounded-full hover:text-red-400 hover:bg-white" onClick={() => {
                                                                const updatedCargos = sucursal.cargos.filter((_, i) => i !== idx);
                                                                setSucursal({ ...sucursal, cargos: updatedCargos });
                                                            }}>
                                                                <MdDeleteForever className="text-lg border border-gray-400 rounded-full" size="1.5rem" />
                                                            </span>
                                                        </div>
                                                        <span className="mt-2 font-bold text-xs text-center overflow-ellipsis">{cargo.usuario.nombre.split(" ").slice(0, 2).join(" ")}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-sm text-gray-500">
                                            <IoIosInformationCircle className="mr-2 text-lg" />
                                            NO HAY CARGOS DESIGNADOS AÚN
                                        </div>
                                    )}
                                    {editingCargoSucursalIndex != null && <div className="flex mt-4 space-x-4">
                                        <div className="w-3/12 relative">
                                            <label htmlFor="newCargoSucursalUsuario" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
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
                                                                const updatedCargos = sucursal?.cargos?.map((cargo, idx) =>
                                                                    idx === editingCargoSucursalIndex ? {
                                                                        ...cargo,
                                                                        usuario,
                                                                        usuarioId: usuario.id
                                                                    } : cargo
                                                                );
                                                                setAutocompleteUserResults([]);
                                                            }}
                                                        >
                                                            {usuario.nombre}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="w-2/12">
                                            <label htmlFor="newCargoSucursalTipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                            <select
                                                {...register(`cargos.${editingCargoSucursalIndex}.tipo`, { valueAsNumber: true })}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            >
                                                {Object.entries(TIPO_CARGO).filter(([, value]) => value !== 0).map(([key, value]) => (
                                                    <option key={value} value={value}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-3/12">
                                            <label htmlFor="newCargoSucursalDesde" className="block text-sm font-medium text-gray-700">Desde</label>
                                            <input
                                                type="date"
                                                {...register(`cargos.${editingCargoSucursalIndex}.desde`, { required: true })}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            />
                                            {errors.cargos && errors.cargos[editingCargoSucursalIndex]?.desde && <p className="text-red-500 text-xs mt-1">{String(errors.cargos[editingCargoSucursalIndex]?.desde.message)}</p>}
                                        </div>
                                        <div className="w-3/12">
                                            <label htmlFor="newCargoSucursalHasta" className="block text-sm font-medium text-gray-700">Hasta</label>
                                            <input
                                                type="date"
                                                {...register(`cargos.${editingCargoSucursalIndex}.hasta`)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            />
                                            {errors.cargos && errors.cargos[editingCargoSucursalIndex]?.hasta && <p className="text-red-500 text-xs mt-1">{String(errors.cargos[editingCargoSucursalIndex].hasta.message)}</p>}
                                        </div>
                                        <div className="w-1/12 flex h-10">
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
                                                onClick={() => setEditingCargoSucursalIndex(null)}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>}
                                </div>
                                <div className="w-2/12 text-right">
                                    <button
                                        type="button"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        onClick={() => {
                                            setEditingCargoSucursalIndex(sucursal?.cargos?.length || 0);
                                        }}
                                    >
                                        <TbMedal2 size="1.5rem" className="mr-2" />
                                        AGREGAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    
                    <div className="absolute bottom-0 right-0 w-full flex justify-end bg-white p-2">
                        <div className="w-96 flex">
                            <button className="flex w-1/2 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.back()
                                }}><IoIosArrowBack size="1.15rem" className="mt-0.5 mr-3" />VOLVER</button>
                            <button className="flex w-1/2 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1"
                                type="submit"><FaRegSave size="1.15rem" className="mt-0.5 mr-3" />GUARDAR</button>
                        </div>
                    </div>                    
                </form> : <Loader texto="Cargando..." />}
            </div>
            
            <ConfirmModal show={showModal} confirmationLabel={"Eliminar"} title={"Eliminar Dependencia"}
                confirmationQuestion={`¿Estás seguro de eliminar la dependencia ${showModal && dependencias[0]?.nombre}?`} onClose={() => setShowModal(false)} onConfirm={handleDelete} />
        </main>
    </GoogleMapsProvider>);
}