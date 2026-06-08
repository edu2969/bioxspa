// hooks/useEditSucursal.ts

import { IDependencia } from "@/types/dependencia";
import { ISucursal } from "@/types/sucursal";
import { useState } from "react";
import { useSucursales } from "./useSucursales";

export function useEditSucursal(
    sucursalId: string
) {
    const [sucursal, setSucursal] =
        useState<ISucursal | null>(null);

    const [dependencias, setDependencias] =
        useState<IDependencia[]>([]);

    const [loading, setLoading] =
        useState(true);

    const { sucursales, isLoading } = useSucursales();

    const guardar =
        async () => {
            console.log("Guaradando");
        };

    return {
        sucursal,
        setSucursal,
        dependencias,
        setDependencias,
        loading,
        guardar,
    };
}