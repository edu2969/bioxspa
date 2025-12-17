import { IDependencia } from "./dependencia";
import { ISucursal } from "./sucursal";

export interface IPrecio {
    subcategoriaCatalogoId: string;
    clienteId: string;
    dependenciaId?: string | IDependencia |null;
    sucursalId?: string | ISucursal | null;
    valorBruto: number;
    impuesto: number;
    moneda: string;
    valor: number;
    historial: {
        valor: number;
        fecha: Date;
        varianza: number;
    }[];
    fechaDesde?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}