export interface IPrecioView {
    id: string;
    valor: number;
    subcategorias_catalogo: {
        id: string;
        nombre: string;
        unidad: string;
        cantidad: number;
        sin_sifon: boolean;
        categorias_catalogo: {
            id: string;
            gas: string;
            tipo: number;
            nombre: string;
            elemento: string;
            es_medicinal: boolean;
            es_industrial: boolean;
        };
    };
}

export interface IPrecioSeleccionado {
    precio_id: string;
    cantidad: number;
}

export interface INuevaVentaSubmit {
    tipo: number;
    usuario_id: string;
    comentario?: string;
    cliente?: string;
    cliente_id?: string;
    documento_tributario_id?: string;
    direccion_despacho_id?: string;
    sucursal_id?: string;
    categoria_id?: string;
    subcategoria_catalogo_id?: string;
    items?: {
        cantidad: number;
        subcategoria_id: string;
    }[];
    numero_orden?: string;
    codigo_hes?: string;
    motivo_traslado?: number;
    empresa_donde_retirar?: string;
    empresa_donde_retirar_id?: string;
    direccion_retiro_id?: string;
    motivo?: string;
    control_envase?: string;
    servicio?: string;
    precios?: {
        seleccionado: boolean;
        cantidad: number;
        subcategoria_id: string;
    }[];
}