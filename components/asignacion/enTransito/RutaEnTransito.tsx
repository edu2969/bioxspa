import { TIPO_ESTADO_VENTA, TIPO_ORDEN } from "@/app/utils/constants";
import VehiculoView from "@/components/prefabs/VehiculoView";
import useVehicleScaling from "@/components/uix/useVehicleScaling";
import { ICilindroView, IRutaEnTransito, IRutasEnTransitoResponse, IVentaEnTransito } from "@/types/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { BsGeoAltFill } from "react-icons/bs";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaTruckFast } from "react-icons/fa6";
import { VscCommentDraft, VscCommentUnresolved } from "react-icons/vsc";

export default function RutaEnTransito({
    rutaId,
    estado,
    index,
    onShowCommentModal
}: {
    rutaId: string,
    estado: number,
    index: number,
    onShowCommentModal: (ventaId: string, comentario?: string | null, onSaveComment?: () => void) => void
}) {
    const vehicleContainerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    
    // Hook de escalado para el vehículo
    const vehicleScaling = useVehicleScaling(vehicleContainerRef);

    // Obtener datos del vehículo para el scaling
    const { data: vehiculo } = useQuery({
        queryKey: ['vehiculo-conductor', rutaId],
        queryFn: async () => {
            if (!rutaId) return null;
            const response = await fetch(`/api/conductor/vehiculoAsignado?rutaId=${rutaId}`);
            const data = await response.json();
            return data.vehiculo;
        },
        enabled: !!rutaId
    });

    const { data: cargados, isLoading: loadingCargados } = useQuery<ICilindroView[]>({
        queryKey: ['carga-vehiculo', rutaId],
        queryFn: async () => {
            if (!rutaId || rutaId === undefined) return [];
            const response = await fetch(`/api/conductor/cilindrosCargados?rutaId=${rutaId}`);
            const data = await response.json();
            console.log("Cilindros cargados en vehículo:", data);
            return data.cilindrosCargados;
        },
        enabled: !!rutaId,
        initialData: []
    });

    const { data: descargados, isLoading: loadingDescargados } = useQuery<ICilindroView[]>({
        queryKey: ['descarga-vehiculo', rutaId],
        queryFn: async () => {
            if (!rutaId || rutaId === undefined) return [];
            const response = await fetch(`/api/conductor/cilindrosDescargados?rutaId=${rutaId}`);
            const data = await response.json();
            console.log("Cilindros descargados en vehículo:", data);            
            return data.cilindrosDescargados;
        },
        enabled: !!rutaId,
        initialData: []
    });

    const { data: rutaEnTransito, isLoading: loadingRutaEnTransito } = useQuery<IRutaEnTransito>({
        queryKey: ['ruta-en-transito', rutaId],
        queryFn: async () => {
            if (!rutaId || rutaId === undefined) return 'Desconocida';
            const response = await fetch(`/api/conductor/rutaEnTransito?rutaId=${rutaId}`);
            const data = await response.json();
            console.log("Ruta en tránsito:", data.rutaEnTransito);
            return data.rutaEnTransito;
        },
        enabled: !!rutaId
    });

    const { data: ventasEnTransito, isLoading: loadingVentasEnTransito } = useQuery<IVentaEnTransito[]>({
        queryKey: ['ventas-en-transito', rutaId],
        queryFn: async () => {
            if (!rutaId || rutaId === undefined) return 0;
            const response = await fetch(`/api/conductor/ventasEnTransito?rutaId=${rutaId}`);
            const data = await response.json();
            return data.ventasEnTransito;
        },
        enabled: !!rutaId
    });

    return (<div className="w-full border rounded-lg bg-gray-100 shadow-md mb-4 pt-4" key={`ruta_${index}`}>
        <div className="flex">
            <div className="flex-1" 
                ref={vehicleContainerRef}
                style={{ 
                    minHeight: vehicleScaling.isReady ? 
                        vehicleScaling.vehicleDimensions.height + 40 : 200 
                }}>
                <VehiculoView
                    rutaId={rutaId}
                    cargados={cargados || []}
                    descargados={descargados || []}
                    ref={vehicleContainerRef}
                />
                <div className="flex mb-2 mt-2">
                    <BsGeoAltFill size="1.25rem" className="text-gray-700 ml-2" />
                    <p className="text-xs text-gray-500 ml-2 truncate">{rutaEnTransito?.direccionDestino}</p>
                </div>
            </div>

            <div className="flex-1 min-w-0 pr-2 mb-2">
                <div className="w-full">
                    <p className="text-xs text-gray-600">Conductor</p>
                    <p className="text-lg uppercase font-bold -mt-1 mb-2 truncate">{rutaEnTransito?.nombreChofer}</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto"> {/* Scroll si hay muchas ventas */}
                    {ventasEnTransito && ventasEnTransito.map((venta, idxVenta) => (
                        <div key={venta.ventaId || idxVenta} className={`border rounded-lg pl-2 pr-6 py-1 shadow transition-all duration-200 ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'border-green-500 bg-green-50' : 'border-blue-400 bg-white/80'} min-h-12`}>
                            <div className={`flex font-bold text-xs mb-1 ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'text-green-600' : 'text-blue-700'}`}>
                                {venta.estado === TIPO_ESTADO_VENTA.entregado && <FaRegCheckCircle size="1rem" className="flex-shrink-0" />}
                                {venta.estado === TIPO_ESTADO_VENTA.reparto && <FaTruckFast size="1rem" className="flex-shrink-0" />}
                                <div className="flex flex-1 min-w-0 px-1 h-10"> {/* Mejor manejo del espacio */}
                                    <p className="uppercase truncate">{venta.nombreCliente || "Desconocido"}</p>
                                    {venta.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-blue-800 rounded-sm bg-blue-200 px-2 font-bold inline-block mt-0.5">RETIRO DE CILINDROS</span>}
                                </div>
                                <div className={`${venta.comentario ? 'text-blue-500 ' : 'text-gray-500 '} flex-shrink-0`}>
                                    <div className="relative">
                                        <div className="cursor-pointer" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                const invalidateQueries = () => {
                                                    queryClient.invalidateQueries({ queryKey: ['ventas-en-transito', rutaId] });
                                                    queryClient.invalidateQueries({ queryKey: ['ruta-en-transito', rutaId] });
                                                };
                                                onShowCommentModal(venta.ventaId, venta.comentario, invalidateQueries); 
                                            }}>
                                            {!venta.comentario ? <VscCommentDraft size="1.5rem" /> : <VscCommentUnresolved size="1.5rem" />}
                                        </div>
                                        {venta.comentario && <div className="absolute top-[14px] left-[14px] w-[8px] h-[8px] rounded-full bg-red-600"></div>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap -mt-6">
                                {venta.detalles.map((detalle, idxDetalle) => {
                                    return (
                                        <div key={idxDetalle} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1 flex items-center bg-blue-50">
                                            <b>{detalle.multiplicador}</b>x {detalle.elemento?.toUpperCase() || "?"} {detalle.cantidad}{detalle.unidad}
                                            {detalle.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                            {detalle.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                            {detalle.esMedicinal && <span className="bg-green-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">MED</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    </div>);
}

