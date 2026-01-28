"use client";

import Loader from "../Loader";
import { useQuery } from "@tanstack/react-query";
import { IClienteSeachResult } from "./types";
import { UseFormRegisterReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { useAuthorization } from "@/lib/auth/useAuthorization";
import { ROLES } from "@/app/utils/constants";
import { useRouter } from "next/navigation";
import { LiaPencilAltSolid } from "react-icons/lia";

export default function ClienteSearchView({
    titulo,
    register,
    setClienteSelected,
    isLoading
}: {
    titulo?: string;
    register: UseFormRegisterReturn;
    setClienteSelected: (value: IClienteSeachResult | null) => void;
    isLoading?: boolean;
}) {
    const { user, hasRole } = useAuthorization();
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const router = useRouter();
    const [debouncedSearch, setDebouncedSearch] = useState("");    
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(textoBusqueda);
        }, 1500);
        return () => clearTimeout(handler);
    }, [textoBusqueda]);

    const { data: clientes, isLoading: searchingClientes } = useQuery<IClienteSeachResult[]>({
        queryKey: ['clientes', debouncedSearch],
        queryFn: async () => {
            if (clienteId || debouncedSearch.length < 3) return [];
            const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(debouncedSearch)}`);
            const data = await response.json();
            return data.clientes;
        },
        enabled: !clienteId && debouncedSearch.length >= 3
    });

    const handleSelect = (cliente: IClienteSeachResult) => {
        setTextoBusqueda(cliente.nombre);
        setClienteId(cliente.id || null);
        setClienteSelected(cliente);
    };
    
    return (<div className="w-full">
        <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
            {titulo || "Cliente"}
        </label>
        <div className="w-full">
            <div className="relative w-full pr-0 flex items-end">
                <input
                    id="cliente"
                    type="text"
                    value={textoBusqueda}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                    onChange={(e) => {
                        const value = e.target.value;                        
                        if(value.trim() === '') {
                            setClienteSelected(null);
                            setClienteId(null);
                            register.onChange({ target: { value: '' } });                            
                        }
                        setTextoBusqueda(value);
                    }}
                />
                <input type="hidden" {...register} value={clienteId || ''} />
                {searchingClientes && <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
                    <Loader texto="" />
                </div>}
                {hasRole([ROLES.SUPERVISOR, ROLES.SUPERVISOR, ROLES.MANAGER])
                    && <button
                        type="button"
                        className={`ml-2 flex items-center justify-center px-2 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                            (!isRedirecting && !searchingClientes) 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-500 text-gray-500 cursor-not-allowed opacity-80'
                        }`}
                        onClick={() => {
                            if (!isRedirecting && !isLoading) {
                                setIsRedirecting(true);
                                router.push(`/pages/configuraciones/clientes${clienteId ? `?id=${clienteId}` : ''}`);
                            }
                        }}
                        disabled={isRedirecting || searchingClientes}
                    >
                        {isRedirecting ? (
                            <div className="flex items-center justify-center">
                                <Loader texto="" />
                            </div>
                        ) : (
                            <LiaPencilAltSolid size="1.6rem" />
                        )}
                    </button>}
            </div>
            {!isLoading && !clienteId && clientes && clientes.length > 0 && (
                <ul className="absolute z-10 border border-green-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full max-w-xs">
                    {clientes.map((cliente: IClienteSeachResult, cidx: number) => (
                        <li
                            key={`cliente_${cidx}`}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                            onClick={() => handleSelect(cliente)}
                        >
                            <p>{cliente.nombre}</p>
                            <p className="text-xs text-gray-500">{cliente.rut}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </div>);
}
