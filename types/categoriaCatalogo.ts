export interface ICategoriaCatalogo {
    id: string;
    tipo?: number;
    nombre: string;
    elemento?: string;
    esIndustrial?: boolean;
    esMedicinal?: boolean;    
}

export interface ICategoriasView extends ICategoriaCatalogo {
    cantidadSubcategorias: number;
}