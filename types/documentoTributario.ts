export interface IDocumentoTributario {
    id?: string;
    temporal_id: string;
    nombre: string;
    stock?: boolean;
    afecto?: boolean;
    compra?: boolean;
    venta?: boolean;
    operacion: number; // 0: Ninguna, 1: suma, 2: resta
    formato: number;   // 1: p, 2: p
    created_at?: Date;
    updated_at?: Date;
}