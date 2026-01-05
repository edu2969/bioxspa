import { TbFlagCheck } from "react-icons/tb";
import { IRutaConductorView } from "@/types/types";
import { TIPO_ORDEN } from "@/app/utils/constants";
import { FaMapLocationDot, FaTruckFast } from "react-icons/fa6";
import { BsFillGeoAltFill } from "react-icons/bs";
import { useForm } from "react-hook-form";
import { Selector } from "../prefabs/Selector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Loader from "../Loader";
import { FaFlagCheckered } from "react-icons/fa";

const getVentaActual = (rutaDespacho: IRutaConductorView) => {
    if(!rutaDespacho) return null;
    const tramoActual = rutaDespacho.tramos?.find(tramo => tramo.fechaArribo == null);
    if (!tramoActual) return null;
    return tramoActual;
};

export default function SelectorDeDestino({
    rutaDespacho
}: {
    rutaDespacho: IRutaConductorView;
}) {
    const { register, getValues } = useForm();
    const queryClient = useQueryClient();

const { mutate: iniciarViaje, isPending: isLoading } = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho?._id || !getValues("direccionDestinoId")) {
                throw new Error('Missing rutaId or direccionId');
            }

            const response = await fetch('/api/pedidos/iniciarViaje', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id,
                    direccionId: getValues("direccionDestinoId")
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error iniciando viaje');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ruta-despacho-conductor'] });
        },
        onError: (error) => {
            console.error('Error iniciando viaje:', error);
        }
    });
    

    return <div className="w-full flex flex-col items-center mb-5">
        {getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado &&
            <div className="w-full bg-neutral-100 rounded p-2 mb-4">
                <p className="text-xs">Misión:</p>
                <p className="text-xl">RETIRO DE CILINDROS</p>
            </div>}

        <div className="flex flex-row items-start justify-center mb-6 mx-auto space-x-3">

            <div className="flex flex-col items-center mt-1 ml-2">
                <TbFlagCheck className="text-xl mb-4 w-6" />

                {rutaDespacho && rutaDespacho.tramos?.length > 0 
                && rutaDespacho.tramos.map((tramo, indexRuta) => (
                <div className="h-12" key={`ruta_${indexRuta}`}>
                    <div className="h-4" />
                    {tramo.fechaArribo
                        ? <TbFlagCheck className="text-xl mt-1" />
                        : <FaTruckFast className="text-xl mt-1 w-6" />}
                </div>))}
            </div>

            <div className="flex flex-col items-center justify-start h-full">
                <div className="flex flex-col items-center mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                    {rutaDespacho.tramos?.length > 0 && rutaDespacho.tramos.map((tramo, indexRuta) => (
                        <div className="w-6" key={`ruta_${indexRuta}`}>
                            <div className="w-2 h-10 bg-blue-400 -mt-1 -mb-2 mx-auto" />
                            <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-400" />
                        </div>))}
                </div>
            </div>

            <div className="w-full text-left -mt-3">
                <div className="w-full flex mt-1 h-12 items-center">
                    <BsFillGeoAltFill size="1.1rem" className="w-4" /><span className="text-sm ml-2">Barros Arana</span>
                </div>
                {rutaDespacho.tramos?.length > 0 && rutaDespacho.tramos.map((tramo, indexRuta) => (<div key={`ruta_${indexRuta}`} className="flex mt-1 h-12 items-center overflow-hidden">
                    <BsFillGeoAltFill size="1.1rem" className="w-4" />
                    <span className="text-xs ml-2 w-36">{tramo.direccionDestino
                        && tramo.direccionDestino.nombre?.split(",").slice(0, 3).join(",")}</span>
                    {indexRuta == rutaDespacho.tramos?.length - 1 && <button
                        className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
                        onClick={() => {
                            const destino = `${tramo.direccionDestino && tramo.direccionDestino.latitud},${tramo.direccionDestino && tramo.direccionDestino.longitud}`;
                            // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
                                "_blank"
                            );
                        }}
                    >
                        <FaMapLocationDot className="w-7 -ml-0.5" size="1.5rem" />
                    </button>}
                </div>))}
            </div>
        </div>
        
        {getVentaActual(rutaDespacho)?.direccionDestino == null && <Selector 
            options={rutaDespacho ? rutaDespacho.tramos?.map(tramo => {
                return {
                    ventaId: tramo.ventaId,
                    clienteNombre: tramo.cliente.nombre,
                    direccion: tramo.direccionDestino ? tramo.direccionDestino.nombre : 'Sin dirección'
                }}) : []}
            register={register("direccionDestinoId")}
            label="Destino"
            placeholder={rutaDespacho && rutaDespacho.tramos?.some(r => r.fechaArribo === null) ? "Cambiar tu selección" : "Selecciona un destino"}
            getLabel={(option) => `${option.clienteNombre} | ${option.direccion}`}
            getValue={(option) => option.ventaId}
        />}

        {rutaDespacho.tramos?.filter(r => r.fechaArribo != null).length < rutaDespacho.tramos?.length && 
        <div className="flex flex-row w-full items-center justify-center">
            <button className={`flex w-full justify-center h-10 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer ${rutaDespacho.tramos?.length == 0 || rutaDespacho.tramos[rutaDespacho.tramos.length - 1].fechaArribo ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => iniciarViaje()}
                disabled={isLoading}>
                {isLoading ? <div className="mt-1">
                    <Loader texto="INICIANDO" />
                </div> :
                    <div className="flex">
                        <FaFlagCheckered className="mt-3 mr-3" />
                        <span className="mt-2">INICIAR VIAJE</span>
                    </div>}
            </button>
        </div>}
    </div>;
}
