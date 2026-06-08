// Form-shape types used by EditSucursal and its children with react-hook-form.
// These are intentionally flat/serializable so the whole tree maps 1:1 to the
// JSON payload posted to /api/sucursales/[id].

export interface IUsuarioForm {
    id: string;
    nombre: string;
    email: string;
}

export interface IClienteForm {
    id: string;
    nombre: string;
    rut: string;
}

export interface IDireccionForm {
    id?: string;
    direccionCliente: string;
    placeId?: string;
    latitud?: number;
    longitud?: number;
    comuna?: string;
}

export interface ICargoForm {
    id?: string;            // existing cargo id (used for diff/upsert on save)
    tipo: number;
    desde: string;          // yyyy-mm-dd (native date input)
    hasta?: string | null;  // yyyy-mm-dd or null when still active
    usuarioId: string;
    usuario: IUsuarioForm;  // kept for display (avatar / name)
}

export interface IDependenciaForm {
    id?: string;            // existing dependencia id (used for diff/upsert on save)
    tipo: number;
    nombre: string;
    operativa: boolean;
    direccion?: IDireccionForm | null;
    cliente?: IClienteForm | null;
    cargos: ICargoForm[];
}

export interface ISucursalForm {
    id?: string;
    nombre: string;
    prioridad: number;
    visible: boolean;
    direccion?: IDireccionForm | null;
    cargos: ICargoForm[];
    dependencias: IDependenciaForm[];
}
