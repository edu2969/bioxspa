import { Types } from "mongoose";
import { IVenta } from "./venta";
import { IVehiculo } from "./vehiculo";
import { IUser } from "./user";
import { IDependencia } from "./dependencia";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { IDireccion } from "./direccion";
import { IItemCatalogo } from "./itemCatalogo";

export interface IRuta {
  direccionDestinoId?: IDireccion;
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
  vehiculoId?: IVehiculo;
  choferId: IUser;
  horaInicio?: Date;
  horaDestino?: Date;
  dependenciaId?: IDependencia;
  ruta: Array<IRuta>;
  estado: number;
  historialEstado: Array<IEstadoHistorial>;
  ventaIds: IVenta[];
  cargaItemIds: IItemCatalogo[];
  historialCarga: Array<ICargaHistorial>;
  encargado: string;
}