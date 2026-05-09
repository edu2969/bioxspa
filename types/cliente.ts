export interface IDireccionDespacho {
    id: string;
    direccionCliente: string;
    latitud: number;
    longitud: number;
    comentario?: string;
}

export interface ICliente {
    id?: string; // ObjectId as string
    temporalId?: string;
    creadorId?: string | null;
    nombre: string;
    rut: string;
    direccion?: IDireccionDespacho | null;
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
    diasDePago?: number;
    notificacion?: boolean;
    credito?: number;
    urlWeb?: string;
    comentario?: string;
    contacto?: string;
    documentoTributarioId?: string | null;
    activo: boolean;
    cilindrosMin?: number;
    cilindrosMax?: number;
    enQuiebra?: boolean;
    mesesAumento?: number[];
    direccionesDespacho?: IDireccionDespacho[];
    createdAt?: Date;
    updatedAt?: Date;
}