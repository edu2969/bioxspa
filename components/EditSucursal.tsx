"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import { IoIosArrowBack, IoIosInformationCircle } from "react-icons/io";
import { FaRegSave } from "react-icons/fa";
import { IoChevronBack } from "react-icons/io5";
import Loader from "@/components/Loader";
import { useUsuarios } from "@/hooks/useUsuarios";
import { GoogleMapsProvider } from "./providers/GoogleMapProvider";
import { ICargoForm, IDependenciaForm, ISucursalForm } from "./editSucursal/types";
import SucursalInfo from "./editSucursal/SucursalInfo";
import CargosSucursal from "./editSucursal/CargosSucursal";
import DependenciasList from "./editSucursal/DependenciasList";

// Backend returns snake_case rows (with relational aliases). Normalize a cargo row
// to the flat ICargoForm shape used by the form.
const mapCargo = (cargo: any): ICargoForm => {
    const usuario = cargo.usuario ?? cargo.user ?? {};
    return {
        id: cargo.id ?? cargo._id,
        usuarioId: cargo.usuario_id ?? cargo.userId ?? usuario.id ?? "",
        usuario: { id: usuario.id ?? "", nombre: usuario.nombre ?? "", email: usuario.email ?? "" },
        tipo: Number(cargo.tipo),
        desde: cargo.desde ? String(cargo.desde).slice(0, 10) : "",
        hasta: cargo.hasta ? String(cargo.hasta).slice(0, 10) : null,
    };
};

const mapDireccion = (direccion: any) =>
    direccion
        ? {
              id: direccion.id,
              direccionCliente: direccion.direccion_cliente ?? direccion.direccionCliente ?? "",
              placeId: direccion.place_id ?? direccion.placeId,
              latitud: direccion.latitud,
              longitud: direccion.longitud,
              comuna: direccion.comuna,
          }
        : null;

const mapDependencia = (dep: any): IDependenciaForm => ({
    id: dep.id ?? dep._id,
    nombre: dep.nombre ?? "",
    tipo: Number(dep.tipo) || 0,
    operativa: dep.operativa ?? dep.activa ?? true,
    direccion: mapDireccion(dep.direccion),
    cliente: dep.cliente ? { id: dep.cliente.id, nombre: dep.cliente.nombre, rut: dep.cliente.rut } : null,
    cargos: (dep.cargos ?? []).map(mapCargo),
});

export default function EditSucursal() {
    const params = useSearchParams();
    const router = useRouter();
    const sucursalId = params.get("id");

    const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
        useForm<ISucursalForm>({
            defaultValues: { nombre: "", prioridad: 0, visible: true, direccion: null, cargos: [], dependencias: [] },
        });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialAddress, setInitialAddress] = useState<string | null>(null);

    const { usuarios } = useUsuarios();

    const loadSucursal = useCallback(async () => {
        if (!sucursalId) {
            toast.error("No se especificó la sucursal a editar");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`/api/sucursales/${sucursalId}`);
            if (!response.ok) throw new Error("No se pudo cargar la sucursal");
            const { sucursal, dependencias } = await response.json();

            const direccion = mapDireccion(sucursal.direccion);
            reset({
                id: sucursal.id,
                nombre: sucursal.nombre ?? "",
                prioridad: sucursal.prioridad ?? 0,
                visible: sucursal.visible ?? true,
                direccion,
                cargos: (sucursal.cargos ?? []).map(mapCargo),
                dependencias: (dependencias ?? []).map(mapDependencia),
            });
            setInitialAddress(direccion?.direccionCliente ?? null);
        } catch (error) {
            console.error("Error cargando sucursal:", error);
            toast.error("Error al cargar la sucursal");
        } finally {
            setLoading(false);
        }
    }, [sucursalId, reset]);

    useEffect(() => {
        loadSucursal();
    }, [loadSucursal]);

    const onSubmit = async (data: ISucursalForm) => {
        if (!sucursalId) return;
        try {
            setSaving(true);
            const response = await fetch(`/api/sucursales/${sucursalId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "No se pudo guardar la sucursal");
            }
            toast.success("Sucursal guardada correctamente");
            router.back();
        } catch (error) {
            console.error("Error guardando sucursal:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    return (
        <GoogleMapsProvider>
            <main className="w-full h-screen pt-3">
                <Toaster position="top-right" />
                <div className="ml-24">
                    <button
                        type="button"
                        className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-semibold"
                        onClick={() => router.back()}
                    >
                        <IoChevronBack size="1.25rem" />Volver
                    </button>
                </div>
                <div className="w-full h-[calc(100vh-80px)] overflow-y-scroll">
                    <h2 className="text-lg font-medium text-gray-700 flex items-center ml-4 mt-4">
                        <IoIosInformationCircle className="text-2xl mr-2" />
                        INFORMACIÓN PRINCIPAL
                    </h2>
                    {loading ? (
                        <Loader texto="Cargando..." />
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="px-4">
                            <SucursalInfo
                                errors={errors}
                                register={register}
                                setValue={setValue}
                                initialAddress={initialAddress}
                            />

                            <CargosSucursal control={control} usuarios={usuarios} />

                            <DependenciasList
                                control={control}
                                register={register}
                                setValue={setValue}
                                watch={watch}
                                usuarios={usuarios}
                            />

                            <div className="sticky bottom-0 w-full flex justify-end bg-white p-2">
                                <div className="w-96 flex">
                                    <button
                                        type="button"
                                        className="flex w-1/2 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                                        onClick={() => router.back()}
                                    >
                                        <IoIosArrowBack size="1.15rem" className="mt-0.5 mr-3" />VOLVER
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex w-1/2 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1 disabled:opacity-50"
                                    >
                                        <FaRegSave size="1.15rem" className="mt-0.5 mr-3" />{saving ? "GUARDANDO..." : "GUARDAR"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </GoogleMapsProvider>
    );
}
