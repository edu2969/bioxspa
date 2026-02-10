import { IRutaConductorView } from "@/types/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MdInfo } from "react-icons/md";
import { TbHomeShare } from "react-icons/tb";
import Loader from "../Loader";

export default function VolverABase({
    rutaDespacho
}: {
    rutaDespacho: IRutaConductorView;
}) {
    const queryClient = useQueryClient();
    const mutationVolverABase = useMutation({
        mutationFn: async () => {
            if (!rutaDespacho?.id) {
                throw new Error('Missing rutaId');
            }
            const response = await fetch('/api/conductor/volverABase', {
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
                throw new Error(errorData.error || 'Error al marcar regreso a base');
            }
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success("Regreso a base informado con éxito");
                queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho.id] });
            }
        },
        onError: (error: any) => {
            toast.error(`Error al marcar regreso a base: ${error.message}`);
        }
    });


    const handleGoingBackToBase = async () => {
        mutationVolverABase.mutate();
    }

    return (<div className="w-full mb-4 bg-white mx-auto px-4">
        <div className="w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mb-4 flex">
            <div className="w-40 overflow-hidden">
                <MdInfo className="mr-2 text-5xl" />
            </div>
            <div className="text-md text-left font-bold ml-2">
                Espera instrucciones, regresar a base o retira cilindros cercanos creando la órden tú mismo.
            </div>
        </div>
        <button
            className={`w-full flex justify-center mt-4 py-3 bg-green-400 text-white font-bold rounded-lg shadow-md h-12`}
            onClick={handleGoingBackToBase}>
            <TbHomeShare className="text-2xl mt-0 mr-2" /><span>REGRESO A BASE</span>
            {mutationVolverABase.isPending &&
                <div className="absolute -mt-1">
                    <Loader texto="" />
                </div>}
        </button>
    </div>);
}