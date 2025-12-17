export interface ICategoriaCatalogo {
    _id: string;
    temporalId?: string;
    nombre: string;
    descripcion?: string | null;
    seguir?: boolean;
    urlImagen: string;
    tipo?: number;
    gas?: string;
    elemento?: string;
    esIndustrial?: boolean;
    esMedicinal?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICategoriasView extends ICategoriaCatalogo {
    cantidadSubcategorias: number;
}