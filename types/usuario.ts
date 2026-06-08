export interface IUsuario {
    id?: string;
    temporalId?: string;
    nombre: string;
    email: string;
    password: string;
    personaId?: string;
    role: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}