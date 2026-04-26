"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { IDireccion } from "@/types/direccion";
import { MdAddLocationAlt, MdOutlineEditLocationAlt } from "react-icons/md";
import { Selector } from "./Selector";
import { useEffect, useState } from "react";
import { ClientAddressManagerModal } from "../modals/ClientAddressManagerModal";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';

export default function ClientAddressManagerView({
    tipo,
    label,
    register,
    direccionIdInicialId,
    direcciones,
    onChange
}: {
    tipo: 'comercial' | 'despacho' | 'venta',
    label: string,
    register: UseFormRegisterReturn,
    direccionIdInicialId?: string | null | undefined,
    direcciones?: IDireccion[]
    onChange?: (value: string) => void;
}) {
    const [showAddressManagerModal, setShowAddressManagerModal] = useState(false);
    const [selectedDireccionId, setSelectedDireccionId] = useState<string | null>(direccionIdInicialId ?? null);
    const [selectedDireccion, setSelectedDireccion] = useState<IDireccion | null>(null);

    const handleDireccionSelected = (direccionId: string) => {
        console.log("E: ", direccionId);
        const event = new Event('change', { bubbles: true });
        Object.defineProperty(event, 'target', {
            writable: false,
            value: { name: register.name, value: direccionId }
        });
        register.onChange(event);
        onChange?.(direccionId);
    }

    const MarkerIcon = () => (
        <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Circle background */}
            <circle cx="16" cy="16" r="15" fill="#94B4F7" />
            {/* Map marker */}
            <path
                d="M16 8C13.24 8 11 10.24 11 13C11 17 16 22 16 22C16 22 21 17 21 13C21 10.24 18.76 8 16 8ZM16 14.5C15.17 14.5 14.5 13.83 14.5 13C14.5 12.17 15.17 11.5 16 11.5C16.83 11.5 17.5 12.17 17.5 13C17.5 13.83 16.83 14.5 16 14.5Z"
                fill="#ffffff"
            />
        </svg>
    );

    const formatOptionLabel = ({ label }: { label: string }) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MarkerIcon />
            <span>{label}</span>
        </div>
    );

    const [autocompletePlace, setAutocompletePlace] = useState(null);

    const handleSelect = async (place: any) => {
        setAutocompletePlace(place);
    };

    return (<div>
        <div className="flex w-full">
            {tipo != 'comercial' ? <Selector getLabel={d => d.direccionCliente || "Sin nombre"}
                label={label}
                placeholder={tipo === 'venta' ? 'Retiro en local' : 'Seleccione'}
                getValue={d => d.id}
                options={direcciones || []}
                defaultValue={direccionIdInicialId || ''}
                register={register}
                onChange={(e) => {
                    handleDireccionSelected(e);
                }}
                disableAutoSelect={true}
            /> : <div className="flex flex-col w-full">
                <label htmlFor="cliente" className="block font-medium text-gray-700">{label || 'Dirección'}</label>
                <GooglePlacesAutocomplete
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_API_KEY}
                    selectProps={{
                        value: autocompletePlace,
                        onChange: handleSelect,
                        formatOptionLabel: formatOptionLabel,
                    }}
                    />
            </div>
            }
            {tipo === 'despacho' && <>
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
            </>}
        </div>

        {showAddressManagerModal && 
            <ClientAddressManagerModal
                show={showAddressManagerModal}
                initialDireccion={selectedDireccion}
                onClose={() => setShowAddressManagerModal(false)}
            />}
    </div>);
}