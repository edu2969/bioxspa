import { ICategoriaCatalogo } from "./categoriaCatalogo";

export interface ISubcategoriaCatalogo {
    _id?: string;
    temporal_id?: string;
    nombre: string;
    categoria_catalogo_id: ICategoriaCatalogo;
    cantidad?: number;
    unidad?: string;
    sin_sifon?: boolean;
    url_imagen?: string | null;
    created_at?: string;
    updated_at?: string;
}