"use client";

import { Control } from "react-hook-form";
import { ISucursalForm } from "./types";
import CargosEditor from "./CargosEditor";

// Cargos section nested inside a single dependencia row.
export default function CargosDependencia({
    control,
    index,
    usuarios,
}: {
    control: Control<ISucursalForm>;
    index: number;
    usuarios: { id?: string; email: string }[] | undefined;
}) {
    return (
        <CargosEditor
            control={control}
            name={`dependencias.${index}.cargos`}
            usuarios={usuarios}
            keyPrefix={`dependencia_${index}_cargo`}
        />
    );
}
