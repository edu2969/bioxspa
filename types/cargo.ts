import { TIPO_CARGO } from "../app/utils/constants";
import { IUser } from "@/types/user";
import { IDependencia } from "@/types/dependencia";
import { ISucursal } from "@/types/sucursal";

export interface ICargo {
    _id?: string;
    userId: IUser;
    dependenciaId?: IDependencia;
    sucursalId?: ISucursal;
    tipo: keyof typeof TIPO_CARGO | number;
    desde: Date | string;
    hasta?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}