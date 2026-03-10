export interface IDireccion {
    id: string;
    direccionCliente?: string;
    placeId?: string;
    latitud?: number;
    longitud?: number;
    comuna?: string;
    comentario?: string;
}