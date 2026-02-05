import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import Loader from "@/components/Loader";
import { FaFlagCheckered, FaTruckLoading } from "react-icons/fa";
import { MdOutlineKeyboardDoubleArrowUp } from "react-icons/md";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { IListadoDeCargaView, IRutaConductorView } from "@/types/types";

export default function InformacionDeCarga({
    rutaDespacho,
    estado
}: {
    rutaDespacho: IRutaConductorView;
    estado: number;
}) {
    const queryClient = useQueryClient();
    const { data: listaDeCarga, isLoading: loadingListaDeCarga } = useQuery<IListadoDeCargaView>({
        queryKey: ['listado-en-preparacion'],
        queryFn: async () => {
            if(!rutaDespacho) return { encargado: '', cilindros: [] };
            const response = await fetch(`/api/conductor/listadoDeCarga?rutaId=${rutaDespacho.id}`);
            const data = await response.json();
            console.log("CARGA-vehiculo", {...data});
            return {...data};
        },
        enabled: !!rutaDespacho
    });

    const mutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/pedidos/despacho/confirmarOrden", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al confirmar la carga");
            }
            return await response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success("Carga confirmada correctamente");
                queryClient.invalidateQueries({ queryKey: ['ruta-despacho-conductor'] });
                queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho.id] });                
            } else {
                toast.error(data.error || "Error al confirmar la carga");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Error de conexión al confirmar la carga");
        }
    });

    const handleCargaConfirmada = () => {
        mutation.mutate();
    };

    return (<div className="border rounded-t-xl shadow-lg bg-white px-2 pt-2">
        <MdOutlineKeyboardDoubleArrowUp className="text-gray-400 mx-auto -mt-1 mb-1" style={{ transform: "scaleX(6)" }} />


        {!loadingListaDeCarga && rutaDespacho && estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && <div className="py-4 text-center">
            <div className="flex text-blue-500 flex-row items-center justify-center space-x-4">
                <FaTruckLoading size="3.2rem"/>
                <p className="py-4 font-bold">EN PROCESO<br/>DE CARGA</p>
            </div>
            <p className="mx-auto my-4 px-4">{listaDeCarga?.encargado} esta cargando. Pronto podrás iniciar tu viaje.</p>
        </div>}


        {!loadingListaDeCarga &&rutaDespacho && estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada && <div className="w-full">
            <p className="text-center text-xl font-bold">Confirma{`${mutation.isPending ? 'ndo' : ''}`} la carga</p>
            <div className="flex flex-col md:flex-row px-4 py-2">
                <div className="w-full md:w-1/3">
                    <div className="flex flex-wrap text-gray-700 text-md">
                        {listaDeCarga && listaDeCarga.cilindros.map((item, idx) => (
                            <div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                <b>{item.multiplicador}</b>x {item.elemento.toUpperCase()} {item.cantidad}{item.unidad}
                                {item.sin_sifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                {item.es_industrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <button className={`w-full text-center h-10 px-4 bg-green-400 text-white rounded-lg shadow-md cursor-pointer mb-4 ${mutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={handleCargaConfirmada}
                disabled={mutation.isPending}>
                {mutation.isPending
                    ? <div className="mt-0"><Loader texto="CONFIRMANDO" /></div>
                    : <div className="flex justify-center"><FaFlagCheckered className="mt-1 mr-3" /><span className="mt-0">CONFIRMAR CARGA</span></div>}
            </button>
        </div>}

        {loadingListaDeCarga && <div className="py-4">
            <Loader texto="Cargando información de carga" />
        </div>}
    </div>);
}
