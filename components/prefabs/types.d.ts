import { ICliente } from "@/types/cliente";
import { IDireccion } from "@/types/direccion";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { Types } from "mongoose";

export interface IVentaView {
    _id: string;
    tipo: number;
    estado: number;
    comentario?: string;
    cliente: {
        _id: string;
        nombre: string;
        rut: string;
        direccionesDespacho: Array<IDireccion>;
        giro: string;
        telefono: string;
    },
    detalles: Array<{
        _id: string;
        multiplicador: number;
        subcategoriaCatalogoId: ICilindroView;
        itemCatalogoIds: Array<IItemCatalogoView>;
    }>;
    direccionDespachoId: IDireccionView | null;            
}

export interface IDetalleVentaActual {
    tipo: 'cilindro' | 'servicio' | 'insumo' | 'flete';
    descripcion: string;
    cantidad: number;
    restantes: number;
    multiplicador: number;
    unidad: string;
    elemento?: string;
    esIndustrial?: boolean;
    sinSifon?: boolean;
    esMedicinal?: boolean;
}

export interface IVentaActual {
    nombreCliente: string;
    rutCliente: string;
    giroCliente: string;
    comentario?: string;
    tipo: 'preparacion' | 'retiroEnLocal' | 'ot' | 'traslado' | 'otros';
    totalCilindros: number;
    detalles: IDetalleVentaActual[];
    porcentajeCompletado: number;
}

export interface IGestorDeCargaView {
    ventas: IVentaActual[];    
    porcentajeCompletado: number;
}

export interface IClienteSeachResult {
    _id: string;
    nombre: string;
    rut: string;
    direccionesDespacho: Array<IDireccion>;
}

export interface IChecklistAnswer {
    tipo: keyof typeof TIPO_CHECKLIST_ITEM;
    valor: number;
}

export interface IChecklistlistResult {
    tipo: number;
    kilometraje?: string;
    aprobado: boolean;
}

export interface IItemCatalogoPowerScanView {
    _id: Types.ObjectId;
    ownerId?: ICliente | null;
    direccionId?: IDireccion | null;
    elemento: string;
    subcategoriaCatalogoId: string;
    categoriaCatalogoId: string;
    esIndustrial: boolean;
    esMedicinal: boolean;
    sinSifon: boolean;
    cantidad: number;
    unidad: string;
    codigo: string;
    nombre: string;
    descripcion: string;
    descripcionCorta: string;
    stockActual: number;
    stockMinimo: number;
    garantiaAnual: number;
    estado: number;
    destacado: boolean;
    visible: boolean;
    url: string;
    urlImagen: string;
    urlFichaTecnica: string;
    fichaTecnica: string;
    fechaMantencion?: Date | null;
}
