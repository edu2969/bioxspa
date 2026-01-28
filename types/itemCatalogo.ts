import { Types } from 'mongoose';
import { ISubcategoriaCatalogo } from './subcategoriaCatalogo';
import { IDireccion } from './direccion';
import { ICliente } from './cliente';

export interface IItemCatalogo {
    id?: Types.ObjectId;
    temporal_id?: string;
    codigo?: string;
    estado?: number;
    owner_id?: ICliente;
    subcategoria_catalogo_id: ISubcategoriaCatalogo;
    subcategoria_catalogo_ids?: ISubcategoriaCatalogo[];
    nombre?: string | null;
    descripcion?: string | null;
    descripcion_corta?: string | null;
    ficha_tecnica?: string | null;
    url_ficha_tecnica?: string | null;
    url_imagen?: string | null;
    garantia_anual?: number;
    destacado?: boolean;
    stock_minimo?: number;
    stock_actual: number;
    visible?: boolean;
    url?: string;
    direccion_id?: IDireccion;
    fecha_mantencion?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}