import { Types } from "mongoose";
import { ISubcategoriaCatalogo } from "./subcategoriaCatalogo";
import { IItemCatalogo } from "./itemCatalogo";

export interface IDetalleVenta {
    _id: Types.ObjectId;
    temporalId?: string;
    ventaId: Types.ObjectId;
    glosa?: string;
    codigo?: string;
    codigoProducto?: string;
    codigoCilindro?: string | null;
    subcategoriaCatalogoId?: ISubcategoriaCatalogo | null;
    itemCatalogoIds: IItemCatalogo[];
    tipo?: number; // 1: pedido, 2: retiro
    cantidad: number;
    especifico?: number;
    neto: number;
    iva: number;
    total: number;
    createdAt?: Date;
    updatedAt?: Date;
}