import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { IDireccion } from "./direccion";
import { IVentaView } from "@/components/prefabs/types";

export interface IPedidoPorAsignar {
    id: string;
    tipo: number;
    comentario: string;
    cliente_id: string;
    cliente_nombre: string;
    cliente_rut: string;
    estado: number;
    despacho_en_local: boolean;
    fecha: Date;
    items: Array<{
        id: string;
        venta_id: string;
        subcategoria_catalogo_id: string;
        cantidad: number;
        precio: number;
        nombre: string;
    }>;
}

export interface IPedidoConductor {
    id: string;
    tipo: number;
    estado: number;
    fecha: Date;
    nombre_cliente: string;
    rut_cliente: string;
    comentario: string;
    retiro_en_local?: boolean;
    items: {
        id: string;
        venta_id: string;
        subcategoria_catalogo_id: string;
        cantidad: number;
        precio: number;
        nombre: string;
    }[];
}

export interface IConductoresResponse {
    id: string;
    nombre: string;
    pedidos: IPedidoConductor[];
    checklist: boolean;
}

export interface IRutasEnTransitoResponse {    
    ruta_id: string;
    estado: number;
}

export interface IRutaEnTransito {
    ruta_id: string;
    direccion_destino: string;
    nombre_chofer: string;
}

export interface IVentaEnTransito {
    venta_id: string;
    tipo: number;
    estado: number;
    fecha: Date;
    nombre_cliente: string;
    telefono_cliente: string;
    comentario?: string;
    detalles: Array<{
        multiplicador: number;
        cantidad: number;
        elemento: string;
        unidad: string;
        es_industrial: boolean;
        es_medicinal: boolean;
        sin_sifon: boolean;
    }>
}

export interface IHistorialVentaView {
    estado: number;
    fecha: Date;
    duracion: number;
    titulo: string;
    subtitulo?: string;
    descripcion?: string;
}

export interface ISubcategoriaCatalogoPoblado {
    id?: string;
    nombre: string;
    unidad?: string;
    cantidad?: number;
    sin_sifon?: boolean;
    categoria_catalogo_id: {
        id?: string;
        nombre: string;
        tipo?: number;
        gas?: string;
        elemento?: string;
        es_industrial?: boolean;
    };
}

export interface ICargaDespachoView {
    ruta_id: string | null;
    ventas: Array<{
        venta_id: string;
        tipo: number;
        fecha: Date;
        detalles: Array<{
            multiplicador: number;
            restantes: number;
            item_catalogo_ids: string[];
            subcategoria_catalogo_id: ISubcategoriaCatalogoPoblado;
        }>;
        comentario: string | null;
        cliente: {
            nombre: string | null;
            rut?: string | null;
            direccion?: string | null;
            telefono?: string | null;
            direcciones_despacho: Array<{
                nombre: string | null;
                direccion_id: string | null;
                latitud: number | null;
                longitud: number | null;
            }>;
        };
        entregas_en_local: Array<{
            nombre_recibe: string | null;
            rut_recibe: string | null;
            created_at: Date;
        }>;
    }>;
    nombre_chofer: string | null;
    patente_vehiculo: string | null;
    fecha_venta_mas_reciente: Date | null;
    carga_item_ids: Array<{
        id: string;
        subcategoria_catalogo_id: string;
    }>;
    estado: number | null;
    retiro_en_local?: boolean;
}

export interface IListadoDeCargaView {
    encargado: string;
    cilindros: IItemDeCargaView[];
}

export interface IListadoDescargaView {    
    cilindros: IItemDeCargaView[];
}

export interface IItemDeCargaView extends ICilindroView {
    multiplicador: number;
    restantes: number;
}

export interface ICilindroView {
    id: string;
    subcategoria_catalogo_id: string;
    cantidad: number;
    unidad: string;
    nombre_gas: string;
    sin_sifon: boolean;
    elemento: string;
    es_industrial: boolean;
    es_medicinal: boolean;
    vencido: boolean;
}

export interface IItemCatalogoView extends ICilindroView {
    codigo: string;
}

export interface IDestinoView {
    tipo: number; // TIPO_ORDEN
    fecha_arribo: Date | null;
    direccion: IDireccion;
    comentario?: string;
    quien_recibe?: string;
    rut_recibe?: string;
}

export interface IRutaConductorView {
    id: string;
    estado: number;
    ventas: IVentaView[];
    destinos: IDestinoView[];
}

export interface IVehiculoView {
    vehiculo_id: string;
    patente: string;
    marca: string;
    modelo: string;
}

export interface IDestinoDisponible {
    direccion_id: string;
    nombre_cliente: string;
    glosa_direccion: string;
}