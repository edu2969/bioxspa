export interface IDireccion {
    _id: string;
    nombre?: string;
    direccionOriginal?: string;
    apiId?: string;
    latitud?: number;
    longitud?: number;
    comuna?: string;
    ciudad?: string;
    region?: string;
    isoPais?: string;
    codigoPostal?: string;
    categoria?: string;
    comentario?: string;
}