import { IDetalleVenta } from "./detalleVenta";
import { ICliente } from "./cliente";
import { IUser } from "./user";
import { ISucursal } from "./sucursal";
import { IDependencia } from "./dependencia";
import { IDocumentoTributario } from "./documentoTributario";
import { IDireccion } from "./direccion";

export interface IComentarioCobro {
    fecha: Date;
    userId: IUser;
    comentario: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVenta {
    id: string;
    temporalId?: string;
    tipo: number;
    clienteId?: ICliente;
    codigo?: string;
    vendedorId?: IUser;
    sucursalId?: ISucursal;
    dependenciaId?: IDependencia;
    fecha?: Date;
    estado: number;
    porCobrar?: boolean;
    valorNeto?: number;
    valorExento?: number;
    valorIva?: number;
    valorBruto?: number;
    valorTotal?: number;
    numeroDocumento?: string;
    numeroVale?: string;
    saldo?: number;
    documentoTributarioId?: IDocumentoTributario;
    direccionDespachoId: IDireccion | null;
    tasaImpuesto?: number;
    tieneOT?: boolean;
    numeroOrden?: string;
    codigoHES?: string;
    tieneArriendo?: boolean;
    controlEnvase?: string | null;
    medioDespacho?: string;
    numeroTraslado?: string;
    cantidadConsultasSII?: number;
    cantidadReenviosSII?: number;
    comentario?: string;
    comentariosCobro?: IComentarioCobro[];
    historialEstados?: {
        fecha: Date;
        estado: number;
    }[];
    entregasEnLocal?: {
        nombreRecibe: string;
        rutRecibe: string;
        itemCargadoIds: string[];
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    detalles?: IDetalleVenta[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IDetalleVentaView {
    id: string;
    fecha?: Date;
    estado: number;
    porCobrar?: boolean;
    valorNeto?: number;
    valorIva?: number;
    valorTotal?: number;
    vendedor?: {
        id?: string;
        nombre?: string;
        email?: string;
    };
    cliente?: {
        id?: string;
        nombre?: string;
        giro?: string;
        email?: string;
        telefono?: string;
        rut?: string;
    };
    entregasEnLocal?: {
        nombreRecibe: string;
        rutRecibe: string;
        itemCargadoIds: string[];
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    detalles?: {
        id: string;
        glosa?: string;
        codigo?: string;
        codigoCilindro?: string;
        estado: 'Entregado' | 'Pendiente' | 'Devuelto';
        subcategoriaCatalogoId?: {
            id: string;
            nombre?: string;
            cantidad?: number;
            unidad?: string;
            sinSifon?: boolean;
            urlImagen?: string;
            categoriaCatalogoId?: {
                id: string;
                nombre?: string;
                tipo?: string;
                elemento?: string;
                esIndustrial?: boolean;
                esMedicinal?: boolean;
            } | null;
        } | null;
        itemCatalogoIds?: {
            id: string;
            codigo?: string;
            estado?: number;
        }[];
        tipo?: number;
        cantidad?: number;
        especifico?: boolean;
        neto?: number;
        iva?: number;
        total?: number;
    }[];
}
