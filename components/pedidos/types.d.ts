export interface IPrecioView {
    id: string;
    valor: number;
    subcategoriasCatalogo: {
        id: string;
        nombre: string;
        unidad: string;
        cantidad: number;
        sin_sifon: boolean;
        categoriasCatalogo: {
            id: string;
            gas: string;
            tipo: number;
            nombre: string;
            elemento: string;
            esMedicinal: boolean;
            esIndustrial: boolean;
        };
    };
}

export interface IPrecioSeleccionado {
    precioId: string;
    cantidad: number;
}

export interface INuevaVentaSubmit {
    tipo: number;
    usuarioId: string;
    comentario?: string;
    cliente?: string;
    clienteId?: string;
    documentoTributarioId?: string;
    direccionDespachoId?: string;
    sucursalId?: string;
    categoriaId?: string;
    subcategoriaCatalogoId?: string;
    items?: {
        cantidad: number;
        subcategoriaId: string;
    }[];
    numeroOrden?: string;
    codigoHes?: string;
    motivoTraslado?: number;
    empresaDondeRetirar?: string;
    empresaDondeRetirarId?: string;
    direccionRetiroId?: string;
    motivo?: string;
    controlEnvase?: string;
    servicio?: string;
    precios?: {
        seleccionado: boolean;
        cantidad: number;
        subcategoriaId: string;
    }[];
}