// types/venta.ts
import { Types } from "mongoose";
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
    _id: Types.ObjectId;
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
    direccionDespachoId: IDireccion;
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
        itemCargadoIds: Types.ObjectId[];
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    detalles?: IDetalleVenta[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IDetalleVentaView {
    _id: Types.ObjectId;
    fecha?: Date;
    estado: number;
    porCobrar?: boolean;
    valorNeto?: number;
    valorIva?: number;
    valorTotal?: number;
    vendedor?: {
        _id?: Types.ObjectId;
        nombre?: string;
        email?: string;
    };
    cliente?: {
        _id?: Types.ObjectId;
        nombre?: string;
        giro?: string;
        email?: string;
        telefono?: string;
        rut?: string;
    };
    entregasEnLocal?: {
        nombreRecibe: string;
        rutRecibe: string;
        itemCargadoIds: Types.ObjectId[];
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    detalles?: {
        _id: Types.ObjectId;
        glosa?: string;
        codigo?: string;
        codigoCilindro?: string;
        estado: 'Entregado' | 'Pendiente' | 'Devuelto';
        subcategoriaCatalogoId?: {
            _id: Types.ObjectId;
            nombre?: string;
            cantidad?: number;
            unidad?: string;
            sinSifon?: boolean;
            urlImagen?: string;
            categoriaCatalogoId?: {
                _id: Types.ObjectId;
                nombre?: string;
                tipo?: string;
                elemento?: string;
                esIndustrial?: boolean;
                esMedicinal?: boolean;
            } | null;
        } | null;
        itemCatalogoIds?: {
            _id: Types.ObjectId;
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
