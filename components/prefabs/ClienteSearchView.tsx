"use client";

import Loader from "../Loader";
import { useQuery } from "@tanstack/react-query";
import { IClienteSeachResult } from "./types";
import { UseFormRegisterReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { USER_ROLE } from "@/app/utils/constants";
import { useRouter } from "next/navigation";
import { LiaPencilAltSolid } from "react-icons/lia";

export default function ClienteSearchView({
    titulo,
    register,
    setClienteSelected,
}: {
    titulo?: string;
    register: UseFormRegisterReturn;
    setClienteSelected: (value: IClienteSeachResult | null) => void;
}) {
    const { data: session } = useSession();
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const router = useRouter();
    const [debouncedSearch, setDebouncedSearch] = useState("");    
    const [clienteId, setClienteId] = useState<string | null>(null);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(textoBusqueda);
        }, 1500);
        return () => clearTimeout(handler);
    }, [textoBusqueda]);

    const { data: clientes, isLoading } = useQuery<IClienteSeachResult[]>({
        queryKey: ['clientes', debouncedSearch],
        queryFn: async () => {
            if (clienteId || debouncedSearch.length < 3) return [];
            const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(debouncedSearch)}`);
            const data = await response.json();
            return data.clientes;
        },
        enabled: !clienteId && debouncedSearch.length >= 3,
        initialData: []
    });

    const handleSelect = (cliente: IClienteSeachResult) => {
        setTextoBusqueda(cliente.nombre);
        setClienteId(cliente._id || null);
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
                {isLoading && <div className="absolute -right-1.5 -top-1 md:top-1.5">
                    <div className="absolute -top-1 -left-2 w-11 h-11 bg-white opacity-70 md:bg-transparent md:top-1"></div>
                    <Loader texto="" />
                </div>}
                {(session?.user?.role === USER_ROLE.gerente || session?.user?.role === USER_ROLE.encargado 
                || session?.user?.role === USER_ROLE.cobranza)
                    && <button
                        type="button"
                        className={`ml-2 flex items-center px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                        onClick={() => {
                            router.push(`/modulos/configuraciones/clientes${clienteId ? `?id=${clienteId}` : ''}`);
                        }}
                    >
                        <LiaPencilAltSolid size="1.6rem" />
                        {isLoading && <div className="absolute -right-1.5 -top-1 md:top-1.5">
                            <div className="absolute -top-1 -left-2 w-11 h-11 bg-white opacity-70 md:bg-transparent md:top-1"></div>
                            <Loader texto="" />
                        </div>}
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
