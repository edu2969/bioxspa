import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { IDireccion } from "./direccion";
import { IVentaView } from "@/components/prefabs/types";

export interface IPedidoPorAsignar {
    id: string;
    tipo: number;
    comentario: string;
    clienteId: string;
    clienteNombre: string;
    clienteRut: string;
    estado: number;
    despachoEnLocal: boolean;
    fecha: Date;
    items: Array<{
        id: string;
        ventaId: string;
        subcategoriaCatalogoId: string;
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
    nombreCliente: string;
    rutCliente: string;
    comentario: string;
    retiroEnLocal?: boolean;
    items: {
        id: string;
        ventaId: string;
        subcategoriaCatalogoId: string;
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
    id?: string;
    nombre: string;
    unidad?: string;
    cantidad?: number;
    sinSifon?: boolean;
    categoriaCatalogoId: {
        id?: string;
        nombre: string;
        tipo?: number;
        gas?: string;
        elemento?: string;
        esIndustrial?: boolean;
    };
}

export interface ICargaDespachoVentaView {
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
    direccionesDespacho: Array<{
        id: string | null;
        direccionCliente: string | null;
        latitud: number | null;
        longitud: number | null;
    }>;
    entregasEnLocal: Array<{
        nombreRecibe: string | null;
        rutRecibe: string | null;
        createdAt: Date;
    }>;
}

export interface ICargaDespachoClienteView {
    cliente: {
        id: string | null;
        nombre: string | null;
        rut?: string | null;
        telefono?: string | null;
    };
    ventas: ICargaDespachoVentaView[];
}

export interface ICargaDespachoView {
    rutaDespachoId: string | null;
    clientes: ICargaDespachoClienteView[];
    nombreChofer: string | null;
    patenteVehiculo: string | null;
    fechaVentaMasReciente: Date | null;
    cargaItemIds: Array<{
        id: string;
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
    id: string;
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

export interface IDestinoView {
    tipo: number; // TIPO_ORDEN
    fechaArribo: Date | null;
    direccion: IDireccion;
    comentario?: string;
    quienRecibe?: string;
    rutRecibe?: string;
    nombreCliente?: string;
}

export interface IRutaConductorView {
    id: string;
    estado: number;
    ventas: IVentaView[];
    destinos: IDestinoView[];
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
    direccionCliente: string;
}