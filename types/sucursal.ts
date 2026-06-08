import { ICargo } from "./cargo";
import { IDireccion } from "./direccion";

export interface ISucursal {
    id: string;
    nombre: string;
    direccion?: IDireccion; 
    visible?: boolean;
    prioridad?: number;
    cargos: ICargo[];
    createdAt: Date;
    updatedAt: Date;
}