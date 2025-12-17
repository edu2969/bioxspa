import { Types } from "mongoose";
import { ICliente } from "./cliente";
import { IDireccion } from "./direccion";
import { ISucursal } from "./sucursal";

export interface IDependencia {
    _id?: Types.ObjectId;
    nombre?: string;
    sucursalId?: ISucursal;
    direccionId?: IDireccion;
    clienteId?: ICliente;
    operativa?: boolean;
    tipo?: number;
    createdAt?: Date;
    updatedAt?: Date;
}