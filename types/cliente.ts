import { IDireccion } from "./direccion";

export interface IDireccionDespacho {
    comentario?: string;
    direccion_id: IDireccion;
}

export interface ICliente {
    id?: string; // ObjectId as string
    temporal_id?: string;
    creador_id?: string | null;
    nombre: string;
    rut: string;
    direccion_id?: string | null;
    giro?: string;
    telefono?: string;
    email?: string;
    email_intercambio?: string | null;
    envio_factura?: boolean;
    envio_reporte?: boolean;
    seguimiento?: boolean;
    orden_compra?: boolean;
    reporte_deuda?: boolean;
    arriendo?: boolean;
    dias_de_pago?: number;
    notificacion?: boolean;
    credito?: number;
    url_web?: string;
    comentario?: string;
    contacto?: string;
    documento_tributario_id?: string | null;
    activo?: boolean;
    cilindros_min?: string;
    cilindros_max?: number;
    en_quiebra?: boolean;
    meses_aumento?: number[];
    direcciones_despacho?: IDireccionDespacho[];
    created_at?: Date;
    updated_at?: Date;
}