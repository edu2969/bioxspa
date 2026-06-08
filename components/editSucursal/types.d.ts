import { ICargo } from "@/types/cargo";
import { IDireccion } from "@/types/direccion";

export interface ISucursalForm {
    nombre: string;
    direccionCliente: string;
    prioridad: number;
    cargos: ICargoForm[];
    dependencias: IDependenciaForm[];
}

export interface ICargoForm {
    tipo: number;
    desde: Date;
    hasta: Date | null;
    usuarioId: string;
    usuario: IUsuarioForm;
}

export interface IUsuarioForm {
    id: string;
    nombre: string;
    email: string;
}

export interface IDependenciaForm {
    tipo: number;
    nombre: string;
    direccion: IDireccionForm;    
    cargos: ICargoForm[];
    cliente: IClienteForm;
}

export interface IDireccionForm {
    direccionCliente: string;
    placeId: string;
}

export interface IClienteForm {
    id: string;
    nombre: string;
    rut: string;
}