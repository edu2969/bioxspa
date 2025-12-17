import { ICliente } from "@/types/cliente";
import { IDireccion } from "@/types/direccion";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { Types } from "mongoose";

export interface ICilindro {
    elementos: string;
    peso: number;
    altura: number;
    radio: number;
    sinSifon: boolean;
    esIndustrial: boolean;
    esMedicinal: boolean;
    estado: number;
}

interface IRutasConductorResponse {
    rutaDespacho: IRutaDespacho | null;
    vehiculos: Array<{
        _id: string;
        temporalId: string;
        patente: string;
        marca: string;
        modelo: string;
        nmotor: string;
        numeroChasis: string;
        ano: string;
        empresaId: string;
        revisionTecnica: string;
        fechaVencimientoExtintor: string | null;
        direccionDestinoId: string;
        choferIds: string[];
        posicionActual: {
            latitud: number | null;
            longitud: number | null;
        };
        createdAt: string;
        updatedAt: string;
        __v: number;
    }>;
    ok: boolean;
}

export interface IVehicleView {
    vehicleId: string;
    patente: string;
    marca: string;
    modelo: string;
    estado: number;
    cargados: ICilindro[];
    descargados: ICilindro[];
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

export interface IChecklistModalProps {
    onFinish: (kilometros?: number, data: IChecklistAnswer[]) => void;
    tipo: 'personal' | 'vehiculo';
    vehiculos?: {
        _id: string;
        patente: string;
        marca: string;
        modelo: string;
    }[];
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
