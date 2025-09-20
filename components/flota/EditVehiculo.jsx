"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { FaRegSave } from "react-icons/fa";
import { IoChevronBack } from "react-icons/io5";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";



export default function EditVehiculo({ vehiculoId }) {
    const [vehiculo, setVehiculo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, setValue, reset } = useForm();
    const router = useRouter();
    const scrollRef = useRef(null);

    useEffect(() => {
        console.log("vehiculoId:", vehiculoId);
        if (vehiculoId) {
            setLoading(true);
            fetch(`/api/flota/${vehiculoId}`)
                .then(res => res.json())
                .then(data => {
                    console.log("DATA", data);
                    setVehiculo(data.vehiculo);
                    Object.entries(data.vehiculo).forEach(([key, value]) => {
                        if (typeof value === "object" && value !== null && value._id) {
                            setValue(key, value._id);
                        } else if (key === "choferIds" && Array.isArray(value)) {
                            setValue(key, value.map(v => v?._id || v));
                        } else if (key === "posicionActual" && value) {
                            setValue("latitud", value.latitud ?? "");
                            setValue("longitud", value.longitud ?? "");
                        } else if (value !== undefined) {
                            setValue(key, value ?? "");
                        }
                    });                    
                })
                .catch((error) => toast.error("Error al cargar vehículo", error))
                .finally(() => setLoading(false));
        }
    }, [vehiculoId, setValue]);

    useEffect(() => {
        if (vehiculo) {
            Object.entries(vehiculo).forEach(([key, value]) => {
                if(["revisionTecnica", "fechaVencimientoExtintor"].includes(key)) {
                    const date = value ? new Date(value) : null;
                    const formattedDate = date ? date.toISOString().split('T')[0] : "";
                    setValue(key, formattedDate);
                } else setValue(key, value ?? "");
            });
        } else {
            reset();
        }
    }, [vehiculo, setValue, reset]);

    const onSubmit = async (data) => {
        setSaving(true);
        // Combina latitud/longitud en posicionActual
        data.posicionActual = {
            latitud: Number(data.latitud) || null,
            longitud: Number(data.longitud) || null,
        };
        delete data.latitud;
        delete data.longitud;
        data.choferIds = Array.isArray(data.choferIds)
            ? data.choferIds.filter(Boolean)
            : data.choferIds ? [data.choferIds] : [];
        try {
            const response = await fetch("/api/flota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, _id: vehiculoId }),
            });
            const result = await response.json();
            if (result.ok) {
                toast.success("Vehículo guardado correctamente");
                router.back();
            } else {
                toast.error("Error al guardar el vehículo");
            }
        } catch {
            toast.error("Error al guardar el vehículo");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                        onClick={() => router.back()}
                    >
                        <IoChevronBack size="1.25rem" className="mr-2" />Volver
                    </button>
                    <h2 className="text-xl font-bold ml-4">Edición de Vehículo</h2>
                </div>
                {loading && <Loader texto="Cargando..." />}
                {!loading && (
                    <div ref={scrollRef} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Patente</label>
                                <input {...register("patente", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Marca</label>
                                <input {...register("marca", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Modelo</label>
                                <input {...register("modelo", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">N° Motor</label>
                                <input {...register("nmotor")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">N° Chasis</label>
                                <input {...register("numeroChasis")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Año</label>
                                <input {...register("ano")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Revisión Técnica</label>
                                <input type="date" {...register("revisionTecnica", { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Vencimiento Extintor</label>
                                <input type="date" {...register("fechaVencimientoExtintor")} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline-green-600 sm:text-sm" />
                            </div>                            
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                onClick={() => router.back()}
                            >
                                CANCELAR
                            </button>
                            <button
                                type="submit"
                                className="flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                disabled={saving}
                            >
                                <FaRegSave className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                                {saving && <Loader texto="" />}
                            </button>
                        </div>
                    </div>
                )}
            </form>
            <ToastContainer />
        </div>
    );
}