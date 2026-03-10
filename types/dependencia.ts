import { ICliente } from "./cliente";
import { IDireccion } from "./direccion";
import { ISucursal } from "./sucursal";

export interface IDependencia {
    id: string;
    nombre?: string;
    sucursalId?: ISucursal;
    direccionId?: IDireccion;
    clienteId?: ICliente;
    operativa?: boolean;
    tipo?: number;
    createdAt?: Date;
    updatedAt?: Date;
}