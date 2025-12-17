import { TIPO_CHECKLIST_ITEM } from '@/app/utils/constants';

export interface IItemChecklist {
    tipo: number;
    valor?: number; 
}

export interface IChecklist {
    _id?: string;
    tipo: number;
    userId: string;
    vehiculoId?: string;
    kilometraje?: number;
    fecha: Date;
    passed?: boolean; // default: false
    items: IItemChecklist[];
    createdAt?: Date;
    updatedAt?: Date;
}