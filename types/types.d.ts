import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { IDireccion } from "./direccion";

export interface IPedidoPorAsignar {
    _id: string;
    tipo: number;
    comentario: string;
    clienteId: string;
    clienteNombre: string;
    clienteRut: string;
    estado: number;
    despachoEnLocal: boolean;
    fecha: Date;
    items: Array<{
        _id: string;
        ventaId: string;
        subcategoriaCatalogoId: string;
        cantidad: number;
        precio: number;
        nombre: string;
    }>;
}

export interface IPedidoConductor {
    _id: string;
    tipo: number;
    estado: number;
    fecha: Date;
    nombreCliente: string;
    rutCliente: string;
    comentario: string;
    retiroEnLocal?: boolean;
    items: {
        _id: string;
        ventaId: string;
        subcategoriaCatalogoId: string;
        cantidad: number;
        precio: number;
        nombre: string;
    }[];
}

export interface IConductoresResponse {
    _id: string;
    nombre: string;
    pedidos: IPedidoConductor[];
    checklist: boolean;
}

export interface IRutasEnTransitoResponse {    
    rutaId: string;
    estado: number;
}

export interface IRutaEnTransito {
    rutaId: string;
    direccionDestino: string;
    nombreChofer: string;
}

export interface IVentaEnTransito {
    ventaId: string;
    tipo: number;
    estado: number;
    fecha: Date;
    nombreCliente: string;
    telefonoCliente: string;
    comentario?: string;
    detalles: Array<{
        multiplicador: number;
        cantidad: number;
        elemento: string;
        unidad: string;
        esIndustrial: boolean;
        esMedicinal: boolean;
        sinSifon: boolean;
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
    _id?: string;
    nombre: string;
    unidad?: string;
    cantidad?: number;
    sinSifon?: boolean;
    categoriaCatalogoId: {
        _id?: string;
        nombre: string;
        tipo?: number;
        gas?: string;
        elemento?: string;
        esIndustrial?: boolean;
    };
}

export interface ICargaDespachoView {
    rutaId: string | null;
    ventas: Array<{
        ventaId: string;
        tipo: number;
        fecha: Date;
        detalles: Array<{
            multiplicador: number;
            restantes: number;
            itemCatalogoIds: string[];
            subcategoriaCatalogoId: ISubcategoriaCatalogoPoblado;
        }>;
        comentario: string | null;
        cliente: {
            nombre: string | null;
            rut?: string | null;
            direccion?: string | null;
            telefono?: string | null;
            direccionesDespacho: Array<{
                nombre: string | null;
                direccionId: string | null;
                latitud: number | null;
                longitud: number | null;
            }>;
        };
        entregasEnLocal: Array<{
            nombreRecibe: string | null;
            rutRecibe: string | null;
            createdAt: Date;
        }>
    }>;
    nombreChofer: string | null;
    patenteVehiculo: string | null;
    fechaVentaMasReciente: Date | null;
    cargaItemIds: Array<{
        _id: string;
        subcategoriaCatalogoId: string;
    }>;
    estado: number | null;
    retiroEnLocal?: boolean;
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
    _id: string;
    subcategoriaCatalogoId: string;
    cantidad: number;
    unidad: string;
    nombreGas: string;
    sinSifon: boolean;
    elemento: string;
    esIndustrial: boolean;
    esMedicinal: boolean;
    vencido: boolean;
}

export interface IItemCatalogoView extends ICilindroView {
    codigo: string;
}

export interface ITramoView {
    tipo: number; // TIPO_ORDEN
    fechaArribo: Date | null;    
    cliente: {
        nombre: string;
        telefono: string;
        direccion: IDireccion;
    },
    comentario?: string;
    quienRecibe?: string;
    rutRecibe?: string;
}

export interface IListadoDescargaView {
    cilindros: ICilindroView[];
}

export interface IRutaConductorView {
    _id: string;
    tramos: ITramoView[];
}

export interface IVehiculoView {
    vehiculoId: string;
    patente: string;
    marca: string;
    modelo: string;
}

export interface IDestinoDisponible {
    direccionId: string;
    nombreCliente: string;
    glosaDireccion: string;
}