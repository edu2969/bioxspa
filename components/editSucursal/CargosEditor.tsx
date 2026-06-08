"use client";

import { useState } from "react";
import { Control, FieldArrayPath, useFieldArray } from "react-hook-form";
import Image from "next/image";
import { IoIosInformationCircle } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { TbMedal2 } from "react-icons/tb";
import { ICargoForm, ISucursalForm, IUsuarioForm } from "./types";
import CargoIcon, { getUsuarioAvatar } from "./CargoIcon";
import CargoEditor from "./CargoEditor";

// Avatar grid + inline add/edit for a cargos field array. `name` points at either
// the sucursal-level "cargos" or a dependencia's "dependencias.N.cargos".
export default function CargosEditor({
    control,
    name,
    usuarios,
    keyPrefix,
}: {
    control: Control<ISucursalForm>;
    name: FieldArrayPath<ISucursalForm>;
    usuarios: { id?: string; email: string }[] | undefined;
    keyPrefix: string;
}) {
    const fieldArray = useFieldArray<ISucursalForm, FieldArrayPath<ISucursalForm>, "rhfId">({
        control,
        name,
        keyName: "rhfId",
    });
    const { fields, remove } = fieldArray;
    const append = fieldArray.append as (value: ICargoForm) => void;
    const update = fieldArray.update as (index: number, value: ICargoForm) => void;
    const cargos = fields as unknown as (ICargoForm & { rhfId: string })[];

    // null = not editing, -1 = adding new, >=0 = editing that index
    const [editing, setEditing] = useState<number | null>(null);

    const handleSave = (cargo: ICargoForm) => {
        if (editing === -1) {
            append(cargo);
        } else if (editing !== null) {
            update(editing, cargo);
        }
        setEditing(null);
    };

    return (
        <div className="flex bg-blue-50 shadow-md p-4 rounded-md mt-4">
            <div className="w-10/12">
                {cargos.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {cargos.map((cargo, idx) => (
                            <div
                                key={`${keyPrefix}_${cargo.rhfId}`}
                                className={`w-32 h-32 rounded-md flex justify-center items-center shadow-md p-2 hover:scale-105 duration-200 ${editing != null && editing !== idx ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                                <div className="w-full flex flex-col justify-center items-center m-auto h-24 rounded-full">
                                    <div className="relative w-full text-center flex flex-col items-center">
                                        <Image
                                            src={getUsuarioAvatar(usuarios, cargo.usuario?.id ?? cargo.usuarioId)}
                                            alt="avatar"
                                            className="w-20 h-20 rounded-full"
                                            onClick={() => {
                                                if (editing != null && editing !== idx) return;
                                                setEditing(idx);
                                            }}
                                            width={56}
                                            height={56}
                                        />
                                        <CargoIcon tipo={cargo.tipo} />
                                        <span
                                            className="absolute -bottom-1 left-2 text-sm text-white cursor-pointer bg-red-500 rounded-full hover:text-red-400 hover:bg-white"
                                            onClick={() => {
                                                remove(idx);
                                                setEditing(null);
                                            }}
                                        >
                                            <MdDeleteForever className="text-lg border border-gray-400 rounded-full" size="1.5rem" />
                                        </span>
                                    </div>
                                    <span className="mt-2 font-bold text-xs text-center overflow-ellipsis">
                                        {cargo.usuario?.nombre?.split(" ").slice(0, 2).join(" ")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    editing === null && (
                        <div className="flex items-center text-sm text-gray-500">
                            <IoIosInformationCircle className="mr-2 text-lg" />
                            NO HAY CARGOS DESIGNADOS AÚN
                        </div>
                    )
                )}
                {editing !== null && (
                    <CargoEditor
                        initial={editing >= 0 ? cargos[editing] : null}
                        onSave={handleSave}
                        onCancel={() => setEditing(null)}
                    />
                )}
            </div>
            <div className="w-2/12 text-right">
                <button
                    type="button"
                    disabled={editing !== null}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setEditing(-1)}
                >
                    <TbMedal2 size="1.5rem" className="mr-2" />
                    AGREGAR
                </button>
            </div>
        </div>
    );
}

export type { IUsuarioForm };
