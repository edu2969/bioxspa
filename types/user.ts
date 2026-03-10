export interface IUser {
    id?: string;
    temporalId?: string;
    name: string;
    email: string;
    password: string;
    personaId?: string;
    role: number;
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}