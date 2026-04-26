"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import Image from "next/image";
import dayjs from "dayjs";
import { getColorEstanque } from "@/lib/uix";
import { useForm } from "react-hook-form";
import ClientAddressManagerView from "@/components/_prefabs/ClientAddressManagerView";
import ClienteSearchView from "@/components/_prefabs/ClienteSearchView";
import toast from "react-hot-toast";
import { getNUCode } from "@/lib/nuConverter";
import { BsFillGeoAltFill } from "react-icons/bs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSoundPlayer } from "../context/SoundPlayerContext";
import { Selector } from "../_prefabs/Selector";
import { ICategoriaCatalogo } from "@/types/categoriaCatalogo";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import { ICliente } from "@/types/cliente";
import { IDireccion } from "@/types/direccion";
import { IPowerScanForm } from "@/components/pedidos/types";
import { IItemCatalogo } from "@/types/itemCatalogo";

export function PowerScanOptionsModal({
    item,
    onCloseModal,
    initialEditMode = false
}: {
    item: IItemCatalogo | null;
    onCloseModal: () => void;
    initialEditMode?: boolean;
}) {
    const [editMode, setEditMode] = useState(initialEditMode);
    const { register, handleSubmit, watch, setValue } = useForm<IPowerScanForm>({        
        defaultValues: {
            estado: item ? item.estado : 0,
            carga: item ? item.carga || 0 : 0,
            subcategoriaId: item?.subcategoria?.id || '',
            categoriaId: item?.subcategoria?.categoria?.id || '',
            stockActual: item ? item.stockActual || 0 : 0,
            stockMinimo: item ? item.stockMinimo || 0 : 0,
            codigo: item ? item.codigo || '' : '',
            propietarioId: item && item.propietarioId ? String(item.propietarioId) : null,
            direccionId: item && item.direccionId ? String(item.direccionId) : null,
            fechaMantencion: item && item.fechaMantencion ? dayjs(item.fechaMantencion).format('YYYY-MM-DD') : undefined            
        }
    });

    const categoriaId = watch('categoriaId');
    const subcategoriaId = watch('subcategoriaId');
    const direccionId = watch('direccionId');
    const propietarioId = watch('propietarioId');    

    const { play } = useSoundPlayer();    

    const { data: cliente, isLoading: loadingCliente } = useQuery<ICliente>({
        queryKey: ['cliente-by-id', propietarioId],
        queryFn: async () => {
            const response = await fetch(`/api/clientes?id=${propietarioId}`);
            const data = await response.json();
            console.log("DATA Cliente --->", cliente)
            return data.cliente;
        },
        enabled: !!propietarioId
    });

    const { data: direccionCliente, isLoading: isLoadingDireccionCliente } = useQuery<IDireccion | null>({
        queryKey: ['direccion-despacho-by-id', item?.direccionId],
        queryFn: async () => {
            const response = await fetch(`/api/direcciones/byId/${direccionId}`);
            const data = await response.json();
            console.log("DATA direccionCliente", data);
            return data.direccion;
        },
        enabled: !!direccionId
    });

    const { data: categoria } = useQuery<ICategoriaCatalogo>({
        queryKey: ['categoria-catalogo', categoriaId],
        queryFn: async () => {
            const reponse = await fetch(`/api/catalogo/categorias/byId/${categoriaId}`);
            const data = await reponse.json();
            return data.categoria;
        },
        enabled: !!categoriaId
    });

    const { data: subcategoria, isLoading: isLoadingSubcategoria } = useQuery<ISubcategoriaCatalogo>({
        queryKey: ['subcategoria-catalogo', subcategoriaId],
        queryFn: async () => {
            const response = await fetch(`/api/catalogo/subcategorias/byId/${subcategoriaId}`);
            const data = await response.json();
            return data.subcategoria;
        },
        enabled: !!subcategoriaId
    })

    const { data: categorias } = useQuery<ICategoriaCatalogo[]>({
        queryKey: ['categorias-catalogo'],
        queryFn: async () => {
            const response = await fetch('/api/catalogo/categorias');
            const data = await response.json();
            return data.categorias;
        },
        initialData: []
    });

    const { data: subcategorias, isLoading: isLoadingSubcategorias } = useQuery<ISubcategoriaCatalogo[]>({
        queryKey: ['subcategorias-catalogo', item?.subcategoria?.categoria?.id || undefined],
        queryFn: async () => {
            const cId = item?.subcategoria?.categoria?.id || undefined;
            const response = await fetch(`/api/catalogo/subcategorias?categoriaId=${cId}`);
            const data = await response.json();
            return data.subcategorias;
        },
        enabled: !!item?.subcategoria?.categoria?.id
    });

    const { data: direccionValida, isLoading: isLoadingDireccionValida } = useQuery<boolean>({
        queryKey: ['direccion-valida', direccionId, item?.id],
        queryFn: async () => {
            const response = await fetch(`/api/direcciones/validar`, {
                method: 'POST',
                body: JSON.stringify({
                    direccionId,
                    itemId: item?.id
                })
            });
            const data = await response.json();
            return data.direccionValida;
        },
        enabled: !!direccionId && !!item?.id
    });

    const { data: direccionEsperada, isLoading: isLoadingDireccionEsperada } = useQuery<IDireccion>({
        queryKey: ['direccion-esperada', direccionId, item?.id],
        queryFn: async () => {
            const response = await fetch(`/api/direcciones/esperada`, {
                method: 'POST',
                body: JSON.stringify({
                    direccionId,
                    itemId: item?.id
                })                
            });
            const data = await response.json();
            return data.direccionEsperada;
        }
    })

    const mutationActualizarItem = useMutation({
        mutationFn: async (data: IPowerScanForm) => {
            if (!item) {
                throw new Error('Item no inicializado');
            }

            if (direccionValida) {
                data.direccionId = direccionEsperada?.id || undefined;
            }

            const payload = {
                itemId: String(item.id),
                nuevo: !!!item.id,
                ...data
            };

            console.log("Payload: ", payload);

            const response = await fetch(`/api/cilindros/gestionar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
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

    const onSubmit = async (formData: IPowerScanForm) => {
        console.log("DATA FORM", formData);
        mutationActualizarItem.mutate(formData);
    };

    useEffect(() => {
        if(!isLoadingSubcategoria && subcategoria) {
            setValue('subcategoriaId', subcategoria.id || '');
            setValue('categoriaId', subcategoria?.categoriaCatalogoId || '');
        }
    }, [subcategoria, categorias, subcategorias]);

    useEffect(() => {
        console.log("cliente", cliente, "direccionCliente", direccionCliente);
        if(!loadingCliente && cliente) {
            setValue('propietarioId', cliente.id);
            setValue('direccionId', item?.direccionId);
        }
    }, [item, cliente, direccionCliente]);
    
    return (<div className="absolute flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto w-full items-center justify-center p-2 sm:p-4 h-screen" style={{ zIndex: 402 }}>
        <div className="relative mx-auto p-5 pt-0 border w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-lg rounded-md bg-white sm:w-11/12 md:w-10/12">
            <div className="mt-3 text-center">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>

                    {!item ? (
                        <div className="flex justify-center p-8">
                            <Loader texto="Cargando datos..." />
                        </div>
                    ) : (
                        <div className="mt-0">
                            <div className="flex items-center justify-center gap-6">
                                {/* Imagen del cilindro a la izquierda */}
                                {!editMode && item.subcategoria.id && (
                                    <div className="flex-shrink-0">
                                        <Image
                                            width={20}
                                            height={64}
                                            src={`/ui/tanque_biox${getColorEstanque(categoria)}.png`}
                                            style={{ width: "32px", height: "auto" }}
                                            alt="tanque_biox"
                                        />
                                    </div>
                                )}

                                {/* Información a la derecha */}
                                {subcategoria && <div className="text-left flex-1 mt-4">
                                    {/* NUCode y Estado en la parte superior */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {categoria?.elemento && (
                                            <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">
                                                {getNUCode(categoria.elemento)}
                                            </div>
                                        )}
                                        {categoria?.esIndustrial && (
                                            <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 font-bold">INDUSTRIAL</span>
                                        )}
                                        {subcategoria.sinSifon && (
                                            <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">sin SIFÓN</div>
                                        )}

                                        {/* Estado del cilindro */}
                                        {editMode ? (
                                            <div className="flex gap-2">
                                                <div className="w-3/5">
                                                    <label className="block text-xs text-gray-600 mb-1">Estado</label>
                                                    <select
                                                        {...register('estado', { valueAsNumber: true })}
                                                        className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    >
                                                        <option value={0}>No aplica</option>
                                                        <option value={1}>En mantenimiento</option>
                                                        <option value={2}>En arriendo</option>
                                                        <option value={4}>En garantía</option>
                                                        <option value={8}>Vacío</option>
                                                        <option value={9}>En llenado</option>
                                                        <option value={16}>Lleno</option>
                                                    </select>
                                                </div>
                                                <div className="w-2/5">
                                                    <label className="block text-xs text-gray-600 mb-1">Carga</label>
                                                    <input type="number"
                                                        {...register('carga', { valueAsNumber: true })}
                                                        className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded uppercase">
                                                {item.estado === 0 ? 'DISPONIBLE' :
                                                    item.estado === 1 ? 'EN USO' :
                                                        item.estado === 2 ? 'MANTENIMIENTO' : 'FUERA DE SERVICIO'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Nombre del gas */}
                                    {!editMode && <div className="flex mb-3 space-x-4">
                                        <p className="flex text-4xl font-bold">
                                            {categoria?.elemento ? (() => {
                                                const elemento = categoria?.elemento;
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
                                            })() : categoria?.elemento || 'N/A'}
                                        </p>
                                        <p className="text-4xl font-bold orbitron">
                                            {subcategoria?.cantidad || 'N/A'}
                                            <small className="text-2xl ml-1">{subcategoria?.unidad || ''}</small>
                                        </p>
                                    </div>}

                                    {/* Código */}
                                    <div className="md:grid md:grid-cols-2 gap-2 mb-4">
                                        {editMode ? (
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Código</label>
                                                <input
                                                    type="text"
                                                    {...register('codigo')}
                                                    className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
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

                                        {!editMode && !direccionValida && <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                            <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">Indica que se ubica en</span>
                                            <p className="flex text-red-600 -mt-6">
                                                <BsFillGeoAltFill size="1.5rem" /><span className="text-xs ml-1">{direccionCliente?.direccionCliente}</span>
                                            </p>
                                        </div>}

                                        {editMode && item.direccionId && (
                                            <div className="relative bg-white rounded-md p-4 border border-gray-300 mt-2">
                                                <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">{direccionValida ? 'Se ubica en' : 'Cambiar a'}</span>
                                                <div className="-mt-6">
                                                    {direccionValida && <p className="text-xs font-bold">{direccionCliente?.direccionCliente}</p>}
                                                    {!direccionValida && <div className="flex">
                                                        <div className="flex text-xs text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                id="ubicacion-dependencia"
                                                                className="mr-2 h-8 w-8"
                                                            />
                                                            <div className="flex items-center">
                                                                <BsFillGeoAltFill size="1.5rem" /><p className="text-xs ml-2">{direccionEsperada?.direccionCliente}</p>
                                                            </div>
                                                        </div>
                                                    </div>}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Sección adicional en modo edición */}
                                    {editMode && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Categoría */}
                                            <Selector
                                                label="Categoría"
                                                getLabel={(c: { label: string | undefined }) => c.label || ''}
                                                getValue={(c: { id: string }) => c.id}
                                                options={categorias && categorias.map((cat: ICategoriaCatalogo) => ({ label: cat.nombre, id: cat.id }))}
                                                register={register('categoriaId')}
                                                defaultValue={subcategoria.categoriaCatalogoId ?? ''}
                                            />
                                            {/* Sub-Categoría */}
                                            <Selector
                                                label="Sub-Categoría"
                                                getLabel={(c: { label: string }) => c.label}
                                                getValue={(c: { id: string | undefined }) => c.id ?? ''}
                                                options={subcategorias ? 
                                                    subcategorias.map((subcat: ISubcategoriaCatalogo) => ({ 
                                                        label: `${subcat.cantidad} ${subcat.unidad}`, 
                                                        id: subcat.id 
                                                    })) : []}
                                                register={register('subcategoriaId')}
                                                isLoading={isLoadingSubcategorias}
                                                defaultValue={subcategoria.id ?? ''}
                                            />

                                            <div className="grid grid-cols-3 md:grid-cols-2 gap-2 col-span-3">
                                                {/* Stock actual y mínimo */}
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Stock actual</label>
                                                    <input
                                                        type="number"
                                                        {...register('stockActual')}
                                                        className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Stock mínimo</label>
                                                    <input
                                                        type="number"
                                                        {...register('stockMinimo')}
                                                        className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    />
                                                </div>

                                                {/* Fecha de mantención */}
                                                <div className="col-span-3">
                                                    <label className="block text-sm text-gray-600 mb-1">Fecha mantención</label>
                                                    <input
                                                        type="date"
                                                        {...register('fechaMantencion')}
                                                        className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <ClienteSearchView register={register("propietarioId")} clienteInicial={{
                                                        id: cliente?.id || '',
                                                        nombre: cliente?.nombre || ''
                                                    }}/>
                                                </div>
                                                <div className="col-span-3">
                                                    {cliente && !loadingCliente &&
                                                        <ClientAddressManagerView label="Dirección de despacho"
                                                            register={register("direccionId")}
                                                            direccionIdInicialId={item?.direccionId}
                                                            direcciones={cliente.direccionesDespacho || []} />}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>}
                            </div>
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="mt-4 mx-2 sm:mx-4 space-y-2">
                        {editMode ? (
                            <button
                                type="submit"
                                disabled={mutationActualizarItem.isPending}
                                className={`relative px-4 py-2 ${mutationActualizarItem.isPending ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-700'} text-white text-base font-medium rounded-md w-full shadow-sm focus:outline-none focus:ring-2`}
                            >
                                {item?.id ? 'Actualizar' : 'Crear'}
                                {mutationActualizarItem.isPending && <div className="absolute top-0 left-0 w-full h-10">
                                    <div className="mt-1"><Loader texto="" /></div>
                                </div>}
                            </button>
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
                </form>
            </div>
        </div>
    </div>);
}