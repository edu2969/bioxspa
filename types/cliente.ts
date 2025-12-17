import { IDireccion } from "./direccion";

export interface IDireccionDespacho {
    comentario?: string;
    direccionId: IDireccion;
}

export interface ICliente {
    _id?: string; // ObjectId as string
    temporalId?: string;
    creadorId?: string | null;
    nombre: string;
    rut: string;
    direccionId?: string | null;
    giro?: string;
    telefono?: string;
    email?: string;
    emailIntercambio?: string | null;
    envioFactura?: boolean;
    envioReporte?: boolean;
    seguimiento?: boolean;
    ordenCompra?: boolean;
    reporteDeuda?: boolean;
    arriendo?: boolean;
    dias_de_pago?: number;
    notificacion?: boolean;
    credito?: number;
    urlWeb?: string;
    comentario?: string;
    contacto?: string;
    documentoTributarioId?: string | null;
    activo?: boolean;
    cilindrosMin?: string;
    cilindrosMax?: number;
    enQuiebra?: boolean;
    mesesAumento?: number[];
    direccionesDespacho?: IDireccionDespacho[];
    createdAt?: Date;
    updatedAt?: Date;
}