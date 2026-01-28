export interface ICategoriaCatalogo {
    _id: string;
    temporal_id?: string;
    nombre: string;
    descripcion?: string | null;
    seguir?: boolean;
    url_imagen: string;
    tipo?: number;
    gas?: string;
    elemento?: string;
    es_industrial?: boolean;
    es_medicinal?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface ICategoriasView extends ICategoriaCatalogo {
    cantidad_subcategorias: number;
}