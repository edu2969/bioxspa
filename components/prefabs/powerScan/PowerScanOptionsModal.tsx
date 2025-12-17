"use client";

import { useState } from "react";
import Loader from "../../Loader";
import Image from "next/image";
import dayjs from "dayjs";
import { getColorEstanque } from "@/lib/uix";
import { useForm } from "react-hook-form";
import ClientAddressManagerView from "../ClientAddressManagerView";
import { IClienteSeachResult, IItemCatalogoPowerScanView } from "../types";
import toast from "react-hot-toast";
import ClienteSearchView from "../ClienteSearchView";

export function PowerScanOptionsModal({
    visible,
    item,
    onCloseModal
} : {
    visible: boolean;
    item: IItemCatalogoPowerScanView | null;
    onCloseModal: () => void;
}) {
    const [clienteSeleccionado, setClienteSeleccionado] = useState<IClienteSeachResult | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [savingItem, setSavingItem] = useState(false);    
    const { register, handleSubmit } = useForm<IItemCatalogoPowerScanView>({
        defaultValues: { ...item }
    });

    const guardarCambiosItem = async (formData: IItemCatalogoPowerScanView) => {        
        try {
            setSavingItem(true);
            
            // Preparar datos para envío
            const dataToSend = {
                ...formData,
                fechaMantencion: formData.fechaMantencion ? new Date(formData.fechaMantencion) : null,
                ownerId: clienteSeleccionado?._id || null,
                direccionId: formData.direccionId || null
            };

            const response = await fetch(`/api/cilindros/gestionar/${formData.codigo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            const data = await response.json();

            if (data.ok) {
                toast.success('Cilindro actualizado correctamente');
                setEditMode(false);
            } else {
                toast.error(data.error || 'Error al actualizar el cilindro');
            }
        } catch (error) {
            console.error('Error al guardar cilindro:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setSavingItem(false);
        }
    };

    return visible && (
        <div className="fixed flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 items-center justify-center p-2 sm:p-4">
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
                                {!editMode && item.elemento && (
                                    <div className="flex-shrink-0">
                                        <Image
                                            width={20}
                                            height={64}
                                            src={`/ui/tanque_biox${getColorEstanque(item.elemento)}.png`}
                                            style={{ width: "32px", height: "auto" }}
                                            alt="tanque_biox"
                                        />
                                    </div>
                                )}

                                {/* Información a la derecha */}
                                <div className="text-left flex-1 mt-4">
                                    {/* NUCode y Estado en la parte superior */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {item.elemento && (
                                            <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">
                                                {item.elemento}
                                            </div>
                                        )}
                                        {item.esIndustrial && (
                                            <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 font-bold">INDUSTRIAL</span>
                                        )}
                                        {item.sinSifon && (
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
                                                    <option value={0}>Disponible</option>
                                                    <option value={1}>En uso</option>
                                                    <option value={2}>Mantenimiento</option>
                                                    <option value={3}>Fuera de servicio</option>
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
                                    <div className="mb-3">
                                        <p className="text-4xl font-bold">
                                            {item.elemento ? (() => {
                                                const elemento = item.elemento;
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
                                            })() : item.nombre || 'N/A'}
                                        </p>
                                    </div>

                                    {/* Cantidad y unidad */}
                                    <div className="mb-3">
                                        <p className="text-4xl font-bold orbitron">
                                            {item.cantidad || 'N/A'}
                                            <small className="text-2xl ml-1">{item.unidad || ''}</small>
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
                                        {item.fechaMantencion && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                <small>Vence:</small> <b>{dayjs(item.fechaMantencion).format("DD/MM/YYYY")}</b>
                                            </p>
                                        )}
                                    </div>

                                    {/* Sección adicional en modo edición */}
                                    {editMode && (
                                        <div className="mt-4 space-y-3">
                                            {/* Nombre */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                                                <input
                                                    type="text"
                                                    {...register('nombre')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* Descripción corta */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Descripción corta</label>
                                                <input
                                                    type="text"
                                                    {...register('descripcionCorta')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* Stock actual y mínimo */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Stock actual</label>
                                                    <input
                                                        type="number"
                                                        {...register('stockActual')}
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Stock mínimo</label>
                                                    <input
                                                        type="number"
                                                        {...register('stockMinimo')}
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                    />
                                                </div>
                                            </div>

                                            {/* Garantía anual */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Garantía (años)</label>
                                                <input
                                                    type="number"
                                                    {...register('garantiaAnual')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* Fecha de mantención */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Fecha mantención</label>
                                                <input
                                                    type="date"
                                                    {...register('fechaMantencion')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* URL Imagen */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">URL Imagen</label>
                                                <input
                                                    type="url"
                                                    {...register('urlImagen')}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* Descripción */}
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Descripción</label>
                                                <textarea
                                                    {...register('descripcion')}
                                                    rows={3}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                />
                                            </div>

                                            {/* Checkboxes */}
                                            <div className="flex space-x-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        {...register('destacado')}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-xs text-gray-700">Destacado</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        {...register('visible')}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-xs text-gray-700">Visible</span>
                                                </label>
                                            </div>                                            
                                            <ClienteSearchView register={register("ownerId")} setClienteSelected={setClienteSeleccionado}/>
                                            {clienteSeleccionado && clienteSeleccionado.direccionesDespacho
                                                && <ClientAddressManagerView label="Dirección de despacho"
                                                    register={register("direccionId")}
                                                    direcciones={clienteSeleccionado.direccionesDespacho} />}
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
                                    disabled={savingItem}
                                    className="relative px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2"
                                >
                                    ACTUALIZAR
                                    {savingItem && (
                                        <div className="absolute top-0 left-0 w-full h-10">
                                            <div className="absolute top-0 left-0 w-full h-full bg-gray-100 opacity-80"></div>
                                            <div className="mt-1"><Loader texto="" /></div>
                                        </div>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={onCloseModal}
                                className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2"
                            >
                                ACEPTAR
                            </button>
                        )}

                        {!editMode && (
                            <button
                                onClick={() => setEditMode(true)}
                                className="mt-2 px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                CORREGIR
                            </button>
                        )}

                        <button
                            onClick={onCloseModal}
                            className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}