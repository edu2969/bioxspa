"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { MdAddLocationAlt, MdOutlineEditLocationAlt } from "react-icons/md";
import { Selector } from "./Selector";
import { useState } from "react";
import { ClientAddressManagerModal } from "../modals/ClientAddressManagerModal";
import Loader from "../Loader";
import { useGoogleMaps } from "../providers/GoogleMapProvider";
import InputAddressAutocomplete from "./AddressAutocompleteInput";

export default function ClientAddressManagerView({
    clienteId,
    tipo,
    label,
    register,
    direccionInicialId,
    direccionInicialCliente,
    direcciones,
    onSelect,
    className,
}: {
    clienteId: string | null;
    tipo: 'comercial' | 'despacho' | 'venta';
    label: string;
    register: UseFormRegisterReturn;
    direccionInicialId?: string | null | undefined;
    direccionInicialCliente?: string | null | undefined;
    direcciones?: IDireccion[];
    onSelect?: (data: IDireccion | null) => void;
    className?: string;
}) {
    const [showAddressManagerModal, setShowAddressManagerModal] = useState(false);
    const [selectedDireccion, setSelectedDireccion] = useState<IDireccion | null>(null);
    const [newDireccion, setNewDireccion] = useState(true);

    const isGoogleApiLoaded = useGoogleMaps();

    return (<div>
        <div className="flex w-full">
            {tipo != 'comercial' ? <Selector getLabel={d => d.direccionCliente || "Sin nombre"}
                label={label}
                placeholder={tipo === 'despacho' ? 'Retiro en local' : 'Seleccione'}
                getValue={d => d.id ?? ""}
                options={direcciones || []}
                defaultValue={direccionInicialId || ''}
                register={register}
                onChange={(e) => {   
                    setSelectedDireccion(direcciones?.find(d => d.id === e) || null);
                }}
                disableAutoSelect={true}
                className={className}
            /> : <div className="flex flex-col w-full">
                <label htmlFor="cliente" className="block font-medium text-gray-700 text-sm">{label || 'Dirección'}</label>
                {isGoogleApiLoaded ? <InputAddressAutocomplete 
                    onSelect={onSelect} 
                    className={className}
                    initialAddress={direccionInicialCliente || null} /> : <div className="relative w-full">
                    <input className={`absolute block ${className || ''}`}
                        disabled={true} />
                    <div className="w-full pt-0.5 left-0 top-0 bg-white/70 flex flex-col justify-end items-end">
                        <Loader texto="" />
                    </div>
                </div>}
            </div>
            }
            {tipo === 'despacho' && <>
                <button
                    type="button"
                    className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                    onClick={() => {
                        setNewDireccion(true);
                        setShowAddressManagerModal(true);
                    }}
                >
                    <MdAddLocationAlt size="1.8rem" />
                </button>
                {selectedDireccion != null && <button
                    type="button"
                    className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                    onClick={() => {
                        setNewDireccion(false);
                        setShowAddressManagerModal(true);
                    }}
                >
                    <MdOutlineEditLocationAlt size="1.8rem" />
                </button>}
            </>}
        </div>

        {showAddressManagerModal &&
            <ClientAddressManagerModal
                clienteId={clienteId}
                show={showAddressManagerModal}
                initialDireccion={newDireccion ? null : selectedDireccion}
                onClose={() => {                    
                    setShowAddressManagerModal(false)
                }}
            />}
    </div>);
}