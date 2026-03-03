import { ICliente } from "@/types/cliente";
import { IDireccion } from "@/types/direccion";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import { Types } from "mongoose";

export interface IVentaView {
    id: string;
    tipo: number;
    estado: number;
    comentario?: string;
    cliente: {
        id: string;
        nombre: string;
        rut: string;
        direccionesDespacho: Array<IDireccion>;
        giro: string;
        telefono: string;
    },
    detalles: Array<{
        id: string;
        multiplicador: number;
        subcategoriaCatalogoId: ICilindroView;
        itemCatalogoIds: Array<IItemCatalogoView>;
    }>;
    direccionDespachoId: IDireccionView | null;
    actual: boolean;
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
    tipo: 'preparacion' | 'retiro_en_local' | 'ot' | 'traslado' | 'otros';
    total_cilindros: number;
    detalles: IDetalleVentaActual[];
    porcentajeCompletado: number;
}

export interface IGestorDeCargaView {
    ventas: IVentaActual[];    
    porcentajeCompletado: number;
}

export interface IClienteSeachResult {
    id: string;
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
    id: string;
    ownerId?: ICliente | null;
    direccionId?: IDireccion | null;
    elemento: string;
    codigo: string;
    subcategoriaCatalogoId: ISubcategoriaCatalogo;
    stockActual: number;
    stockMinimo: number;
    garantiaAnual: number;
    estado: number;
    fechaMantencion?: Date | null;
    direccionInvalida?: boolean;
    direccionEsperada?: {
        id: string;
        nombre: string;
    };
}
