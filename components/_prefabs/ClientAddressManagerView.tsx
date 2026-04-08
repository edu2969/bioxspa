"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { MdAddLocationAlt, MdOutlineEditLocationAlt } from "react-icons/md";
import { Selector } from "./Selector";
import { useEffect, useState } from "react";
import { ClientAddressManagerModal } from "../modals/ClientAddressManagerModal";

export default function ClientAddressManagerView({
    label,
    register,
    direccionIdInicialId,
    direcciones
}: {
    label: string,
    register: UseFormRegisterReturn,
    direccionIdInicialId?: string | null | undefined,
    direcciones: IDireccion[]
}) {
    const [showAddressManagerModal, setShowAddressManagerModal] = useState(false);
    const [selectedDireccionId, setSelectedDireccionId] = useState<string | null>(direccionIdInicialId ?? null);
    const [selectedDireccion, setSelectedDireccion] = useState<IDireccion | null>(null);

    useEffect(() => {
        if(direccionIdInicialId !== null) {
            setSelectedDireccionId(direccionIdInicialId ?? '');
            const selectedDireccion = direcciones.find((d) => d.id === selectedDireccionId) ?? null;
            setSelectedDireccion(selectedDireccion);
        }
    }, [direccionIdInicialId, direcciones, selectedDireccionId, setSelectedDireccionId, setSelectedDireccion]);    

    return (<div className="mt-4 space-y-4">
        <div className="flex">
            <Selector getLabel={d => d.direccionCliente || "Sin nombre"}
                label={label}
                placeholder="Retiro en local"
                getValue={d => d.id}
                options={direcciones}
                defaultValue={direccionIdInicialId || ''}
                register={register}
                onChange={setSelectedDireccionId}                
                disableAutoSelect={true}
            />
            <button
                type="button"
                className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                onClick={() => {
                    setSelectedDireccionId(null);
                    setShowAddressManagerModal(true);
                }}
            >
                <MdAddLocationAlt size="1.8rem" />                
            </button>
            <button
                type="button"
                className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                onClick={() => {
                    setShowAddressManagerModal(true);
                }}
            >
                <MdOutlineEditLocationAlt size="1.8rem" />                
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