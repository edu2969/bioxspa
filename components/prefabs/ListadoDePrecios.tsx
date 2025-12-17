"use client";

import { useSession } from "next-auth/react";
import Loader from "../Loader";
import { UseFormRegister, UseFormSetValue, UseFormGetValues } from "react-hook-form";
import { INuevaVentaSubmit, IPrecioView } from "../pedidos/types";
import { useQuery } from "@tanstack/react-query";
import { USER_ROLE } from "@/app/utils/constants";
import { ChangeEvent, useState } from "react";
import { LiaTimesSolid } from "react-icons/lia";
import { ICategoriasView } from "@/types/categoriaCatalogo";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import toast from "react-hot-toast";

export default function ListadoDePrecios({
    register,
    setValue,
    getValues,
    clienteId,
    noCredit = true,
}: {
    register: UseFormRegister<INuevaVentaSubmit>;
    setValue: UseFormSetValue<INuevaVentaSubmit>;
    getValues: UseFormGetValues<INuevaVentaSubmit>;
    clienteId?: string;
    noCredit?: boolean;
}) {
    const { data: session } = useSession();
    const [modalSolicitudPrecio, setModalSolicitudPrecio] = useState(false);
    const [categoriaIdSeleccionada, setCategoriaIdSeleccionada] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [precioData, setPrecioData] = useState<IPrecioView | null>(null);

    const { data: precios, isLoading: loadingPrecios } = useQuery<IPrecioView[]>({
        queryKey: ['precios-cliente', clienteId],
        queryFn: async () => {
            if (!clienteId) return [];
            const response = await fetch(`/api/clientes/precios?clienteId=${clienteId}`);
            const data = await response.json();
            return data.precios;
        },
        enabled: clienteId != null,
    });

    const { data: categorias } = useQuery<ICategoriasView[]>({
        queryKey: ['categorias-catalogo'],
        queryFn: async () => {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            return data;
        },
    });

    const { data: subcategorias } = useQuery<ISubcategoriaCatalogo[]>({
        queryKey: ['subcategorias-catalogo'],
        queryFn: async () => {
            if (!categoriaIdSeleccionada) return [];
            const response = await fetch(`/api/catalogo/subcategoria?categoriaId=${categoriaIdSeleccionada}`);
            const data = await response.json();
            return data;
        },
        enabled: !!categoriaIdSeleccionada,
    });

    const handleCancel = () => {
        setModalSolicitudPrecio(false);
    };

    const handlePrecioInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const clean = value.replace(/\D/g, "");
        setPrecioData(prev => prev ? { ...prev, valor: parseInt(clean) || 0 } : null);
    };

    const handleSave = async () => {
        if (!precioData || !categoriaIdSeleccionada) return;
        setSaving(true);
        try {
            const response = await fetch('/api/clientes/precios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clienteId: clienteId,
                    subcategoriaCatalogoId: precioData.subcategoriaCatalogoId?._id,
                    valor: precioData.valor,
                }),
            });
            const data = await response.json();
            console.log("Response from saving price:", data);
            if (data.ok) {
                toast.success('Precio guardado con éxito');
                setModalSolicitudPrecio(false);
            }
        } catch {
            toast.error('Error al guardar el precio');
        }
        setSaving(false);
    };

    return <div className="mt-6">
        <div className={`w-full ${clienteId != null && noCredit ? '' : 'opacity-20'}`}>
            <div className="flex justify-between items-center">
                <p className="font-bold text-lg">Listado productos</p>
                <button
                    type="button"
                    className="h-12 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    onClick={async () => {
                        setModalSolicitudPrecio(true);
                    }}
                    disabled={loadingPrecios}
                >
                    {loadingPrecios ? <Loader texto="Cargando..." /> : (session?.user.role == USER_ROLE.gerente
                        || session?.user.role == USER_ROLE.cobranza
                        || session?.user.role === USER_ROLE.encargado) ? 'Nuevo producto' : 'Solicitar producto'}
                </button>
            </div>
            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                <div className="w-3/12 pr-4">
                    <p className="font-bold">Cantidad</p>
                </div>
                <div className={`${(session?.user.role == USER_ROLE.gerente
                    || session?.user.role == USER_ROLE.cobranza
                    || session?.user.role === USER_ROLE.encargado) ? 'w-3/12' : 'w-9/12'} pr-4`}>
                    <p className="font-bold">ITEM</p>
                </div>
                {(session?.user.role === USER_ROLE.gerente || session?.user.role === USER_ROLE.cobranza || session?.user.role === USER_ROLE.encargado) && <>
                    <div className="w-3/12 pr-4">
                        <p className="font-bold text-center">Precio</p>
                    </div>
                    <div className="w-3/12 pr-4">
                        <p className="font-bold text-center">SubTotal</p>
                    </div>
                </>}
            </div>
            {precios && precios.map((precio, index) => (
                <div key={`precio_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-2 bg-gray-100 ${getValues(`precios[${index}].seleccionado`) ? '' : 'opacity-50'}`}>
                    <div className="w-3/12">
                        <div className="flex">
                            <input
                                id={`checkbox-${index}`}
                                {...register(`precios[${index}].seleccionado`)}
                                type="checkbox"
                                className="block w-8 h-8 mt-1 mr-2"
                                onChange={e => {
                                    const checked = e.target.checked;                                    
                                    setValue(`precios.${index}.seleccionado`, checked);
                                    setValue(`precios.${index}.cantidad`, checked ? 1 : 0);
                                    setValue(`precios.${index}.subcategoriaId`, checked ? precio.subcategoriaCatalogoId?._id || "" : "");
                                }}
                            />
                            <input
                                id={`precios-${index}`}
                                {...register(`precios[${index}].cantidad`, { valueAsNumber: true })}
                                defaultValue={precio.cantidad}
                                type="number"
                                min={0}
                                max={999}
                                className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right" />
                        </div>
                    </div>
                    <div className={`${(session?.user.role == USER_ROLE.gerente
                        || session?.user.role == USER_ROLE.cobranza
                        || session?.user.role === USER_ROLE.encargado) ? 'w-3/12' : 'w-9/12'} flex space-x-2`}>
                        {precio.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento ? <div className='w-full'>
                            <p className="font-bold text-lg">{precio.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento}</p>
                            <span className="relative -top-1">{precio.subcategoriaCatalogoId?.cantidad} {precio.subcategoriaCatalogoId?.unidad}</span>
                        </div> : <div className='w-full'>
                            <p className="font-bold text-lg">{precio.subcategoriaCatalogoId?.categoriaCatalogoId?.nombre}</p>
                            <span className="relative -top-1">{precio.subcategoriaCatalogoId?.nombre}</span>
                        </div>}
                        {precio.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento && <div className="w-full flex items-end justify-end text-xs space-x-1">
                            {precio.subcategoriaCatalogoId?.categoriaCatalogoId?.esMedicinal && <span className="text-white bg-green-600 rounded px-2 h-4">MED</span>}
                            {precio.subcategoriaCatalogoId?.sinSifon && <span className="text-white bg-gray-600 rounded px-2 h-4">S/S</span>}
                            {precio.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial && <span className="text-white bg-blue-600 rounded px-2 h-4">IND</span>}
                        </div>}
                    </div>
                    {(session?.user.role == USER_ROLE.gerente
                        || session?.user.role == USER_ROLE.cobranza
                        || session?.user.role === USER_ROLE.encargado) && <><div className="w-3/12 pr-4">
                            <div className="flex">
                                <span className="font-bold mt-2 px-4">$</span>
                                <span className="w-full font-bold text-sm text-right mt-2">
                                    {(precios[index].valor || 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                            <div className="w-3/12 pr-4">
                                <div className="flex">
                                    <span className="font-bold mt-2 px-4">$</span>
                                    <span className="w-full font-bold text-sm text-right mt-2">
                                        {getValues(`precios[${index}].seleccionado`) && getValues(`precios[${index}].cantidad`) > 0
                                            ? (getValues(`precios[${index}].cantidad`) * precio.valor).toLocaleString('es-CL')
                                            : 0}
                                    </span>
                                </div>
                            </div></>}
                </div>
            ))}

            {modalSolicitudPrecio && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-12 p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={handleCancel}
                                className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                                aria-label="Cerrar"
                                type="button"
                            >
                                <LiaTimesSolid />
                            </button>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Solicitar precio</h3>
                            <div className="mt-2">
                                <div className="mt-4 space-y-3 text-left">
                                    <div className="flex flex-col">
                                        <label htmlFor="categoriaSelect" className="text-sm text-gray-500">Categoría</label>
                                        <select
                                            id="categoriaSelect"
                                            value={categoriaIdSeleccionada}
                                            onChange={(e) => {
                                                setCategoriaIdSeleccionada(e.target.value);
                                            }}
                                            className="border rounded-md px-3 py-2 text-base"
                                        >
                                            <option value="">Seleccione una categoría</option>
                                            {categorias && categorias.map((categoria) => (
                                                <option key={categoria._id} value={categoria._id}>
                                                    {categoria.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label htmlFor="subcategoriaId" className="text-sm text-gray-500">Subcategoría</label>
                                        <select
                                            {...register("subcategoriaCatalogoId")}
                                            value={precioData?.subcategoriaCatalogoId?._id || ""}
                                            onChange={(e) => {
                                                const selectedSubcategoria = subcategorias?.find(sc => sc._id === e.currentTarget.value);
                                                if (selectedSubcategoria) {
                                                    setValue("subcategoriaCatalogoId", e.currentTarget.value);
                                                }
                                            }}
                                            className="border rounded-md px-3 py-2 text-base"
                                        >
                                            <option value="">Seleccione una subcategoría</option>
                                            {subcategorias &&
                                                subcategorias.filter(sc => sc.categoriaCatalogoId._id === categoriaIdSeleccionada).map((subcategoria) => (
                                                    <option key={subcategoria._id} value={subcategoria._id}>
                                                        {subcategoria.nombre}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    {(session?.user.role == USER_ROLE.gerente || session?.user.role == USER_ROLE.encargado || session?.user.role == USER_ROLE.cobranza)
                                        && <div className="flex flex-col">
                                            <label htmlFor="precio" className="text-sm text-gray-500">Precio</label>
                                            <div className="flex items-center">
                                                <span className="text-gray-500 mr-1">$</span>
                                                <input
                                                    {...register("precio", { required: true })}
                                                    value={precioData?.valor || 0}
                                                    type="text"
                                                    id="precio"
                                                    name="precio"
                                                    className="border rounded-md px-3 py-2 text-base w-full text-right"
                                                    placeholder="Precio"
                                                    onChange={handlePrecioInputChange}
                                                    inputMode="numeric"
                                                />
                                            </div>
                                        </div>}
                                </div>
                            </div>
                            <div className={`mt-4 ${loadingPrecios ? 'opacity-50 pointer-events-none' : ''}`}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${(saving || loadingPrecios) ? 'opacity-50 cursor-not-allowed' : ''}`}                                >
                                    {saving && <div className="absolute -mt-1"><Loader texto="" /></div>}
                                    {(session?.user.role == USER_ROLE.gerente
                                        || session?.user.role == USER_ROLE.encargado
                                        || session?.user.role == USER_ROLE.cobranza) ? 'NUEVO' : 'SOLICITAR'} PRECIO
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={loadingPrecios}
                                    className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>;
}