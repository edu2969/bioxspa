import { TIPO_CHECKLIST } from '@/app/utils/constants';

export interface IItemChecklist {
    tipo: keyof typeof TIPO_CHECKLIST;
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