"use client";

import { Control } from "react-hook-form";
import { TbMedal2 } from "react-icons/tb";
import { ISucursalForm } from "./types";
import CargosEditor from "./CargosEditor";

// Branch-level cargos section.
export default function CargosSucursal({
    control,
    usuarios,
}: {
    control: Control<ISucursalForm>;
    usuarios: { id?: string; email: string }[] | undefined;
}) {
    return (
        <div className="flex my-6 space-x-4">
            <div className="w-full">
                <h2 className="text-lg font-medium text-gray-700 flex items-center">
                    <TbMedal2 className="text-2xl mr-2" />
                    CARGOS DE LA SUCURSAL
                </h2>
                <CargosEditor control={control} name="cargos" usuarios={usuarios} keyPrefix="sucursal_cargo" />
            </div>
        </div>
    );
}
