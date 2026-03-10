import { IDireccion } from "./direccion";

export interface ISucursal {
    id: string;
    nombre: string;
    direccionId?: IDireccion; 
    visible?: boolean;
    prioridad?: number;
    createdAt: Date;
    updatedAt: Date;
}