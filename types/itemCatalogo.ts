import { Types } from 'mongoose';
import { ISubcategoriaCatalogo } from './subcategoriaCatalogo';
import { IDireccion } from './direccion';
import { ICliente } from './cliente';

export interface IItemCatalogo {
    _id?: Types.ObjectId;
    temporalId?: string;
    codigo?: string;
    estado?: number;
    ownerId?: ICliente;
    subcategoriaCatalogoId: ISubcategoriaCatalogo;
    subcategoriaCatalogoIds?: ISubcategoriaCatalogo[];
    nombre?: string | null;
    descripcion?: string | null;
    descripcionCorta?: string | null;
    fichaTecnica?: string | null;
    urlFichaTecnica?: string | null;
    urlImagen?: string | null;
    garantiaAnual?: number;
    destacado?: boolean;
    stockMinimo?: number;
    stockActual: number;
    visible?: boolean;
    url?: string;
    direccionId?: IDireccion;
    fechaMantencion?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}