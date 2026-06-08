"use client";

import { useState } from "react";
import { IClienteForm } from "./types";

// Search-as-you-type input that resolves a cliente (empresa) for a dependencia.
export default function ClienteSearch({
    defaultValue = "",
    onSelect,
}: {
    defaultValue?: string;
    onSelect: (cliente: IClienteForm) => void;
}) {
    const [results, setResults] = useState<IClienteForm[]>([]);

    const handleChange = async (query: string) => {
        if (query.length <= 2) {
            setResults([]);
            return;
        }
        try {
            const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResults(data.clientes ?? []);
        } catch (error) {
            console.error("Error buscando clientes:", error);
            setResults([]);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                placeholder="Buscar cliente"
                defaultValue={defaultValue}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm pr-10"
                onChange={(e) => handleChange(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
            </div>
            {results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                    {results.map((cliente) => (
                        <li
                            key={cliente.id}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                            onClick={() => {
                                onSelect(cliente);
                                setResults([]);
                            }}
                        >
                            {cliente.nombre} <span className="text-gray-400 text-xs">{cliente.rut}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
