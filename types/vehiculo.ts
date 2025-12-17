import { IUser } from "./user";

export interface IPosicionActual {
    latitud: number | null;
    longitud: number | null;
}

export interface IVehiculo {
    _id?: string;
    temporalId?: string;
    patente: string;
    marca: string;
    modelo: string;
    nmotor?: string | null;
    numeroChasis?: string;
    ano?: string;
    empresaId?: string;
    clienteId: string;
    revisionTecnica: Date | string;
    fechaVencimientoExtintor?: Date | string | null;
    direccionDestinoId?: string | null;
    choferIds?: (string | IUser | null)[];
    posicionActual?: IPosicionActual;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}