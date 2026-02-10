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
        direcciones_despacho: Array<IDireccion>;
        giro: string;
        telefono: string;
    },
    detalles: Array<{
        id: string;
        multiplicador: number;
        subcategoria_catalogo_id: ICilindroView;
        item_catalogo_ids: Array<IItemCatalogoView>;
    }>;
    direccion_despacho_id: IDireccionView | null;
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
    es_industrial?: boolean;
    sin_sifon?: boolean;
    es_medicinal?: boolean;
}

export interface IVentaActual {
    nombre_cliente: string;
    rut_cliente: string;
    giro_cliente: string;
    comentario?: string;
    tipo: 'preparacion' | 'retiro_en_local' | 'ot' | 'traslado' | 'otros';
    total_cilindros: number;
    detalles: IDetalleVentaActual[];
    porcentaje_completado: number;
}

export interface IGestorDeCargaView {
    ventas: IVentaActual[];    
    porcentaje_completado: number;
}

export interface IClienteSeachResult {
    id: string;
    nombre: string;
    rut: string;
    direcciones_despacho: Array<IDireccion>;
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
    owner_id?: ICliente | null;
    direccion_id?: IDireccion | null;
    elemento: string;
    codigo: string;
    subcategoria_catalogo_id: ISubcategoriaCatalogo;
    stock_actual: number;
    stock_minimo: number;
    garantia_anual: number;
    estado: number;
    fecha_mantencion?: Date | null;
    direccion_invalida?: boolean;
    direccion_esperada?: {
        id: string;
        nombre: string;
    };
}
