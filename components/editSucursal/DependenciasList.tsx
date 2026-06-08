"use client";

import { useState } from "react";
import { Control, UseFormRegister, UseFormSetValue, UseFormWatch, useFieldArray } from "react-hook-form";
import { IoIosInformationCircle } from "react-icons/io";
import { MdAddBusiness, MdDeleteForever } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";
import { LuPencil } from "react-icons/lu";
import { FaCheck } from "react-icons/fa";
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";
import { IDependenciaForm, ISucursalForm } from "./types";
import AddressAutocompleteInput from "../_prefabs/AddressAutocompleteInput";
import ClienteSearch from "./ClienteSearch";
import CargosDependencia from "./CargosDependencia";
import { ConfirmModal } from "../modals/ConfirmModal";

const tipoLabel = (tipo?: number) =>
    (Object.keys(TIPO_DEPENDENCIA) as Array<keyof typeof TIPO_DEPENDENCIA>)
        .find((key) => TIPO_DEPENDENCIA[key] === tipo)
        ?.replace(/_/g, " ")
        .toUpperCase();

export default function DependenciasList({
    control,
    register,
    setValue,
    watch,
    usuarios,
}: {
    control: Control<ISucursalForm>;
    register: UseFormRegister<ISucursalForm>;
    setValue: UseFormSetValue<ISucursalForm>;
    watch: UseFormWatch<ISucursalForm>;
    usuarios: { id?: string; email: string }[] | undefined;
}) {
    const { fields, append, remove } = useFieldArray<ISucursalForm, "dependencias", "rhfId">({
        control,
        name: "dependencias",
        keyName: "rhfId",
    });
    const dependencias = fields as unknown as (IDependenciaForm & { rhfId: string })[];

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

    const handleAdd = () => {
        append({
            tipo: TIPO_DEPENDENCIA.sucursal,
            nombre: "",
            operativa: true,
            direccion: null,
            cliente: null,
            cargos: [],
        });
        setEditingIndex(dependencias.length);
    };

    return (
        <div className="my-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-700 flex items-center">
                    <SiHomeassistantcommunitystore className="text-2xl mr-2" />
                    DEPENDENCIAS
                </h2>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleAdd}
                >
                    <MdAddBusiness className="mr-2" />
                    AGREGAR
                </button>
            </div>

            {dependencias.length > 0 && (
                <div className="min-w-full mt-4 divide-y divide-gray-200">
                    <div className="divide-y divide-gray-200">
                        {dependencias.map((dependencia, index) => {
                            const current = watch(`dependencias.${index}`);
                            const isEditing = editingIndex === index;
                            return (
                                <div className="flex" key={`dependencia_${dependencia.rhfId}`}>
                                    <div className="px-6 py-4 whitespace-nowrap w-4/12">
                                        {isEditing ? (
                                            <div className="w-full">
                                                <div className="flex">
                                                    <div className="w-1/2">
                                                        <label className="block text-sm font-medium text-gray-700">Nombre Corto</label>
                                                        <input
                                                            type="text"
                                                            {...register(`dependencias.${index}.nombre`, { required: true })}
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                        />
                                                    </div>
                                                    <div className="relative ml-4 w-full">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                                        <AddressAutocompleteInput
                                                            initialAddress={current?.direccion?.direccionCliente ?? null}
                                                            onSelect={(data) => {
                                                                if (!data) return;
                                                                setValue(`dependencias.${index}.direccion`, {
                                                                    id: data.id || undefined,
                                                                    direccionCliente: data.direccionCliente ?? "",
                                                                    placeId: data.placeId,
                                                                    latitud: data.latitud,
                                                                    longitud: data.longitud,
                                                                    comuna: data.comuna,
                                                                }, { shouldDirty: true });
                                                            }}
                                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex space-x-4">
                                                    <div className="relative w-1/2 mt-1">
                                                        <label className="block text-sm font-medium text-gray-700">Empresa</label>
                                                        <ClienteSearch
                                                            defaultValue={current?.cliente?.nombre ?? ""}
                                                            onSelect={(cliente) =>
                                                                setValue(`dependencias.${index}.cliente`, cliente, { shouldDirty: true })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="mt-1 w-1/2">
                                                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                                        <select
                                                            {...register(`dependencias.${index}.tipo`, { valueAsNumber: true })}
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                        >
                                                            {Object.entries(TIPO_DEPENDENCIA).map(([key, value]) => (
                                                                <option key={value} value={value}>{key.replace(/_/g, " ").toUpperCase()}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between">
                                                <div>
                                                    <div className="text-xs text-gray-900">{tipoLabel(current?.tipo)}</div>
                                                    <div className="text-lg font-medium text-gray-900">{current?.nombre}</div>
                                                    <p className="text-xs text-gray-900">{current?.direccion?.direccionCliente || ""}</p>
                                                    <div className="text-sm text-gray-500">{current?.cliente?.nombre}</div>
                                                    <div className="text-xs">{current?.cliente?.rut}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-6 py-4 w-7/12">
                                        <CargosDependencia control={control} index={index} usuarios={usuarios} />
                                    </div>

                                    <div className="px-6 py-4 whitespace-nowrap text-sm font-medium w-1/12">
                                        {isEditing ? (
                                            <button
                                                type="button"
                                                className="ml-4 text-green-600 text-xl hover:bg-green-100 rounded-md p-2"
                                                onClick={() => setEditingIndex(null)}
                                            >
                                                <FaCheck />
                                            </button>
                                        ) : (
                                            <div className="flex space-x-4 justify-end">
                                                <button
                                                    type="button"
                                                    className="text-xl text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded-md p-2"
                                                    onClick={() => setEditingIndex(index)}
                                                >
                                                    <LuPencil />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-2xl text-red-600 hover:bg-red-100 rounded-md p-2"
                                                    onClick={() => setDeleteIndex(index)}
                                                >
                                                    <MdDeleteForever />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {dependencias.length === 0 && (
                <div className="flex w-full items-center justify-between mt-2">
                    <div className="flex items-center text-sm text-gray-500">
                        <IoIosInformationCircle className="mr-2 text-lg" />
                        NO HAY DEPENDENCIAS AÚN
                    </div>
                </div>
            )}

            <ConfirmModal
                show={deleteIndex !== null}
                confirmationLabel="Eliminar"
                title="Eliminar Dependencia"
                confirmationQuestion={`¿Estás seguro de eliminar la dependencia ${deleteIndex !== null ? watch(`dependencias.${deleteIndex}.nombre`) || "" : ""}?`}
                onClose={() => setDeleteIndex(null)}
                onConfirm={() => {
                    if (deleteIndex !== null) {
                        remove(deleteIndex);
                        if (editingIndex === deleteIndex) setEditingIndex(null);
                    }
                    setDeleteIndex(null);
                }}
            />
        </div>
    );
}
