"use client"

import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthorization } from '@/lib/auth/useAuthorization';
import type { ICliente } from '@/types/cliente';
import type { INuevaVentaSubmit } from './types';
import DatosGenerales from './DatosGenerales';
import ListadoDePrecios from '../_prefabs/ListadoDePrecios';
import DatosDeTraslado from './DatosDeTraslado';
import DatosOrdenDeTrabajo from './DatosOrdenDeTrabajo';
import DatosDelCliente from './DatosDelCliente';
import { useQuery } from '@tanstack/react-query';
import Nav from '../Nav';
import { useUser } from "@/components/providers/UserProvider";
import { TIPO_CARGO } from '@/app/utils/constants';
import Image from 'next/image';
import { getColorEstanque } from '@/lib/uix';

const cilindros = [
    // O2 10 m3
    ...Array(10).fill(null).map((_, i) => ({
        id: `cilindro_o2_10_${i}`,
        codigo: `O2-10-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'O₂', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 10, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // O2 6 m3
    ...Array(6).fill(null).map((_, i) => ({
        id: `cilindro_o2_6_${i}`,
        codigo: `O2-06-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'O₂', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 6, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // O2 Medicinal 9 m3
    ...Array(4).fill(null).map((_, i) => ({
        id: `cilindro_o2med_9_${i}`,
        codigo: `O2M-09-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'O₂', esMedicinal: true, esIndustrial: false },
        subcategoria: { cantidad: 9, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // Argón 10 m3
    ...Array(20).fill(null).map((_, i) => ({
        id: `cilindro_ar_10_${i}`,
        codigo: `AR-10-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'Ar', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 10, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // Argón 9 m3
    ...Array(7).fill(null).map((_, i) => ({
        id: `cilindro_ar_9_${i}`,
        codigo: `AR-09-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'Ar', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 9, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // Acetileno 10 m3
    ...Array(4).fill(null).map((_, i) => ({
        id: `cilindro_ac_10_${i}`,
        codigo: `AC-10-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'C₂H₂', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 10, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // O2 Medicinal 9 m3 (segunda tanda)
    ...Array(6).fill(null).map((_, i) => ({
        id: `cilindro_o2med_9b_${i}`,
        codigo: `O2M-09B-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'O₂', esMedicinal: true, esIndustrial: false },
        subcategoria: { cantidad: 9, unidad: 'm³', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // CO2 sin sifón 10 kg
    ...Array(6).fill(null).map((_, i) => ({
        id: `cilindro_co2_10_${i}`,
        codigo: `CO2-10-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'CO₂', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 10, unidad: 'kg', sinSifon: true },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    })),
    // CO2 con sifón 25 kg
    ...Array(10).fill(null).map((_, i) => ({
        id: `cilindro_co2_25_${i}`,
        codigo: `CO2-25-${String(i + 1).padStart(3, '0')}`,
        categoria: { elemento: 'CO₂', esMedicinal: false, esIndustrial: true },
        subcategoria: { cantidad: 25, unidad: 'kg', sinSifon: false },
        ownerId: null,
        estado: i % 2 === 0 ? 'LLENO' : 'VACÍO',
        fechaUltimo: '10/abr/2024',
        diasTranscurridos: 10
    }))
];


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
        name: 'clienteId'
    });

    const direccionRetiroSeleccionado = useWatch({
        control,
        name: 'direccionRetiroId'
    });

    const motivo = useWatch({
        control,
        name: 'motivo'
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
            usuarioId: hasRole([TIPO_CARGO.gerente]) ? data.usuarioId : user.id,
            comentario: data.comentario || "",
            clienteId: cliente?.id,
            documentoTributarioId: data.documentoTributarioId,
            direccionDespachoId: data.direccionDespachoId,
            sucursalId: data.sucursalId,
            items: data.precios?.filter(precio => precio.seleccionado && precio.cantidad > 0).map(precio => ({
                cantidad: precio.cantidad,
                subcategoriaId: precio.subcategoriaId
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
        if (!formState.isValid || formState.isSubmitting || redirecting) {
            return true;
        }
        return false;
    }

    useEffect(() => {
        if(selectedPlace && tipoOrden == 2) {
            setValue("direccionRetiroId", selectedPlace.place_id || '');
        }
    }, [selectedPlace, tipoOrden, setValue]);

    const resumenCilindros = Object.values(
        cilindros.reduce((acc, cilindro) => {
            const ownerType = cilindro.ownerId ? 'TP' : 'BIOX';
            const estado = String(cilindro.estado || '').toUpperCase().includes('LLENO') ? 'LLENO' : 'VACIO';
            const key = [
                cilindro.categoria.elemento,
                cilindro.subcategoria.cantidad,
                cilindro.subcategoria.unidad,
                estado,
                cilindro.categoria.esIndustrial ? 1 : 0,
                cilindro.categoria.esMedicinal ? 1 : 0,
                cilindro.subcategoria.sinSifon ? 1 : 0,
                ownerType,
            ].join('|');

            if (!acc[key]) {
                acc[key] = {
                    key,
                    cantidad: 0,
                    elemento: cilindro.categoria.elemento,
                    medida: cilindro.subcategoria.cantidad,
                    unidad: cilindro.subcategoria.unidad,
                    esIndustrial: cilindro.categoria.esIndustrial,
                    esMedicinal: cilindro.categoria.esMedicinal,
                    sinSifon: cilindro.subcategoria.sinSifon,
                    ownerType,
                    estado,
                };
            }

            acc[key].cantidad += 1;
            return acc;
        }, {} as Record<string, {
            key: string;
            cantidad: number;
            elemento: string;
            medida: number;
            unidad: string;
            esIndustrial: boolean;
            esMedicinal: boolean;
            sinSifon: boolean;
            ownerType: 'BIOX' | 'TP';
            estado: 'VACIO' | 'LLENO';
        }>)
    );

    const normalizarElementoParaColor = (elemento: string) => {
        if (!elemento) return '';

        return elemento
            .replace(/₀/g, '0')
            .replace(/₁/g, '1')
            .replace(/₂/g, '2')
            .replace(/₃/g, '3')
            .replace(/₄/g, '4')
            .replace(/₅/g, '5')
            .replace(/₆/g, '6')
            .replace(/₇/g, '7')
            .replace(/₈/g, '8')
            .replace(/₉/g, '9');
    };

    const getCylinderScale = (elemento: string, medida: number, unidad: string) => {
        const elementoNormalizado = normalizarElementoParaColor(elemento).toLowerCase();
        const unidadNormalizada = String(unidad || '').toLowerCase();

        const base = elementoNormalizado === 'co2' && unidadNormalizada === 'kg' ? 45 : 10;
        const rawScale = Number(medida || 0) / base;

        // Mantener legibilidad visual en tarjetas compactas.
        return Math.max(0.45, Math.min(rawScale || 1, 1.4));
    };

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
                            {tipoOrden == 3 && <DatosOrdenDeTrabajo register={register} watch={watch}/>}

                            {/* IFORMACION EXTRA */}
                            {hasRole([TIPO_CARGO.encargado])
                                && cliente != null && cliente.ordenCompra &&
                                <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
                                    <legend className="font-bold text-gray-700 px-2">Orden de compra</legend>
                                    <div className="w-full flex-col mt-3 space-y-4">
                                        <div className="w-full">
                                            <label htmlFor="numeroOrden" className="block text-sm font-medium text-gray-700">N° de órden</label>
                                            <input
                                                id="numeroOrden"
                                                {...register('numeroOrden')}
                                                type="text"
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                placeholder="Ingrese el número de órden"
                                            />
                                        </div>
                                        <div className="w-full">
                                            <label htmlFor="codigoHES" className="block text-sm font-medium text-gray-700">Código HES</label>
                                            <input
                                                id="codigoHES"
                                                {...register('codigoHes')}
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
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {resumenCilindros.map((grupo, index) => (
                                        (() => {
                                            const scale = getCylinderScale(grupo.elemento, grupo.medida, grupo.unidad);
                                            const width = 24 * scale;
                                            const height = 96 * scale;

                                            return (
                                        <div
                                            key={`cilindro_resumen_${grupo.key}_${index}`}
                                            className="relative flex w-full gap-3 sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] xl:w-[calc(12.5%-0.65625rem)] min-h-[170px] rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm"
                                        >
                                            <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                                                {grupo.cantidad}
                                            </span>

                                            <div className="flex w-10 items-center justify-center">
                                                <Image
                                                    width={Math.round(width)}
                                                    height={Math.round(height)}
                                                    src={`/ui/tanque_biox${getColorEstanque(normalizarElementoParaColor(grupo.elemento))}.png`}
                                                    style={{ width: `${width}px`, height: 'auto' }}
                                                    alt={`cilindro_${grupo.elemento}_${grupo.medida}${grupo.unidad}`}
                                                />
                                            </div>

                                            <div className="flex-1">
                                                <div className="mb-3 flex flex-wrap gap-1 pr-8">
                                                    {grupo.esIndustrial && <span className="rounded bg-yellow-600 px-2 py-0.5 text-xs font-bold text-white">IND</span>}
                                                    {grupo.esMedicinal && <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">MED</span>}
                                                    {grupo.sinSifon && <span className={`rounded px-2 py-0.5 text-xs font-bold text-white bg-gray-700`}>S/S</span>}
                                                </div>

                                                <p className="mb-2 text-2xl font-bold leading-none">
                                                    {grupo.elemento} <span className="orbitron">{grupo.medida}</span>
                                                    <span className="ml-1 text-base font-semibold">{grupo.unidad}</span>
                                                </p>

                                                <p className="w-12 rounded px-2 py-0.5 text-xs font-bold text-white bg-green-700">
                                                    {grupo.ownerType}
                                                </p>

                                                <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                                                    <span className={`h-3.5 w-3.5 rounded-full ${grupo.estado === 'LLENO' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    <span>{grupo.estado === 'LLENO' ? 'LLENO' : 'VACIO'}</span>
                                                </div>
                                            </div>
                                        </div>
                                            );
                                        })()
                                    ))}
                                </div>
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