export interface IDocumentoTributario {
    _id?: string;
    temporalId: string;
    nombre: string;
    stock?: boolean;
    afecto?: boolean;
    compra?: boolean;
    venta?: boolean;
    operacion: number; // 0: Ninguna, 1: suma, 2: resta
    formato: number;   // 1: p, 2: p
    createdAt?: Date;
    updatedAt?: Date;
}