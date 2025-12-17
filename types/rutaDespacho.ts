import { Types } from "mongoose";
import { IVenta } from "./venta";
import { IVehiculo } from "./vehiculo";
import { IUser } from "./user";
import { IDependencia } from "./dependencia";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export interface IRuta {
  direccionDestinoId?: Types.ObjectId;
  fechaArribo?: Date | null;
}

export interface IEstadoHistorial {
  estado: number;
  fecha: Date;
}

export interface ICargaHistorial {
  esCarga: boolean;
  fecha: Date;
  itemMovidoIds: string[];
}

export interface IRutaDespacho {
  _id: Types.ObjectId;
  vehiculoId?: Types.ObjectId | IVehiculo;
  choferId: Types.ObjectId | IUser;
  horaInicio?: Date;
  horaDestino?: Date;
  dependenciaId?: Types.ObjectId | IDependencia;
  ruta: Array<IRuta>;
  estado: keyof typeof TIPO_ESTADO_RUTA_DESPACHO;
  historialEstado: Array<IEstadoHistorial>;
  ventaIds: Types.ObjectId[] | IVenta[];
  cargaItemIds: Types.ObjectId[] | ICargaHistorial[];
  historialCarga: Array<ICargaHistorial>;
}