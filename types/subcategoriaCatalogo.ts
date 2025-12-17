import { ICategoriaCatalogo } from "./categoriaCatalogo";

export interface ISubcategoriaCatalogo {
    _id?: string;
    temporalId?: string;
    nombre: string;
    categoriaCatalogoId: ICategoriaCatalogo;
    cantidad?: number;
    unidad?: string;
    sinSifon?: boolean;
    urlImagen?: string | null;
    createdAt?: string;
    updatedAt?: string;
}