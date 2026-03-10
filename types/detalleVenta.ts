import { ISubcategoriaCatalogo } from "./subcategoriaCatalogo";
import { IItemCatalogo } from "./itemCatalogo";

export interface IDetalleVenta {
    id: string;
    temporalId?: string;
    ventaId: string;
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