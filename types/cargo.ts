import { TIPO_CARGO } from "../app/utils/constants";
import { IUsuario } from "@/types/usuario";
import { IDependencia } from "@/types/dependencia";
import { ISucursal } from "@/types/sucursal";

export interface ICargo {
    id?: string;
    usuario: IUsuario;
    dependenciaId?: IDependencia;
    sucursal?: ISucursal;
    fechaTermino?: Date | string;
    tipo: keyof typeof TIPO_CARGO | number;
    desde: Date | string;
    hasta?: Date | string;
    createdAt?: Date | string;
}