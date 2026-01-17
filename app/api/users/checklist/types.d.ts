import { TIPO_CHECKLIST_ITEM } from "@/app/utils/constants";

interface IChecklistAnswer {
    tipo: keyof typeof TIPO_CHECKLIST_ITEM;
    valor: number;
}

interface IChecklistlistResult {
    tipo: 'vehiculo' | 'personal';
    fecha: Date;
}