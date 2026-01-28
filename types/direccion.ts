export interface IDireccion {
    id: string;
    nombre?: string;
    direccion_original?: string;
    api_id?: string;
    latitud?: number;
    longitud?: number;
    comuna?: string;
    ciudad?: string;
    region?: string;
    iso_pais?: string;
    codigo_postal?: string;
    categoria?: string;
    comentario?: string;
}