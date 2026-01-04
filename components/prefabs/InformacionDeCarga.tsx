import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import Loader from "@/components/Loader";
import { FaFlagCheckered, FaTruckLoading } from "react-icons/fa";
import { MdOutlineKeyboardDoubleArrowUp } from "react-icons/md";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { IListadoDescargaView, IRutaConductorView } from "@/types/types";

type IResumenCargaItem = {
    subcategoriaCatalogoId: string;
    cantidad: number;
    unidad: string;
    sinSifon: boolean;
    esIndustrial: boolean;
    esMedicinal: boolean;
    elemento: string;
    multiplicador: number;
    restantes: number;
}

export default function InformacionDeCarga({
    rutaDespacho,
    estado
}: {
    rutaDespacho: IRutaConductorView;
    estado: number;
}) {
    const { data: listaDeDescarga, isLoading: loadingListaDeDescarga } = useQuery<IListadoDescargaView>({
        queryKey: ['listado-descarga-en-preparacion'],
        queryFn: async () => {
            if(!rutaDespacho) return { encargado: '', cilindros: [] };
            const response = await fetch(`/api/conductor/listadoDeDescarga?rutaId=${rutaDespacho._id}`);
            const data = await response.json();
            console.log("DESCARGA-vehiculo", {...data});
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


        {rutaDespacho && estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && <div className="py-4 text-center">
            <div className="flex text-blue-500 flex-row items-center justify-center space-x-4">
                <FaTruckLoading size="3.2rem"/>
                <p className="py-4 font-bold">EN PROCESO<br/>DE DESCARGA</p>
            </div>
            <p className="mx-auto my-4 px-4">{listaDeDescarga?.encargado} esta cargando. Pronto podrás iniciar tu viaje.</p>
        </div>}


        {rutaDespacho && estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada && <div className="w-full">
            <p className="text-center text-xl font-bold">CONFIRMA{`${mutation.isPending ? 'NDO' : ''}`} LA CARGA</p>
            <div className="flex flex-col md:flex-row px-4 py-2">
                <div className="w-full md:w-1/3">
                    <div className="flex flex-wrap text-gray-700 text-md">
                        {listaDeDescarga && listaDeDescarga.cilindros.map((item, idx) => (
                            <div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                <b>{item.multiplicador}</b>x {item.elemento.toUpperCase()} {item.cantidad}{item.unidad}
                                {item.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                {item.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
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

        {loadingListaDeDescarga && <div className="py-4">
            <Loader texto="Cargando información de carga" />
        </div>}
    </div>);
}
