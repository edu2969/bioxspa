"use client";

import { TIPO_ESTADO_VENTA, TIPO_ORDEN } from '@/app/utils/constants';
import { useQuery } from '@tanstack/react-query';
import Loader from '../Loader';
import { IEnTransitoResponse } from '@/types/types';
import VehicleView from '../prefabs/VehicleView';
import { useRef } from 'react';
import { BsGeoAltFill } from 'react-icons/bs';
import { FaRegCheckCircle } from 'react-icons/fa';
import { FaTruckFast } from 'react-icons/fa6';
import { VscCommentDraft, VscCommentUnresolved } from 'react-icons/vsc';
import { IVehicleView } from '../prefabs/types';
import { useDroppable } from '@dnd-kit/core';

export default function EnTransito({ sucursalId, setShowCommentModal } : {
    sucursalId: string;
    setShowCommentModal: (value: boolean) => void;
}) {
    const vehicleContainerRef = useRef<HTMLDivElement>(null);
    const { setNodeRef, isOver } = useDroppable({
        id: 'en-transito',
    });

    const vehiculoDefecto: IVehicleView = {
        vehicleId: "",
        patente: "XXX000",
        marca: "Desconocido",
        modelo: "Desconocido",
        estado: 0,
        cargados: [{
            elementos: "",
            peso: 0,
            altura: 0,
            radio: 0,
            sinSifon: false,
            esIndustrial: false,
            esMedicinal: false,
            estado: 0,
        }],
        descargados: [{
            elementos: "",
            peso: 0,
            altura: 0,
            radio: 0,
            sinSifon: false,
            esIndustrial: false,
            esMedicinal: false,
            estado: 0,
        }]
    }

    const { data: enTransito, isLoading } = useQuery<IEnTransitoResponse[]>({
        queryKey: ['enTransito', sucursalId],
        queryFn: async () => {
            const response = await fetch(`/api/pedidos/asignacion/enTransito?sucursalId=${sucursalId}`);
            if (!response.ok) throw new Error('Failed to fetch enTransito');
            const data = await response.json();
            return data.enTransito;
        }
    });   
    
    const getVehicleView = (rd: IEnTransitoResponse): IVehicleView => {
        if (!enTransito || enTransito.length === 0) return vehiculoDefecto;
        const vehiculo = rd.vehiculoId;

        // CILINDROS CARGADOS: Los que están en cargaItemIds y NO han sido descargados
        // CILINDROS DESCARGADOS: Los que aparecen en itemCatalogoIds de los detalles de venta


        // 1. Obtener todos los IDs descargados desde el historial de carga (esCarga === false)
        const descargadosIds = new Set<string>();
        if (Array.isArray(rd.historialCarga)) {
            rd.historialCarga.forEach(hist => {
                if (!hist.esCarga && Array.isArray(hist.itemMovidoIds)) {
                    hist.itemMovidoIds.forEach(id => descargadosIds.add(String(id)));
                }
            });
        }

        // 2. Mapear los items cargados y descargados
        const cargados = rd.cargaItemIds
            .filter(item => !descargadosIds.has(String(item._id)))
            .map(item => ({
                elementos: item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || "?",
                peso: 0,
                altura: 0,
                radio: 0,
                sinSifon: item.subcategoriaCatalogoId?.sinSifon || false,
                esIndustrial: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false,
                esMedicinal: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esMedicinal || false,
                estado: rd.estado,
            }));

        const descargados = rd.cargaItemIds
            .filter(item => descargadosIds.has(String(item._id)))
            .map(item => ({
                elementos: item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || "?",
                peso: 0,
                altura: 0,
                radio: 0,
                sinSifon: item.subcategoriaCatalogoId?.sinSifon || false,
                esIndustrial: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false,
                esMedicinal: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esMedicinal || false,
                estado: rd.estado,
            }));

        return {
            vehicleId: vehiculo?._id,
            patente: vehiculo?.patente || "XXX000",
            marca: vehiculo?.marca || "Desconocido",
            modelo: vehiculo?.modelo || "Desconocido",
            estado: rd.estado,
            cargados,
            descargados,
        };
    }

    return (
        <div 
            ref={setNodeRef}
            className={`relative col-span-5 border rounded-lg p-4 bg-blue-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden pt-12 transition-colors duration-200 ${
                isOver ? 'bg-blue-100 border-blue-300' : ''
            }`}
        >
            <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                EN TRÁNSITO ({enTransito?.length || "-"})
            </div>
            {isLoading ? <Loader texto="Cargando flota..." /> : !enTransito?.length ? (
                <div className="flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
                    <p className="text-gray-500 text-lg font-semibold">NADIE EN RUTA</p>
                </div>
            ) : enTransito.map((rd, index) => (
                <div className="w-full border rounded-lg bg-gray-100 shadow-md mb-4 pt-4" key={`ruta_${index}`}>
                    <div className="flex">
                        <div className="w-1/2" ref={vehicleContainerRef}>
                            <VehicleView vehicle={getVehicleView(rd)} />
                            <div className="flex mb-2">
                                <BsGeoAltFill size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                <p className="text-xs text-gray-500 ml-2">{(rd.ruta && rd.ruta[rd.ruta.length - 1].direccionDestinoId?.nombre) || '??'}</p>
                            </div>
                        </div>
                        <div className="w-1/2">
                            <div className="w-full">
                                <p className="text-xs">Conductor</p>
                                <p className="text-lg uppercase font-bold -mt-1 mb-2">{rd.choferId?.name}</p>
                                {rd.ventaIds.map((venta, idxVenta) => (
                                    <div key={venta._id || idxVenta} className={`border rounded-lg mb-2 pl-2 pr-6 py-1 shadow ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'border-green-500 bg-green-50' : 'border-blue-400 bg-white/80'} min-h-12`}>
                                        <div className={`flex font-bold text-xs mb-1 ${venta.estado === TIPO_ESTADO_VENTA.entregado ? 'text-green-600' : 'text-blue-700'}`}>
                                            {venta.estado === TIPO_ESTADO_VENTA.entregado && <FaRegCheckCircle size="1rem" />}
                                            {venta.estado === TIPO_ESTADO_VENTA.reparto && <FaTruckFast size="1rem" />}
                                            <div className="w-full">
                                                <p className="uppercase pr-10 w-11/12 pl-1">{venta.clienteId?.nombre || "Desconocido"}</p>
                                                {venta.tipo === TIPO_ORDEN.traslado && <span className="text-xs text-blue-800 rounded-sm bg-blue-200 px-2 ml-2 font-bold">RETIRO DE CILINDROS</span>}
                                            </div>
                                            <div className={`${venta.comentario ? 'text-blue-500 ' : 'text-gray-500 '} w-1/12`}>
                                                <div className="relative">
                                                    <div className="mr-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowCommentModal(true); }}>
                                                        {!venta.comentario ? <VscCommentDraft size="2.5rem" /> : <VscCommentUnresolved size="2.5rem" />}
                                                    </div>
                                                    {venta.comentario && <div className="absolute top-[22px] left-[22px] w-[15px] h-[15px] rounded-full bg-red-600"></div>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap -mt-6">
                                            {Array.isArray(venta.detalles) && venta.detalles.filter(detalle => rd.cargaItemIds.some(item => String(item.subcategoriaCatalogoId?._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId._id || detalle.subcategoriaCatalogoId))).map((detalle, idxDetalle) => {
                                                const carga = rd.cargaItemIds.find(item => String(item.subcategoriaCatalogoId?._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId._id || detalle.subcategoriaCatalogoId));
                                                const sub  = carga?.subcategoriaCatalogoId || {                                                    
                                                    esIndustrial: false,
                                                    sinSifon: false,
                                                    cantidad: 0,
                                                    unidad: "",
                                                    categoriaCatalogoId: {
                                                        _id: "",
                                                        elemento: "?",
                                                        esIndustrial: false,
                                                        esMedicinal: false
                                                    }                                                    
                                                };
                                                const cat = sub.categoriaCatalogoId || {
                                                    _id: "",
                                                    elemento: "?",
                                                    esIndustrial: false,
                                                    esMedicinal: false
                                                };
                                                return (
                                                    <div key={idxDetalle} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1 flex items-center bg-blue-50">
                                                        <b>{detalle.cantidad}</b>x {cat.elemento?.toUpperCase() || "?"} {sub.cantidad}{sub.unidad}
                                                        {sub.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                                        {cat.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                                        {cat.esMedicinal && <span className="bg-green-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">MED</span>}
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
            ))}
        </div>
    );
}


/*

const offsetByModel = useMemo(() => (vehiculo: IVehiculo) => {
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        if (!marca || !modelo) return { baseTop: 28, baseLeft: 76, scaleFactor: 1.5, verticalIncrement: 4 };
        const offsets = {
            "hyundai_porter": [-8, 32, 1.5], "ford_ranger": [-28, 106, 1.5], "mitsubishi_l200": [28, 76, 1.5],
            "volkswagen_constellation": [28, 76, 1.5], "volkswagen_delivery": [28, 76, 1.5], "kia_frontier": [28, 76, 1.5],
            "ford_transit": [28, 76, 1.5], "desconocido_desconocido": [28, 76, 1.5],
        };
        const data = offsets[(marca + "_" + modelo) as keyof typeof offsets] || offsets["desconocido_desconocido"];
        return { baseTop: data[0], baseLeft: data[1], scaleFactor: data[2] };
    }, []);

    const sizeByModel = useMemo(() => (vehiculo: IVehiculo) => {
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        if (!marca || !modelo) return { width: 247, height: 191 };
        const sizes = { "hyundai_porter": [247, 173], "ford_ranger": [300, 200], "mitsubishi_l200": [247, 191],
            "volkswagen_constellation": [300, 200], "volkswagen_delivery": [300, 200], "kia_frontier": [247, 191],
            "ford_transit": [300, 200], "desconocido_desconocido": [247, 191] };
        const size = sizes[(marca + "_" + modelo) as keyof typeof sizes] || sizes["desconocido_desconocido"];
        return { width: size[0], height: size[1] };
    }, []);

    const calculateTubePosition = (vehiculo: IVehiculo, index: number) => {
        const offsets = offsetByModel(vehiculo);
        const baseTop = offsets.baseTop, baseLeft = offsets.baseLeft, verticalIncrement = 5;
        const top = baseTop + Number(!(index % 2)) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement;
        const left = baseLeft + Number(!(index % 2)) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 2;
        return { top, left, width: '14px', height: '78px' };
    };

    const calculateUploadTubePosition = (index: number) => {
        const baseTop = 86, baseLeft = 96, verticalIncrement = 3.2;
        const top = baseTop + Number(!(index % 2)) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement;
        const left = baseLeft + Number(!(index % 2)) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 2;
        return { top, left, width: '14px', height: '78px' };
    };

    const getCilindrosDescarga = (ruta: IRutaDespacho):string[] => {
        if (!ruta || !Array.isArray(ruta.ventaIds) || !Array.isArray(ruta.ruta) || ruta.ruta.length === 0) return [];
        const ultimaDireccionId = ruta.ruta[ruta.ruta.length - 1].direccionDestinoId?._id || ruta.ruta[ruta.ruta.length - 1].direccionDestinoId;
        const venta = ruta.ventaIds.find((v) =>
            typeof v === "object" &&
            v !== null &&
            "detalles" in v &&
            Array.isArray(v.detalles) &&
            v.detalles.some(
                (p: IDetalleVenta) => (p as any).direccionDespachoId === String(ultimaDireccionId)
            )
        ) as IVenta | undefined;
        if (!venta || !Array.isArray(venta.detalles)) return [];
        const elementos: string[] = [];
        venta.detalles.forEach(detalle => {
            const cantidad = Number(detalle.cantidad) || 0;
            let elemento = null;
            const carga = Array.isArray(ruta.cargaItemIds)
                ? ruta.cargaItemIds.find(
                    (item) =>
                        typeof item === "object" &&
                        item !== null &&
                        "subcategoriaCatalogoId" in item &&
                        String((item as any).subcategoriaCatalogoId?._id || (item as any).subcategoriaCatalogoId) ===
                        String(detalle.subcategoriaCatalogoId?._id || detalle.subcategoriaCatalogoId)
                )
                : null;
            if (
                carga &&
                typeof carga === "object" &&
                "subcategoriaCatalogoId" in carga &&
                (carga as any).subcategoriaCatalogoId &&
                (carga as any).subcategoriaCatalogoId.categoriaCatalogoId
            ) {
                elemento = (carga as any).subcategoriaCatalogoId.categoriaCatalogoId.elemento;
            }
            else if (
                detalle.subcategoriaCatalogoId &&
                typeof detalle.subcategoriaCatalogoId === "object" &&
                "categoriaCatalogoId" in detalle.subcategoriaCatalogoId &&
                (detalle.subcategoriaCatalogoId as any).categoriaCatalogoId
            ) {
                elemento = (detalle.subcategoriaCatalogoId as any).categoriaCatalogoId.elemento;
            }
            else elemento = "?";
            for (let i = 0; i < cantidad; i++) elementos.push(elemento);
        });
        return elementos;
    };

    const getVentaActual = (rd: IRutaDespacho) => {
        if (!rd || !Array.isArray(rd.ruta) || rd.ruta.length === 0 || !Array.isArray(rd.ventaIds)) return null;
        const index = rd.ruta.findIndex(r => r.fechaArribo === null);
        const lastDireccionId = rd.ruta[index != -1 ? index : rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
        const venta = rd.ventaIds.find(v => (v.direccionDespachoId && (v.direccionDespachoId as IDireccion))._id === lastDireccionId);
        return venta;
    };

    const cargaActual = (rutaDespacho: IRutaDespacho): ICargaActual[] => {
        if (!rutaDespacho || !Array.isArray(rutaDespacho.cargaItemIds)) return [];
        let venta = getVentaActual(rutaDespacho);
        const descargados = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1]?.itemMovidoIds || [];
        const estadoRuta = rutaDespacho.estado;
        return rutaDespacho.cargaItemIds.map(item => ({
            elemento: ((item.subcategoriaCatalogoId as ISubcategoriaCatalogo).categoriaCatalogoId as ICategoriaCatalogo).elemento, 
            entregado: descargados.some(id => id === item._id) && (estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada),
            descargando: (rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga) && venta && venta.detalles.some(det => String(det.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId._id)),
            cargado: venta && venta.tipo === TIPO_ORDEN.traslado && descargados.some(id => id === item._id) && (estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada)            
        }));
    };

    const imagenVehiculo = (vehiculo: IVehiculo) => {
        const defecto = { url: "desconocido_desconocido", width: 247, height: 191 };
        if (!vehiculo) return defecto;
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        const imagen = `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase();
        return { 
            url: imagen, ...sizeByModel(vehiculo) 
        } || defecto;
    };

    const getTextoEstado = (ruta: IRutaDespacho) => {
        if (!ruta) return "OTRO";
        return ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? 'EN RUTA' : getVentaActual(ruta)?.tipo === TIPO_ORDEN.traslado ? 'RETIRANDO' : (ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga || ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada) ? 'DESCARGA' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.carga ? 'CARGA' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada ? 'CARGA CONFIRMADA' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso ? 'REGRESANDO' : ruta.estado == TIPO_ESTADO_RUTA_DESPACHO.terminado ? 'TERMINADO' : 'OTRO';
    }  
    
    const getOpacityEstanque = useCallback((index) => {
        return index == 99;
    }, []);

    */