"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { MdAddLocationAlt } from "react-icons/md";
import { Selector } from "./Selector";
import { useState } from "react";
import { ClientAddressManagerModal } from "../modals/ClientAddressManagerModal";

export default function ClientAddressManagerView({
    label,
    register,
    direcciones
}: {
    label: string,
    register: UseFormRegisterReturn,
    direcciones: IDireccion[]
}) {
    const [showAddressManagerModal, setShowAddressManagerModal] = useState(false);
    const [selectedDireccionId, setSelectedDireccionId] = useState<string>("");

    const selectedDireccion = direcciones.find((d) => d.id === selectedDireccionId) ?? null;

    return (<div className="mt-4 space-y-4">
        <div className="flex">
            <Selector getLabel={d => d.direccionCliente || "Sin nombre"}
                label={label}
                placeholder="Retiro en local"
                getValue={d => d.id}
                options={direcciones}
                register={register}
                onChange={setSelectedDireccionId}
                disableAutoSelect={true}
            />
            <button
                type="button"
                className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                onClick={() => {
                    setShowAddressManagerModal(true);
                }}
            >
                <MdAddLocationAlt size="1.8rem" />
            </button>
        </div>

        {showAddressManagerModal && (
            <ClientAddressManagerModal
                show={showAddressManagerModal}
                initialDireccion={selectedDireccion}
                onClose={() => setShowAddressManagerModal(false)}
            />
        )}

    </div>);
}