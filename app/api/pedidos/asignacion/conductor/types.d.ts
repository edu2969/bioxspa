export interface IRutaDespachoChofer {
    _id: string;
    vehiculoId?: {
        _id: string;
        patente: string;
        modelo: string;
        marca: string;
    } | null;
    choferId: string;
    horaInicio?: Date;
    horaDestino?: Date;
    dependenciaId?: string;
    ruta: Array<{
        direccionDestinoId?: {
            _id: string;
            nombre: string;
            latitud?: number;
            longitud?: number;
        } | null;
        fechaArribo?: Date | null;
    }>;
    estado: number;
    historialEstado: Array<{
        estado: number;
        fecha: Date;
    }>;
    ventaIds: Array<{
        _id: string;
        clienteId?: {
            _id: string;
            nombre: string;
            direccionesDespacho: Array<{
                direccionId?: {
                    _id: string;
                    nombre: string;
                    latitud?: number;
                    longitud?: number;
                } | null;
            }>;
        } | null;
        direccionDespachoId?: string;
        estado: number;
        tipo: number;
        comentario: string;
    }>;
    cargaItemIds: Array<{
        _id: string;
        codigo: string;
        subcategoriaCatalogoId?: {
            cantidad: number;
            unidad: string;
            nombreGas: string;
            sinSifon: boolean;
            categoriaCatalogoId?: {
                elemento: string;
                esIndustrial: boolean;
                esMedicinal: boolean;
            } | null;
        } | null;
    }>;
    historialCarga: Array<{
        esCarga: boolean;
        fecha: Date;
        itemMovidoIds: string[];
    }>;
    createdAt: Date;
    updatedAt: Date;
}