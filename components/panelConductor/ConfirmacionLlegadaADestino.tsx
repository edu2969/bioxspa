import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MdBusAlert } from "react-icons/md"
import { IRutaConductorView } from "@/types/types";
import { useState } from "react";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN } from "@/app/utils/constants";
import { FaBuildingFlag } from "react-icons/fa6";
import { BsFillGeoAltFill } from "react-icons/bs";
import Loader from "../Loader";
import { LuFlagOff } from "react-icons/lu";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

const getVentaActual = (rutaDespacho: IRutaConductorView) => {
    const tramoActual = rutaDespacho.tramos.find(tramo => tramo.fechaArribo == null);
    if (!tramoActual) return null;
    return tramoActual;
};

export default function ConfirmacionLlegadaADestino({
    rutaDespacho,
    estado
}: {
    rutaDespacho: IRutaConductorView;
    estado: number;
}) {
    const queryClient = useQueryClient();
    const [esperaConfirmacion, setEsperaConfirmacion] = useState(false);
    const [ingresoQuienRecibe, setIngresoQuienRecibe] = useState(false);
    const { register, formState } = useForm<{
        rut: string,
        nombre: string
    }>();

    const { mutate: confirmarArribo, isPending: isPendingConfirmarArribo } = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho) {
                throw new Error('No hay ruta de despacho disponible');
            }

            const response = await fetch('/api/conductor/confirmarArribo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error reportando llegada');
            }            
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho._id] });
        },
        onError: (error) => {
            console.error('Error reportando llegada:', error);
        }
    });

    const handleHeLlegado = () => {
        setEsperaConfirmacion(true);
        setTimeout(() => {
            setIngresoQuienRecibe(true);
            setEsperaConfirmacion(false);
        }, 1000);
    };

    const { mutate: corregirDestino } = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho) {
                throw new Error('No hay ruta de despacho disponible');
            }
            const response = await fetch('/api/conductor/corregirDestino', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error corrigiendo destino');
            }            
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho._id] });
            toast.success("Destino corregido, por favor selecciona el nuevo destino");
        },
        onError: (error) => {
            console.error('Error corrigiendo destino:', error);
        }
    });

    return (<div className="bg-white/80 rounded-t-lg px-4 py-4 shadow-lg w-full">
        <form>
            {estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta && !ingresoQuienRecibe && <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <h1 className="font-bold text-2xl">Conduce con precaución.</h1>
                <MdBusAlert size="8rem" className="text-yellow-400" />
                <span className="text-xl">Al llegar, avisas presionando el botón</span>
                <button
                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md mb-4 h-12 ${esperaConfirmacion ? 'opacity-50' : ''}`}
                    onClick={() => handleHeLlegado()}
                    disabled={esperaConfirmacion}>
                        <FaBuildingFlag size="1.4rem"/>&nbsp;&nbsp;&nbsp;HE LLEGADO
                        {esperaConfirmacion &&
                        <div className="absolute -mt-1">
                            <Loader texto="" />
                        </div>}
                </button>
            </div>}

            {estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta && ingresoQuienRecibe && <div className="w-full">
                <FaBuildingFlag size="9rem" className="text-blue-500 mb-4 mx-auto" />
                <div>
                    <p className="text-center text-xl font-bold mb-4">Confirma que has llegado a</p>
                    <div className="flex bg-blue-400 text-white border-lg shadow-md rounded-lg mx-2 p-2">
                        <BsFillGeoAltFill size="1.75rem" className="inline-block mr-2" />
                        <p className="text-xl text-center">{rutaDespacho.tramos.find(t => t.fechaArribo === null)?.cliente.direccion.nombre || "un destino"}</p>
                    </div>

                    <div className="w-full px-6 py-4 bg-white mx-auto">
                        <h2 className="text-xl font-bold mb-4">Datos de quién {rutaDespacho && getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado ? 'entrega' : 'recibe'}</h2>
                        <div className="flex flex-col md:flex-row text-left">
                            <label htmlFor="rut" className="text-xs">RUT</label>
                            <input
                                {...register("rut", { required: true })}
                                type="text"
                                className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                                placeholder="RUT (opcional)*"
                            />
                            <label htmlFor="nombre" className="text-xs mt-4">Nombre</label>
                            <input
                                {...register("nombre", { required: true })}
                                type="text"
                                className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                                placeholder="Nombre quien recibe"
                            />
                        </div>
                    </div>

                </div>
                <button
                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-green-400 text-white font-bold rounded-lg shadow-md h-12 ${isPendingConfirmarArribo || !formState.isValid ? 'opacity-50' : ''}`}
                    disabled={isPendingConfirmarArribo || !formState.isValid}
                    onClick={() => confirmarArribo()}>
                    <FaBuildingFlag className="mt-1 mr-2" /><span>CONFIRM{isPendingConfirmarArribo ? "ANDO" : "O"}</span>
                    {isPendingConfirmarArribo &&
                        <div className="absolute -mt-1">
                            <Loader texto="" />
                        </div>
                    }
                </button>
                <button
                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-gray-600 text-white font-bold rounded-lg shadow-md h-12`}
                    onClick={() => corregirDestino()}>
                    <LuFlagOff className="mt-1 mr-2" /><span>ES OTRO DESTINO</span>
                </button>
            </div>}
        </form>
    </div>);
}
