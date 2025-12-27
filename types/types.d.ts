import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

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

export interface IEnTransitoResponse {
    _id: mongoose.Types.ObjectId;
    ruta: Array<{
        direccionDestinoId: {
            _id: mongoose.Types.ObjectId;
            nombre: string;
        } | null;
        [key: string]: any;
    }>;
    vehiculoId: {
        _id: mongoose.Types.ObjectId;
        patente: string;
        marca: string;
        modelo: string;
    } | null;
    choferId: {
        _id: mongoose.Types.ObjectId;
        name: string;
    } | null;
    cargaItemIds: Array<{
        _id: mongoose.Types.ObjectId;
        subcategoriaCatalogoId: {
            _id: mongoose.Types.ObjectId;
            cantidad?: number;
            unidad?: string;
            sinSifon?: boolean;
            nombreGas?: string;
            categoriaCatalogoId: {
                _id: mongoose.Types.ObjectId;
                elemento?: string;
                esIndustrial?: boolean;
                esMedicinal?: boolean;
            } | null;
        } | null;
        codigo?: string;
        nombre?: string;
    }>;
    estado: number;
    ventaIds: Array<{
        _id: mongoose.Types.ObjectId;
        clienteId: {
            _id: mongoose.Types.ObjectId;
            nombre: string;
        } | null;
        comentario?: string;
        direccionDespachoId?: mongoose.Types.ObjectId;
        estado: number;
        tipo: number;
        detalles?: Array<{
            _id: mongoose.Types.ObjectId;
            subcategoriaCatalogoId: mongoose.Types.ObjectId;
            cantidad: number;
        }>;
    }>;
    historialCarga?: Array<{
        esCarga: boolean;
        fecha: Date;
        itemMovidoIds: Array<mongoose.Types.ObjectId>;
    }>;
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