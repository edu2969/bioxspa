"use client";

import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { TIPO_CARGO } from "@/app/utils/constants";
import { ICargoForm, IUsuarioForm } from "./types";
import UsuarioSearch from "./UsuarioSearch";

const CARGO_OPTIONS = Object.entries(TIPO_CARGO).filter(([, value]) => value !== 0);
const DEFAULT_TIPO = CARGO_OPTIONS[0][1];

// Inline draft editor for a single cargo. Commits a fully-built ICargoForm to the
// parent (field array) only on confirm, so the form is never left with partial rows.
export default function CargoEditor({
    initial,
    onSave,
    onCancel,
}: {
    initial?: ICargoForm | null;
    onSave: (cargo: ICargoForm) => void;
    onCancel: () => void;
}) {
    const [usuario, setUsuario] = useState<IUsuarioForm | null>(initial?.usuario ?? null);
    const [tipo, setTipo] = useState<number>(initial?.tipo ?? DEFAULT_TIPO);
    const [desde, setDesde] = useState<string>(initial?.desde ?? "");
    const [hasta, setHasta] = useState<string>(initial?.hasta ?? "");
    const [error, setError] = useState<string>("");

    const handleSave = () => {
        if (!usuario) {
            setError("Selecciona un usuario");
            return;
        }
        if (!desde) {
            setError("La fecha 'Desde' es requerida");
            return;
        }
        onSave({
            id: initial?.id,
            usuario,
            usuarioId: usuario.id,
            tipo,
            desde,
            hasta: hasta || null,
        });
    };

    return (
        <div className="w-full">
            <div className="flex mt-4 space-x-4">
                <div className="w-4/12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                    {usuario ? (
                        <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-gray-50 sm:text-sm">
                            <span className="truncate">{usuario.nombre}</span>
                            <button type="button" className="text-gray-400 hover:text-red-500 ml-2" onClick={() => setUsuario(null)}>
                                <FaTimes />
                            </button>
                        </div>
                    ) : (
                        <UsuarioSearch onSelect={(u) => { setUsuario(u); setError(""); }} />
                    )}
                </div>
                <div className="w-2/12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                        value={tipo}
                        onChange={(e) => setTipo(Number(e.target.value))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                    >
                        {CARGO_OPTIONS.map(([key, value]) => (
                            <option key={value} value={value}>{key.replace(/_/g, " ").toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                <div className="w-3/12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                    <input
                        type="date"
                        value={desde}
                        onChange={(e) => { setDesde(e.target.value); setError(""); }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                    />
                </div>
                <div className="w-3/12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                    <input
                        type="date"
                        value={hasta ?? ""}
                        onChange={(e) => setHasta(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                    />
                </div>
                <div className="flex items-end h-10 mt-6">
                    <button type="button" className="text-green-600 text-xl hover:bg-green-500 hover:text-white rounded-md p-2" onClick={handleSave}>
                        <FaCheck />
                    </button>
                    <button type="button" className="ml-2 text-red-600 text-xl hover:bg-red-100 rounded-md p-2" onClick={onCancel}>
                        <FaTimes />
                    </button>
                </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
