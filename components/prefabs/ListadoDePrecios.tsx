"use client";

import Loader from "../Loader";
import { UseFormRegister, UseFormSetValue, UseFormGetValues, UseFormWatch } from "react-hook-form";
import { INuevaVentaSubmit, IPrecioView } from "../pedidos/types";
import { useQuery } from "@tanstack/react-query";
import { ROLES } from "@/app/utils/constants";
import { useAuthorization } from "@/lib/auth/useAuthorization";
import { Can } from "@/lib/auth/AuthorizationComponents";
import { useState } from "react";
import SolicitudPrecioModal from "../modals/SolicitudPrecioModal";

export default function ListadoDePrecios({
    register,
    setValue,
    getValues,
    watch,
    clienteId,
    noCredit = true,
}: {
    register: UseFormRegister<INuevaVentaSubmit>;
    setValue: UseFormSetValue<INuevaVentaSubmit>;
    getValues: UseFormGetValues<INuevaVentaSubmit>;
    watch: UseFormWatch<INuevaVentaSubmit>;
    clienteId?: string;
    noCredit?: boolean;
}) {

    const [modalSolicitudPrecio, setModalSolicitudPrecio] = useState(false);
    const { user, hasRole } = useAuthorization();

    const { data: precios, isLoading: loadingPrecios } = useQuery<IPrecioView[]>({
        queryKey: ['precios-cliente', clienteId],
        queryFn: async () => {
            console.log("Fetching precios for clienteId:", clienteId);
            if (!clienteId) return [];
            const response = await fetch(`/api/clientes/precios?clienteId=${clienteId}`);
            const data = await response.json();
            console.log("Precios obtenidos:", data);
            return data.precios;
        },
        enabled: clienteId != null,
    });

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
                    {loadingPrecios ? <Loader texto="Cargando..." /> : hasRole([ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]) ? 'Nuevo producto' : 'Solicitar producto'}
                </button>
            </div>
            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                <div className="w-3/12 pr-4">
                    <p className="font-bold">Cantidad</p>
                </div>
                <div className={`${hasRole([ROLES.COLLECTIONS, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]) ? 'w-3/12' : 'w-9/12'} pr-4`}>
                    <p className="font-bold">ITEM</p>
                </div>
                <Can actions={['read']} resources={['precios']}>
                    <div className="w-3/12 pr-4">
                        <p className="font-bold text-center">Precio</p>
                    </div>
                    <div className="w-3/12 pr-4">
                        <p className="font-bold text-center">SubTotal</p>
                    </div>
                </Can>
            </div>
            {precios && precios.map((precio, index) => {
                const seleccionado = watch(`precios.${index}.seleccionado`);
                const cantidad = watch(`precios.${index}.cantidad`) || 0;
                return (<div key={`precio_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-2 bg-gray-100 ${getValues(`precios.${index}.seleccionado`) ? '' : 'opacity-50'}`}>
                    <div className="w-3/12">
                        <div className="flex">
                            <input
                                id={`checkbox-${index}`}
                                {...register(`precios.${index}.seleccionado`)}
                                type="checkbox"
                                className="block w-8 h-8 mt-1 mr-2"
                                onChange={e => {
                                    const checked = e.target.checked;                                    
                                    setValue(`precios.${index}.seleccionado`, checked);
                                    setValue(`precios.${index}.cantidad`, checked ? 1 : 0);
                                    setValue(`precios.${index}.subcategoria_id`, checked ? precio.subcategorias_catalogo?.id || "" : "");
                                }}
                            />
                            <input
                                id={`precios-${index}`}
                                {...register(`precios.${index}.cantidad`, { valueAsNumber: true })}
                                defaultValue={0}
                                type="number"
                                min={0}
                                max={999}
                                className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right" />
                        </div>
                    </div>
                    <div className={`${hasRole([ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.SUPER_ADMIN]) ? 'w-3/12' : 'w-9/12'} flex space-x-2`}>
                        {precio.subcategorias_catalogo?.categorias_catalogo?.elemento ? <div className='w-full'>
                            <p className="font-bold text-lg">{precio.subcategorias_catalogo?.categorias_catalogo?.elemento}</p>
                            <span className="relative -top-1">{precio.subcategorias_catalogo?.cantidad} {precio.subcategorias_catalogo?.unidad}</span>
                        </div> : <div className='w-full'>
                            <p className="font-bold text-lg">{precio.subcategorias_catalogo?.categorias_catalogo?.nombre}</p>
                            <span className="relative -top-1">{precio.subcategorias_catalogo?.nombre}</span>
                        </div>}
                        {precio.subcategorias_catalogo?.categorias_catalogo?.elemento && <div className="w-full flex items-end justify-end text-xs space-x-1">
                            {precio.subcategorias_catalogo?.categorias_catalogo?.es_medicinal && <span className="text-white bg-green-600 rounded px-2 h-4">MED</span>}
                            {precio.subcategorias_catalogo?.sin_sifon && <span className="text-white bg-gray-600 rounded px-2 h-4">S/S</span>}
                            {precio.subcategorias_catalogo?.categorias_catalogo?.es_industrial && <span className="text-white bg-blue-600 rounded px-2 h-4">IND</span>}
                        </div>}
                    </div>
                    <Can actions={['read']} resources={['precios']}>
                        <div className="w-3/12 pr-4">
                            <div className="flex">
                                <span className="font-bold mt-2 px-4">$</span>
                                <span className="w-full font-bold text-sm text-right mt-2">
                                    {(precio.valor || 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                        <div className="w-3/12 pr-4">
                            <div className="flex">
                                <span className="font-bold mt-2 px-4">$</span>
                                <span className="w-full font-bold text-sm text-right mt-2">
                                    {seleccionado && cantidad > 0
                                        ? (cantidad * precio.valor).toLocaleString('es-CL')
                                        : 0}
                                </span>
                            </div>
                        </div>
                    </Can>
                </div>)
            })}

            {modalSolicitudPrecio && <SolicitudPrecioModal
                clienteId={clienteId || ""}
                onClose={() => setModalSolicitudPrecio(false)}
            />}
        </div>
    </div>;
}