"use client";

import { useState } from "react";
import Loader from "@/components/Loader";
import Image from "next/image";
import dayjs from "dayjs";
import { getColorEstanque } from "@/lib/uix";
import { useForm } from "react-hook-form";
import ClientAddressManagerView from "@/components/prefabs/ClientAddressManagerView";
import ClienteSearchView from "@/components/prefabs/ClienteSearchView";
import type { IClienteSeachResult, IItemCatalogoPowerScanView } from "@/components/prefabs/types";
import toast from "react-hot-toast";
import { getNUCode } from "@/lib/nuConverter";
import { BsFillGeoAltFill } from "react-icons/bs";
import { useMutation } from "@tanstack/react-query";
import { useSoundPlayer } from "../context/SoundPlayerContext";

interface ItemFormData {
    estado: number;
    elemento: string;
    stock_actual: number;
    stock_minimo: number;
    garantia_anual: number;
    codigo: string;
    direccion_valida: boolean;
    fecha_mantencion?: string;
    owner_id?: string | null;
    direccion_id?: string | null;
    direccion_esperada: {
        _id: string;
        nombre: string;
    }
}

export function PowerScanOptionsModal({
    item,
    onCloseModal
}: {
    item: IItemCatalogoPowerScanView | null;
    onCloseModal: () => void;
}) {
    const [clienteSeleccionado, setClienteSeleccionado] = useState<IClienteSeachResult | null>(null);
    const [editMode, setEditMode] = useState(false);
    const { register, handleSubmit } = useForm<ItemFormData>({
        defaultValues: { 
            estado: item ? item.estado : 0,
            elemento: item ? item.subcategoria_catalogo_id.categoria_catalogo_id.elemento || '' : '',
            stock_actual: item ? item.stock_actual || 0 : 0,
            stock_minimo: item ? item.stock_minimo || 0 : 0,
            garantia_anual: item ? item.garantia_anual || 0 : 0,
            codigo: item ? item.codigo || '' : '',
            owner_id: item && item.owner_id ? String(item.owner_id.id) : null,
            direccion_id: item && item.direccion_id ? String(item.direccion_id.id) : null,
            fecha_mantencion: item && item.fecha_mantencion ? dayjs(item.fecha_mantencion).format('YYYY-MM-DD') : undefined,
            direccion_valida: !(item ? item.direccion_invalida || false : false)
        }
    });
    const { play } = useSoundPlayer();

    const mutationActualizarItem = useMutation({
        mutationFn: async (data: ItemFormData) => {
            console.log("DATA FORM", data);
            if (!item?.id) {
                throw new Error('ID del item no disponible');
            }

            if(data.direccion_valida) {
                data.direccion_id = item.direccion_esperada?.id || undefined;
            }
            
            const response = await fetch(`/api/cilindros/gestionar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemId: String(item.id),
                    ...data
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error HTTP: ${response.status}`);
            }
            
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success(data.message || `Cilindro ${item?.codigo} actualizado correctamente`);
                play('/sounds/accept_01.mp3');
            } else {                                
                toast.error(data.error || 'Error al actualizar el cilindro');
                play('/sounds/error_01.mp3');                
            }
        },
        onError: (error: any) => {
            console.error('Error en mutación:', error);
            toast.error(error.message || 'Error al actualizar el cilindro');
            play('/sounds/error_02.mp3');            
        },
        onSettled: () => {            
            onCloseModal();
        }
    });

    const guardarCambiosItem = async (formData: ItemFormData) => {
        mutationActualizarItem.mutate(formData);
    };

    return (<div className="absolute flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full items-center justify-center p-2 sm:p-4" style={{ zIndex: 202 }}>
        <div className="relative mx-auto p-5 pt-0 border w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-lg rounded-md bg-white sm:w-11/12 md:w-10/12">
            <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>

                {!item ? (
                    <div className="flex justify-center p-8">
                        <Loader texto="Cargando datos..." />
                    </div>
                ) : (
                    <div className="mt-0">
                        <div className="flex items-center justify-center gap-6">
                            {/* Imagen del cilindro a la izquierda */}
                            {!editMode && item.subcategoria_catalogo_id.categoria_catalogo_id.elemento && (
                                <div className="flex-shrink-0">
                                    <Image
                                        width={20}
                                        height={64}
                                        src={`/ui/tanque_biox${getColorEstanque(item.subcategoria_catalogo_id.categoria_catalogo_id.elemento)}.png`}
                                        style={{ width: "32px", height: "auto" }}
                                        alt="tanque_biox"
                                    />
                                </div>
                            )}

                            {/* Información a la derecha */}
                            <div className="text-left flex-1 mt-4">
                                {/* NUCode y Estado en la parte superior */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {item.subcategoria_catalogo_id.categoria_catalogo_id.elemento && (
                                        <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">
                                            {getNUCode(item.subcategoria_catalogo_id.categoria_catalogo_id.elemento)}
                                        </div>
                                    )}
                                    {item.subcategoria_catalogo_id.categoria_catalogo_id.es_industrial && (
                                        <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 font-bold">INDUSTRIAL</span>
                                    )}
                                    {item.subcategoria_catalogo_id.sin_sifon && (
                                        <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">sin SIFÓN</div>
                                    )}

                                    {/* Estado del cilindro */}
                                    {editMode ? (
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Estado</label>
                                            <select
                                                {...register('estado')}
                                                className="border border-gray-300 rounded px-2 py-1 text-xs"
                                            >
                                                <option value={0}>No aplica</option>
                                                <option value={1}>En mantenimiento</option>
                                                <option value={2}>En arriendo</option>
                                                <option value={4}>En garantía</option>
                                                <option value={8}>Vacío</option>
                                                <option value={9}>En llenado</option>
                                                <option value={16}>Lleno</option>
                                            </select></div>
                                    ) : (
                                        <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded uppercase">
                                            {item.estado === 0 ? 'DISPONIBLE' :
                                                item.estado === 1 ? 'EN USO' :
                                                    item.estado === 2 ? 'MANTENIMIENTO' : 'FUERA DE SERVICIO'}
                                        </span>
                                    )}
                                </div>

                                {/* Nombre del gas */}
                                <div className="flex mb-3 space-x-4">
                                    <p className="flex text-4xl font-bold">
                                        {item.subcategoria_catalogo_id.categoria_catalogo_id.elemento ? (() => {
                                            const elemento = item.subcategoria_catalogo_id.categoria_catalogo_id.elemento;
                                            const match = elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                            let p1 = '';
                                            let p2 = '';
                                            if (match) {
                                                p1 = match[1] || '';
                                                p2 = match[2] || '';
                                            } else {
                                                p1 = elemento;
                                            }
                                            return (
                                                <>
                                                    {p1 ? p1.toUpperCase() : ''}
                                                    {p2 ? <small>{p2}</small> : ''}
                                                </>
                                            );
                                        })() : item.subcategoria_catalogo_id.categoria_catalogo_id.nombre || 'N/A'}
                                    </p>
                                    <p className="text-4xl font-bold orbitron">
                                        {item.subcategoria_catalogo_id.cantidad || 'N/A'}
                                        <small className="text-2xl ml-1">{item.subcategoria_catalogo_id.unidad || ''}</small>
                                    </p>
                                </div>

                                {/* Código */}
                                <div className="mb-4">
                                    {editMode ? (
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Código</label>
                                            <input
                                                type="text"
                                                {...register('codigo')}
                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                placeholder="Código del cilindro"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600">
                                            <small>Código:</small> <b className="text-lg">{item.codigo || 'N/A'}</b>
                                        </p>
                                    )}
                                    {item.fecha_mantencion && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            <small>Vence:</small> <b>{dayjs(item.fecha_mantencion).format("DD/MM/YYYY")}</b>
                                        </p>
                                    )}

                                    {!editMode && item.direccion_invalida && <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                        <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">Indica que se ubica en</span>
                                        <p className="flex text-red-600 -mt-6">
                                            <BsFillGeoAltFill size="1.5rem" /><span className="text-xs ml-1">{item.direccion_id?.nombre}</span>
                                        </p>
                                    </div>}

                                    {editMode &&  (
                                        <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                            <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">{!item.direccion_invalida ? 'Se ubica en' : 'Cambiar a'}</span>
                                            <div className="-mt-6">
                                                {!item.direccion_invalida && <p className="text-xs font-bold">{item.direccion_id?.nombre}</p>}
                                                {item.direccion_invalida && <div className="flex">
                                                    <div className="flex text-xs text-gray-700">
                                                        <input
                                                            {...register('direccion_valida')}
                                                            type="checkbox"
                                                            id="ubicacion-dependencia"
                                                            className="mr-2 h-8 w-8"
                                                        />
                                                        <div className="flex items-center">
                                                            <BsFillGeoAltFill size="1.5rem" /><p className="text-xs ml-2">{item.direccion_esperada?.nombre}</p>
                                                        </div>
                                                    </div>
                                                </div>}
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Sección adicional en modo edición */}
                                {editMode && (
                                    <div className="mt-4 space-y-3">
                                        {/* Nombre */}
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Elemento</label>
                                            <input
                                                type="text"
                                                {...register('elemento')}
                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                            />
                                        </div>

                                        {/* Stock actual y mínimo */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Stock actual</label>
                                                <input
                                                    type="number"
                                                    {...register('stock_actual')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Stock mínimo</label>
                                                <input
                                                    type="number"
                                                    {...register('stock_minimo')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Garantía anual */}
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Garantía (años)</label>
                                            <input
                                                type="number"
                                                {...register('garantia_anual')}
                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                            />
                                        </div>

                                        {/* Fecha de mantención */}
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Fecha mantención</label>
                                            <input
                                                type="date"
                                                {...register('fecha_mantencion')}
                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                            />
                                        </div>                                        

                                        <ClienteSearchView register={register("owner_id")} setClienteSelected={setClienteSeleccionado} />
                                        {clienteSeleccionado && clienteSeleccionado.direcciones_despacho
                                            && <ClientAddressManagerView label="Dirección de despacho"
                                                register={register("direccion_id")}
                                                direcciones={clienteSeleccionado.direcciones_despacho} />}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="mt-4 mx-2 sm:mx-4 space-y-2">
                    {editMode ? (
                        <form onSubmit={handleSubmit(guardarCambiosItem)}>
                            <button
                                type="submit"
                                disabled={mutationActualizarItem.isPending}
                                className={`relative px-4 py-2 ${mutationActualizarItem.isPending ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-700'} text-white text-base font-medium rounded-md w-full shadow-sm focus:outline-none focus:ring-2`}
                            >
                                Actualizar
                                {mutationActualizarItem.isPending && <div className="absolute top-0 left-0 w-full h-10">
                                    <div className="mt-1"><Loader texto="" /></div>
                                </div>}                            
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={onCloseModal}
                            className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2"
                        >
                            Aceptar
                        </button>
                    )}

                    {!editMode && (
                        <button
                            onClick={() => setEditMode(true)}
                            className="mt-2 px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Corregir
                        </button>
                    )}

                    <button
                        onClick={onCloseModal}
                        className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </div>);
}