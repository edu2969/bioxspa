import { FaRoadCircleCheck } from "react-icons/fa6";
import { IItemDeCargaView, IListadoDescargaView, IRutaConductorView } from "@/types/types";
import { TIPO_ORDEN } from "@/app/utils/constants";
import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";
import { BsQrCodeScan } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNUCode } from "@/lib/nuConverter";
import Loader from "../Loader";
import QuienRecibeModal from "../modals/QuienRecibeModal";

const getVentaActual = (ruta: IRutaConductorView) => {
    const tramoActual = ruta.tramos[ruta.tramos.length - 1];
    if (!tramoActual) return null;
    return tramoActual;
}

export default function GestorDeDescarga({
    rutaDespacho,
    setScanMode
}: {
    rutaDespacho: IRutaConductorView,
    setScanMode: (mode: boolean) => void
}) {
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const temporalRef = useRef<HTMLInputElement>(null);
    const [showModalNombreRetira, setShowModalNombreRetira] = useState(false);
    const [listaDescargaLocal, setListaDescargaLocal] = useState<IListadoDescargaView | null>(null);
    const queryClient = useQueryClient();

    // Mutación para descargar cilindros individuales
    const mutation = useMutation({
        mutationFn: async (codigo: string) => {
            const response = await fetch('/api/cilindros/descargar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id,
                    codigo
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al descargar cilindro');
            }

            return await response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success(`Cilindro ${data.codigo} descargado correctamente`);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al descargar cilindro');
        }
    });

    // Metación para confirmar la descarga completa
    const confirmarDescargaMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/conductor/confirmarDescarga', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id
                })
            });
        },
        onSuccess: () => {
            toast.success('Descarga confirmada correctamente');
            queryClient.invalidateQueries({ queryKey: ['estado-ruta-conductor', rutaDespacho._id] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al confirmar descarga');
        }
    });

    const { data: listaDeDescarga, isLoading: loadingListaDeDescarga } = useQuery<IListadoDescargaView>({
        queryKey: ['listado-descarga-vehiculo'],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/listadoDeDescarga?rutaId=${rutaDespacho._id}`);
            const data = await response.json();
            console.log("DESCARGA-vehiculo", data);
            setListaDescargaLocal(data);
            return data;
        },
        enabled: !!rutaDespacho
    });

    const isReady = () => {
        return listaDeDescarga !== undefined && listaDeDescarga.cilindros.every((item: IItemDeCargaView) => item.restantes === 0);
    };

    const loadState = () => {
        if (!listaDeDescarga) {
            return { complete: false, porcentaje: 0 };
        }
        const totalItems = listaDeDescarga.cilindros.length;
        const completedItems = listaDeDescarga.cilindros.filter(item => item.restantes === 0).length;
        const porcentaje = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
        return {
            complete: completedItems === totalItems,
            partial: completedItems > 0 && completedItems < totalItems,
            porcentaje
        };
    };

    return (<div className="flex flex-col w-full">

        <div className="w-full">
            {(() => {
                const cliente = getVentaActual(rutaDespacho)?.cliente;
                const ventaActual = getVentaActual(rutaDespacho);
                return (
                    <div className="mx-4 flex items-center justify-between px-2 py-1 border border-gray-300 rounded-lg bg-white">
                        <div className="w-full">
                            <p className="text-md text-blue-700 font-bold truncate">{cliente?.nombre || "Sin cliente"}</p>
                            {ventaActual?.tipo === TIPO_ORDEN.traslado
                                ? <div className="text-sm font-bold text-gray-700">
                                    <p>RETIRO DE CILINDROS</p>
                                    <span className="text-xs">Escanee cilindros a retirar</span>
                                </div>
                                : <p className="text-sm font-bold text-gray-700">+{cliente?.telefono || "Sin giro"}</p>}
                        </div>

                        {listaDeDescarga && <div className={`relative flex justify-end ${ventaActual?.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                            <div className="mr-2 cursor-pointer mt-0" onClick={(e) => {
                                e.stopPropagation();
                                toast(`${ventaActual?.comentario || "Sin comentarios"}`, { icon: '💬' });
                            }}>
                                {!ventaActual?.comentario
                                    ? <VscCommentDraft size="1.75rem" />
                                    : <VscCommentUnresolved size="1.75rem" />}
                            </div>
                            {ventaActual?.comentario && <div className="absolute top-[16px] right-[11px] w-[10px] h-[10px] rounded-full bg-red-600"></div>}
                        </div>}

                    </div>
                );
            })()}
        </div>

        <ul className="flex flex-wrap items-center justify-center mt-2 mb-24 pl-3 pr-2 overflow-y-scroll overflow-x-visible">
            {!loadingListaDeDescarga && listaDescargaLocal && listaDescargaLocal.cilindros.map((item: IItemDeCargaView, idx: number) => (
                <li
                    key={`item_${idx}`}
                    className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && listaDescargaLocal.cilindros.length != 1) ? 'rounded-t-lg' :
                        (idx === listaDescargaLocal.cilindros.length - 1 && listaDescargaLocal.cilindros.length != 1) ? 'rounded-b-lg' :
                            listaDescargaLocal.cilindros.length === 1 ? 'rounded-lg' : ''
                        } ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' :
                            item.restantes < item.multiplicador ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'
                        } transition duration-300 ease-in-out`}
                >
                    <div className="w-full flex items-left">
                        <div className="flex">
                            <div>
                                <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(item.elemento)}</div>
                                {item.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                {item.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                            </div>
                            <div className="font-bold text-xl ml-2 mt-[3px]">
                                {item.elemento && <span>
                                    {(() => {
                                        const elem = item.elemento;
                                        let match = elem.match(/^([a-zA-Z]*)(\d*)$/);
                                        if (!match) {
                                            match = ["", (elem ?? 'N/A'), ''];
                                        }
                                        const [, p1, p2] = match;
                                        return (
                                            <>
                                                {p1 ? p1.toUpperCase() : ''}
                                                {p2 ? <small>{p2}</small> : ''}
                                            </>
                                        );
                                    })()}
                                </span>}
                            </div>
                        </div>
                        <p className="text-2xl orbitron ml-2"><b>{item.cantidad}</b> <small>{item.unidad}</small></p>
                    </div>
                    <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">
                        {item.multiplicador - item.restantes} <small>/</small> {item.multiplicador}
                    </div>
                </li>
            ))}
        </ul>        

        {inputTemporalVisible && <div className="absolute bottom-3 w-full px-4 text-center pt-2">
            <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
            <input
                ref={temporalRef}
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        console.log("Código temporal ingresado:", e.currentTarget.value);
                        setInputTemporalVisible(false);
                        e.currentTarget.value = '';
                    }
                }}
            />
        </div>}

        {!inputTemporalVisible && <div className="absolute -bottom-1 flex flex-col w-full px-4 -left-1">
            <div className="w-full flex">
                <button className={`text-white mx-2 h-12 w-12 flex text-sm border border-gray-300 rounded-lg p-1 mb-1 bg-blue-500`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setScanMode(true);
                    }}>
                    <BsQrCodeScan className="text-4xl" />
                </button>
                <button className={`relative w-full h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${isReady() && loadState().complete ? 'bg-green-500 cursor-pointer' : isReady() && loadState().partial ? 'bg-yellow-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                    onClick={() => {
                        if (!isReady()) {
                            toast.error('El cargamento no está listo para confirmar');
                            return;
                        }
                        confirmarDescargaMutation.mutate();
                    }}
                    disabled={!isReady()}>
                    <FaRoadCircleCheck className="text-4xl pb-0" />
                    <p className="ml-2 mt-2 text-md font-bold">
                        {!isReady() ? 'No está listo' : loadState().complete ? 'Descarga completa' : 'Descarga no iniciada'}
                    </p>
                    {confirmarDescargaMutation.isPending && <div className="absolute w-full top-0">
                        <div className="w-full h-12 bg-gray-100 opacity-80"></div>
                        <div className="absolute top-2 w-full"><Loader texto="" /></div>
                    </div>}
                </button>
            </div>
            <div className="flex items-center w-full mb-2 px-2">
                <div className="flex-1 h-4 bg-gray-300 rounded overflow-hidden">
                    <div
                        className="h-4 bg-green-500"
                        style={{ width: `${loadState().porcentaje}%` }}
                    ></div>
                </div>
                <div className="ml-2 w-12 text-right font-bold text-gray-400 orbitron">
                    {loadState().porcentaje}%
                </div>
            </div>
        </div>}        

        {showModalNombreRetira && 
        <QuienRecibeModal
            rutaId={rutaDespacho._id}
            onClose={() => setShowModalNombreRetira(false)}
        />}

    </div>);
}