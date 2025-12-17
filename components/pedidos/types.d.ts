export interface IPrecioView {
    _id?: string;
    clienteId: string;
    subcategoriaCatalogoId: {
        _id: string;
        nombre: string;
        categoriaCatalogoId: {
            _id: string;
            nombre: string;
            esIndustrial: boolean;
            tipo: number;
            gas?: string | null;
            elemento?: string | null;
            esMedicinal?: boolean;
        };
        sinSifon: boolean;
        cantidad: number | null;
        unidad: string | null;
    };
    dependenciaId?: string | null;
    fechaDesde?: string | Date;
    historial: Array<{
        valor: number;
        fecha: string | Date;
        varianza: number;
    }>;
    impuesto: number;
    moneda: string;
    sucursalId?: string | null;
    valor: number;
    valorBruto: number;
    cantidad: number;
    seleccionado?: boolean;
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
    codigoHES?: string;
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
    [key: string]: number;
}