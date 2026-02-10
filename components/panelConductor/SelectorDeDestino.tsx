import { TbFlagCheck } from "react-icons/tb";
import { IDestinoDisponible, IRutaConductorView } from "@/types/types";
import { TIPO_ORDEN } from "@/app/utils/constants";
import { FaMapLocationDot, FaTruckFast } from "react-icons/fa6";
import { BsFillGeoAltFill } from "react-icons/bs";
import { useForm } from "react-hook-form";
import { Selector } from "../prefabs/Selector";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Loader from "../Loader";
import { FaFlagCheckered } from "react-icons/fa";

const getVentaActual = (rutaDespacho: IRutaConductorView) => {
    if(!rutaDespacho) return null;
    const destinoActual = rutaDespacho.destinos?.find(destino => destino.fecha_arribo == null);
    if (!destinoActual) return null;
    return destinoActual;
};

export default function SelectorDeDestino({
    rutaDespacho
}: {
    rutaDespacho: IRutaConductorView;
}) {
    const { register, getValues, watch } = useForm();
    const queryClient = useQueryClient();

    // Observar cambios en la selección de destino
    const destinoSeleccionado = watch("direccionDestinoId");

    const { data: destinos, isLoading: isLoadingDestinos } = useQuery<IDestinoDisponible[]>({
        queryKey: ['destinos-ruta-conductor', rutaDespacho.id],
        queryFn: async () => {
            if (!rutaDespacho || !rutaDespacho.id) return [];
            const response = await fetch(`/api/conductor/destinos?rutaId=${rutaDespacho.id}`);
            const data = await response.json();
            console.log("Destinos disponibles para la ruta de despacho:", data.destinos);
            return data.destinos;
        },
        enabled: !!rutaDespacho?.id,
        initialData: []
    })

    const { mutate: iniciarViaje, isPending: isLoading } = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho?.id) {
                throw new Error('Missing rutaId');
            }

            let direccionDestinoId = getValues("direccionDestinoId");
            if (!direccionDestinoId) {
                direccionDestinoId = rutaDespacho.destinos && rutaDespacho.destinos.find(destino => destino.fecha_arribo == null)?.direccion?.id;
            }

            if (!direccionDestinoId) {
                throw new Error('Debe seleccionar un destino');
            }

            const response = await fetch('/api/conductor/iniciarViaje', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho.id,
                    direccionId: direccionDestinoId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error iniciando viaje');
            }

            return response.json();
        },
        onSuccess: () => {            
            queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho.id] });
        },
        onError: (error) => {
            console.error('Error iniciando viaje:', error);
        }
    });    

    return <div className="w-full flex flex-col items-center mb-5 px-2 space-y-3">
        {getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado &&
            <div className="w-full bg-neutral-100 rounded p-2 mb-4">
                <p className="text-xs">Misión:</p>
                <p className="text-xl">RETIRO DE CILINDROS</p>
            </div>}

        <div className="flex flex-row items-start justify-center mb-6 mx-auto space-x-3">

            <div className="flex flex-col items-center mt-1 ml-2">
                <TbFlagCheck className="text-xl mb-4 w-6" />

                {rutaDespacho && rutaDespacho.destinos?.length > 0 
                && rutaDespacho.destinos.map((destino, indexRuta) => (
                <div className="h-12" key={`ruta_${indexRuta}`}>
                    <div className="h-4" />
                    {destino.fecha_arribo
                        ? <TbFlagCheck className="text-xl mt-1" />
                        : <FaTruckFast className="text-xl mt-1 w-6" />}
                </div>))}
            </div>

            <div className="flex flex-col items-center justify-start h-full">
                <div className="flex flex-col items-center mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                    {rutaDespacho.destinos?.length > 0 && rutaDespacho.destinos.map((destino, indexRuta) => (
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
                {rutaDespacho.destinos?.length > 0 && rutaDespacho.destinos.map((destino, indexRuta) => (<div key={`ruta_${indexRuta}`} className="flex mt-1 h-12 items-center overflow-hidden">
                    <BsFillGeoAltFill size="1.1rem" className="w-4" />
                    <span className="text-xs ml-2 w-36">{destino.direccion
                        && destino.direccion.nombre?.split(",").slice(0, 3).join(",")}</span>
                    {indexRuta == rutaDespacho.destinos?.length - 1 && <button
                        className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
                        onClick={() => {
                            const glosaDestino = `${destino.direccion && destino.direccion.latitud},${destino.direccion && destino.direccion.longitud}`;
                            // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${glosaDestino}&travelmode=driving`,
                                "_blank"
                            );
                        }}
                    >
                        <FaMapLocationDot className="w-7 -ml-0.5" size="1.5rem" />
                    </button>}
                </div>))}
            </div>
        </div>
        
        {!isLoadingDestinos && destinos && destinos.length > 1 && <Selector 
            options={destinos.map((destino: IDestinoDisponible): { label: string; value: string } => {
                return {
                    value: destino.direccion_id,
                    label: destino.glosa_direccion
                }
            })}
            register={register("direccionDestinoId")}
            label="Destino"
            placeholder={rutaDespacho && rutaDespacho.destinos?.some(r => r.fecha_arribo === null) ? "Cambiar tu selección" : "Selecciona un destino"}
            getLabel={(option: { label: string; value: string }) => option.label}
            getValue={(option: { label: string; value: string }) => option.value}
        />}

        {isLoadingDestinos && <div className="w-full">
            <Loader texto="Cargando destinos..." />
        </div>}
        
        <div className="flex flex-row w-full items-center justify-center">
            {/* Validar condiciones para habilitar el botón */}
            {(() => {
                return (
                    <div className="flex flex-col w-full items-center space-y-2">
                        {!destinoSeleccionado && destinos && destinos.length > 1 && (
                            <div className="w-full text-center mb-2">
                                <p className="text-sm text-amber-600">Selecciona un destino para continuar</p>
                            </div>
                        )}
                        <button className={`flex w-full justify-center h-10 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer ${isLoading || (!destinoSeleccionado && destinos.length === 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => iniciarViaje()}
                            disabled={isLoading || (!destinoSeleccionado && destinos.length === 1)}>
                            {isLoading ? <div className="mt-1">
                                <Loader texto="INICIANDO" />
                            </div> :
                                <div className="flex">
                                    <FaFlagCheckered className="mt-3 mr-3" />
                                    <span className="mt-2">INICIAR VIAJE</span>
                                </div>}
                        </button>
                    </div>
                );
            })()}
        </div>
    </div>;
}
