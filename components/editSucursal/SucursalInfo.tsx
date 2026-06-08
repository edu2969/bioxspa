"use client";

import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { ISucursalForm } from "./types";
import AddressAutocompleteInput from "../_prefabs/AddressAutocompleteInput";

export default function SucursalInfo({
    errors,
    register,
    setValue,
    initialAddress,
}: {
    errors: FieldErrors<ISucursalForm>;
    register: UseFormRegister<ISucursalForm>;
    setValue: UseFormSetValue<ISucursalForm>;
    initialAddress: string | null;
}) {
    const handleAddressSelect = (data: IDireccion | null) => {
        if (!data) return;
        setValue(
            "direccion",
            {
                id: data.id || undefined,
                direccionCliente: data.direccionCliente ?? "",
                placeId: data.placeId,
                latitud: data.latitud,
                longitud: data.longitud,
                comuna: data.comuna,
            },
            { shouldDirty: true }
        );
    };

    return (
        <div className="flex my-6 space-x-4">
            <div className="flex w-2/12">
                <div className="mr-4">
                    <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700">Prioridad</label>
                    <input
                        id="prioridad"
                        type="number"
                        {...register("prioridad", { valueAsNumber: true })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                    />
                </div>
            </div>
            <div className="w-4/12">
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                    id="nombre"
                    type="text"
                    {...register("nombre", { required: "El nombre es requerido" })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{String(errors.nombre.message)}</p>}
            </div>
            <div className="w-6/12">
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
                <AddressAutocompleteInput
                    initialAddress={initialAddress}
                    onSelect={handleAddressSelect}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                />
            </div>
        </div>
    );
}
