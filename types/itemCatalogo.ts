import { ISubcategoriaCatalogo } from "./subcategoriaCatalogo";

export interface IItemCatalogo {
    id: string;
    codigo?: string;
    estado?: number;
    carga: number;
    propietarioId?: string;
    subcategoria: {
        categoria: {
            id: string;
        },
        id: string;
    };
    stockMinimo?: number;
    stockActual: number;
    direccionId?: string;
    fechaMantencion?: Date | null;
}