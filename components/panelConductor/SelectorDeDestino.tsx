import { TbFlagCheck } from "react-icons/tb";
import { IRutaDespachoView } from "../prefabs/types";
import { TIPO_ORDEN } from "@/app/utils/constants";
import { FaMapLocationDot, FaTruckFast } from "react-icons/fa6";
import { BsFillGeoAltFill } from "react-icons/bs";
import { useForm } from "react-hook-form";
import { Selector } from "../prefabs/Selector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import getVentaActual from "./utils";
import Loader from "../Loader";
import { FaFlagCheckered } from "react-icons/fa";

export default function SelectorDeDestino({
    rutaDespacho
}: {
    rutaDespacho: IRutaDespachoView;
}) {
    const { register, getValues } = useForm();
    const queryClient = useQueryClient();

const { mutate: iniciarViaje, isPending: isLoading } = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho?._id || !rutaDespacho.ruta[rutaDespacho.ruta.length - 1]?.direccionDestinoId) {
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
    

    return (<div className="w-full flex flex-col items-end">
        {getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado &&
            <div className="w-full bg-neutral-100 rounded p-2 mb-4">
                <p className="text-xs">Misión:</p>
                <p className="text-xl">RETIRO DE CILINDROS</p>
            </div>}

        <div className="flex flex-row items-start justify-center gap-3 mb-6">

            <div className="flex flex-col items-center mt-1 ml-2">
                <TbFlagCheck className="text-xl mb-4 w-6" />

                {rutaDespacho && rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="h-12" key={`ruta_${indexRuta}`}>
                    <div className="h-4" />
                    {ruta.fechaArribo
                        ? <TbFlagCheck className="text-xl mt-1" />
                        : <FaTruckFast className="text-xl mt-1 w-6" />}
                </div>))}
            </div>

            <div className="flex flex-col items-center justify-start h-full">
                <div className="flex flex-col items-center mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                    {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="w-6" key={`ruta_${indexRuta}`}>
                        <div className="w-2 h-10 bg-blue-400 -mt-1 -mb-2 mx-auto" />
                        <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-400" /></div>))}
                </div>
            </div>

            <div className="w-full text-left -mt-3">
                <div className="w-full flex mt-1 h-12 items-center">
                    <BsFillGeoAltFill size="1.1rem" className="w-4" /><span className="text-sm ml-2">Barros Arana</span>
                </div>
                {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div key={`ruta_${indexRuta}`} className="flex mt-1 h-12 items-center overflow-hidden">
                    <BsFillGeoAltFill size="1.1rem" className="w-4" />
                    <span className="text-xs ml-2 w-36">{ruta.direccionDestinoId
                        && ruta.direccionDestinoId.nombre?.split(",").slice(0, 3).join(",")}</span>
                    {indexRuta == rutaDespacho.ruta.length - 1 && <button
                        className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
                        onClick={() => {
                            const destino = `${ruta.direccionDestinoId && ruta.direccionDestinoId.latitud},${ruta.direccionDestinoId && ruta.direccionDestinoId.longitud}`;
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
        
        {getVentaActual(rutaDespacho)?.direccionDespachoId == null && <Selector 
            options={rutaDespacho ? rutaDespacho.ventaIds
                .flatMap(venta =>
                    venta.clienteId.direccionesDespacho
                        .filter(dir => {
                            // Excluir direcciones ya entregadas (fechaArribo != null en la ruta)
                            const entregada = rutaDespacho.ruta.some(
                                r => r.direccionDestinoId?._id === dir.direccionId._id && r.fechaArribo != null
                            );
                            // Excluir si ya está en la ruta pendiente de entrega
                            const yaEnRutaPendiente = rutaDespacho.ruta.some(
                                r => r.direccionDestinoId?._id === dir.direccionId._id && r.fechaArribo == null
                            );
                            return !entregada && !yaEnRutaPendiente;
                        })
                        .map(dir => ({
                            ventaId: venta._id,
                            clienteNombre: venta.clienteId.nombre,
                            direccion: dir
                        }))
                ) : []}
            register={register("direccionDestinoId")}
            label="Destino"
            placeholder={rutaDespacho && rutaDespacho.ruta.some(r => r.fechaArribo === null) ? "Cambiar tu selección" : "Selecciona un destino"}
            getLabel={(option) => `${option.clienteNombre} | ${option.direccion.direccionId.nombre}`}
            getValue={(option) => option.ventaId}
        />}

        {rutaDespacho.ruta?.filter(r => r.fechaArribo != null).length < rutaDespacho.ventaIds.length && <div className="flex flex-row items-center justify-center">
            <button className={`flex w-full justify-center h-10 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer ${rutaDespacho.ruta.length == 0 || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].fechaArribo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    </div>);
}
