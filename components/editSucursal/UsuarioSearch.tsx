"use client";

import { useState } from "react";
import { IUsuarioForm } from "./types";

// Search-as-you-type input that resolves a usuario for a cargo.
export default function UsuarioSearch({
    onSelect,
    placeholder = "Buscar usuario",
}: {
    onSelect: (usuario: IUsuarioForm) => void;
    placeholder?: string;
}) {
    const [results, setResults] = useState<IUsuarioForm[]>([]);

    const handleChange = async (query: string) => {
        if (query.length <= 2) {
            setResults([]);
            return;
        }
        try {
            const response = await fetch(`/api/usuarios/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResults(data.users ?? []);
        } catch (error) {
            console.error("Error buscando usuarios:", error);
            setResults([]);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                placeholder={placeholder}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                onChange={(e) => handleChange(e.target.value)}
            />
            {results.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                    {results.map((usuario) => (
                        <li
                            key={usuario.id}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                            onClick={() => {
                                onSelect(usuario);
                                setResults([]);
                            }}
                        >
                            {usuario.nombre}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
