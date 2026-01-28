"use client";

import { useState } from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { MdAddLocationAlt } from "react-icons/md";
import { Selector } from "./Selector";

export default function ClientAddressManagerView({
    label,
    register,
    direcciones
}: {
    label: string,
    register: UseFormRegisterReturn,
    direcciones: IDireccion[]
}) {
    const [editMode, setEditMode] = useState(false);    

    return (<div className="mt-4 space-y-4">
        {!editMode && direcciones && (<div className="flex">
            <Selector getLabel={d => d.nombre || "Sin nombre"}
                label={label}
                placeholder="Retiro en local"
                getValue={d => d.id}
                options={direcciones}
                register={register}
                disableAutoSelect={true}
            />
            <button
                type="button"
                className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                onClick={() => {
                    setEditMode(true);
                }}
            >
                <MdAddLocationAlt size="1.8rem" />
            </button>
        </div>)}

        {editMode && <div className="w-full pr-0 md:pr-4 flex">
            <div className="w-full">
                <label htmlFor="direccion_despacho_id" className="block text-sm font-medium text-gray-700">{label}</label>
                <select
                    id="direccion_despacho_id"
                    {...register}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                >
                    <option value="">Retiro en local</option>
                    {direcciones && direcciones.length > 0
                        && direcciones.map((dir, dirIdx) => (
                            <option key={`${dir.id}-${dirIdx}`} value={dir.id}>
                                {dir.nombre}
                            </option>
                        ))}
                </select>
            </div>
        </div>}
    </div>);
}