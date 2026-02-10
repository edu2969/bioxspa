import { IRutaConductorView } from "@/types/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FaHouseFlag } from "react-icons/fa6";
import { GiBullseye } from "react-icons/gi";
import Loader from "../Loader";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export default function FinalizarRuta({
    rutaDespacho,
    estado
}: {
    rutaDespacho: IRutaConductorView;
    estado: number;
}) {
    const queryClient = useQueryClient();
    const mutationFinalizarRuta = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho?.id) {
                throw new Error('Missing rutaId');
            }
            const response = await fetch('/api/conductor/finalizarRuta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho.id
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al finalizar la ruta');
            }
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho.id] });
            }
        },
        onError: (error: any) => {
            console.error(`Error al finalizar la ruta: ${error.message}`);
        }
    });

    const handleFinalizarRuta = () => {
        mutationFinalizarRuta.mutate();
    };

    return (<>

        {estado === TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado && <div className="absolute text-center bottom-4 w-full px-4">
            <GiBullseye className="text-8xl text-green-500 mb-4 mx-auto" />
            <p className="text-2xl font-bold text-green-600">¡OBJETIVO CUMPLIDO!</p>
            <p className="text-lg">Excelente trabajo. <br />Despacho recibirá tu entrega.</p>
        </div>}


        {estado === TIPO_ESTADO_RUTA_DESPACHO.regreso && <div className="absolute text-center bottom-4 w-full px-4">
            <p className="text-xl">Excelente ruta</p>
            <p>Regresa seguro y atento. Avisa al llegar.</p>
            <button
                className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md h-12 ${mutationFinalizarRuta.isPending ? 'opacity-50' : ''}`}
                onClick={() => handleFinalizarRuta()}>
                <FaHouseFlag className="mt-1 mr-2" /><span>HE REGRESADO</span>
                {mutationFinalizarRuta.isPending &&
                    <div className="absolute -mt-1">
                        <Loader texto="" />
                    </div>
                }
            </button>
        </div>}
    </>);
}