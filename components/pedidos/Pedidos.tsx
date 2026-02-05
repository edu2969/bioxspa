"use client"

import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ROLES } from '@/app/utils/constants';
import Loader from '@/components/Loader';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthorization } from '@/lib/auth/useAuthorization';
import type { ICliente } from '@/types/cliente';
import type { INuevaVentaSubmit } from './types';
import DatosGenerales from './DatosGenerales';
import ListadoDePrecios from '../prefabs/ListadoDePrecios';
import DatosDeTraslado from './DatosDeTraslado';
import DatosOrdenDeTrabajo from './DatosOrdenDeTrabajo';
import DatosDelCliente from './DatosDelCliente';
import { useQuery } from '@tanstack/react-query';
import Nav from '../Nav';
import { useUser } from "@/components/providers/UserProvider";

export default function Pedidos() {
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues, control , formState, watch } = useForm<INuevaVentaSubmit>({
        mode: "onChange"
    });
    const [creandoOrden, setCreandoOrden] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const formScrollRef = useRef<HTMLDivElement>(null);
    const { user, hasRole } = useAuthorization();
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const userContext = useUser(); // Mover el hook aquí

    const tipoOrden = useWatch({
        control,
        name: 'tipo'
    });

    const clienteId = useWatch({
        control,
        name: 'cliente_id'
    });

    const direccionRetiroSeleccionado = useWatch({
        control,
        name: 'direccion_despacho_id'
    });

    const motivoTrasladoSeleccionado = useWatch({
        control,
        name: 'motivo_traslado'
    });
    
    const { data: cliente } = useQuery<ICliente | null>({
        queryKey: ['cliente-by-id', clienteId],
        queryFn: async () => {
            if (!clienteId) return null;
            const response = await fetch(`/api/clientes?id=${clienteId}`);
            const data = await response.json();
            return data.cliente;
        }
    });

    const fetchWithAuth = async (payload: any) => {
        if (!userContext || !userContext.session) {
            console.error("No hay sesión activa");
            return;
        }

        const token = userContext.session.access_token;

        const response = await fetch('/api/ventas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Incluir el token en el encabezado
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            toast.error("Error en la solicitud:", data);
        } else {
            toast.success("Solicitud exitosa!");
            router.back();
        }
    };

    const onSubmit = async (data: INuevaVentaSubmit) => {
        if (!user) return;
        setCreandoOrden(true);
        const payload = {
            tipo: data.tipo,
            usuario_id: data.usuario_id,
            comentario: data.comentario || "",
            cliente_id: cliente?.id,
            documento_tributario_id: data.documento_tributario_id,
            direccion_despacho_id: data.direccion_despacho_id,
            sucursal_id: data.sucursal_id,
            items: data.precios?.filter(precio => precio.seleccionado && precio.cantidad > 0).map(precio => ({
                cantidad: precio.cantidad,
                subcategoria_id: precio.subcategoria_id
            }))
        };

        try {
            await fetchWithAuth(payload);
            setCreandoOrden(false);
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error al crear la venta. Por favor, inténtelo más tarde.", {
                position: "top-center"
            });
        } finally {
            setCreandoOrden(false);
        }
    };

    const formInvalid = () => {
        // Validación adicional para precios seleccionados
        const precios = getValues('precios');

        if(!precios || precios.length == 0) {            
            return true;
        }

        const noSeleccionados = precios.every(precio => !precio.seleccionado);
        if(noSeleccionados) {            
            return true;
        }

        if (precios && Array.isArray(precios)) {
            const hasSelectedWithoutQuantity = precios.some(precio => 
                precio.seleccionado && (!precio.cantidad || precio.cantidad <= 0)
            );
            if (hasSelectedWithoutQuantity) {                
                return true;
            }
        }

        // Validación básica del formulario
        if (!formState.isValid || formState.isSubmitting || redirecting) {            
            return true;
        }

        return false;
    }

    useEffect(() => {
        if(selectedPlace && tipoOrden == 2) {
            setValue("direccion_retiro_id", selectedPlace.place_id || '');
        }
    }, [selectedPlace, tipoOrden, setValue]);

    return (
        <main className="w-full min-h-screen pt-0 overflow-y-auto bg-white sm:px-1 md:px-4">
            <div className="w-full pb-2 mt-14 h-[calc(100vh-116px)] overflow-y-auto" ref={formScrollRef}>
                <div className="mx-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="w-full px-2 sm:px-4 md:px-8 space-y-4 md:space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 w-full">

                            <DatosGenerales register={register} setValue={setValue} />

                            {tipoOrden == 1 && <DatosDelCliente
                                tipoOrden={tipoOrden}
                                register={register}
                                setValue={setValue} />}

                            {/* TRASLADO */}
                            {tipoOrden == 2 && <DatosDeTraslado register={register} />}
                            {/* ÓRDEN DE TRABAJO */}
                            {tipoOrden == 3 && <DatosOrdenDeTrabajo register={register} />}

                            {/* IFORMACION EXTRA */}
                            {hasRole([ROLES.COLLECTIONS])
                                && cliente != null && cliente.orden_compra &&
                                <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
                                    <legend className="font-bold text-gray-700 px-2">Orden de compra</legend>
                                    <div className="w-full flex-col mt-3 space-y-4">
                                        <div className="w-full">
                                            <label htmlFor="numeroOrden" className="block text-sm font-medium text-gray-700">N° de órden</label>
                                            <input
                                                id="numeroOrden"
                                                {...register('numero_orden')}
                                                type="text"
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                placeholder="Ingrese el número de órden"
                                            />
                                        </div>
                                        <div className="w-full">
                                            <label htmlFor="codigoHES" className="block text-sm font-medium text-gray-700">Código HES</label>
                                            <input
                                                id="codigoHES"
                                                {...register('codigo_hes')}
                                                type="text"
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                placeholder="Ingrese el código HES"
                                            />
                                        </div>
                                    </div>
                                </fieldset>}
                        </div>

                        {(tipoOrden == 1 || tipoOrden == 4) && clienteId
                            && <ListadoDePrecios register={register} 
                                setValue={setValue}
                                getValues={getValues}
                                clienteId={clienteId}
                                watch={watch} 
                                noCredit={true}/>}

                        {/* SELECTOR DE ITEMS */}
                        {(tipoOrden == 2 || tipoOrden == 3) && <div className="mt-6">
                            <div className={`w-full`}>
                                <p className="font-bold text-lg">{tipoOrden == 2 ? 'CILINDROS PARA TRASLADO' : 'CILINDROS DISPONIBLES'}</p>
                                <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold">CODIGO</p>
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold">Nombre</p>
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold">Propietario</p>
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold text-center">Fecha PH</p>
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold text-center">Estado</p>
                                    </div>
                                </div>
                                {/*cilindros.length > 0 && cilindros.map((cilindro, index) => (
                                    <div key={`cilindro_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-2 bg-gray-100`}>
                                        <div className="w-2/12">
                                            <span className="font-bold mt-3 mr-2">{cilindro.codigo}</span>
                                        </div>
                                        <div className="w-4/12 pr-4">
                                            <p className="flex space-x-1 mt-1">
                                                <span className="font-bold text-xl">{cilindro.categoria.elemento}</span>
                                                <span className="text-xl orbitron mt-0">{cilindro.subcategoria.cantidad}</span>
                                                <span className="mt-1">{cilindro.subcategoria.unidad}</span>
                                                {cilindro.categoria.esMedicinal && <span className="text-xs text-white bg-blue-600 rounded px-2 pt-0.5 h-5 mt-1">MED</span>}
                                                {cilindro.categoria.esIndustrial && <span className="text-xs text-white bg-yellow-600 rounded px-2 pt-0.5 h-5 mt-1">IND</span>}
                                                {cilindro.subcategoria.sinSifon && <span className="text-xs text-white bg-gray-600 rounded px-2 pt-0.5 h-5 mt-1">S/S</span>}
                                            </p>
                                        </div>
                                        <div className="w-3/12 pr-4">
                                            {cilindro.ownerId && <span className="text-xs border-gray-500 bg-gray-400 rounded px-2 pt-0 h-5 mr-2 text-white font-bold">TP</span>}
                                            {cilindro.ownerId && <span className="mt-1">{cilindro.ownerId.nombre}</span>}
                                            {!cilindro.ownerId && <span className="mt-1">BIOX</span>}
                                        </div>
                                        <div className="w-2/12 pr-4">
                                            <div className="flex">
                                                <span className="font-bold mt-2 px-4">10/abr/2024</span>
                                                <span className="w-full font-bold text-sm text-right mt-2">
                                                    hace 10 días
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-2/12 pr-4">
                                            <div className="flex text-sm space-x-2 justify-end">
                                                <span className="w-4 h-4 border-gray-600 border-2 rounded-full bg-gray-400 mt-2"></span>
                                                <span className="font-bold mt-1">VACÍO</span>
                                            </div>
                                        </div>
                                    </div>
                                ))*/}
                            </div>
                        </div>}

                        {/* Botones de acción */}
                        <div className="fixed left-0 w-full flex justify-end bottom-0 bg-white pt-2 pb-2 px-2 md:px-6 gap-4">
                            <button className="flex w-full md:w-3/12 justify-center rounded-md bg-gray-600 px-3 h-10 pt-2 text-white shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 mr-4"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.back()
                                }}>CANCELAR</button>
                            <button
                                className={`px-4 h-10 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formInvalid() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                type="submit"
                                disabled={formInvalid()}
                            >
                                {creandoOrden 
                                    ? <div className="relative mt-0"><Loader texto={redirecting ? "VOLVIENDO" : "CREANDO"} /></div> 
                                    : `CREAR ${["VENTA", "ÓRDEN DE TRASLADO", "ÓRDEN", "COTIZACIÓN"][tipoOrden - 1] ?? "ÓRDEN"}`}
                            </button>
                        </div>

                    </form>                    
                </div>
            </div>
            <Toaster />
            <Nav />
        </main>
    );
}