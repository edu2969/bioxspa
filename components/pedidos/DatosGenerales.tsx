"use client";

import { TIPO_CARGO } from "@/app/utils/constants";
import { IUser } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { ISucursal } from "@/types/sucursal";
import { INuevaVentaSubmit } from "./types";
import { Selector } from "../prefabs/Selector";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useAuthorization } from "@/lib/auth/useAuthorization";
import { useEffect } from "react";

export default function DatosGenerales({
    register,
    setValue
}: {
    register: UseFormRegister<INuevaVentaSubmit>;
    setValue: UseFormSetValue<INuevaVentaSubmit>;
}) {
    const { user, hasRole } = useAuthorization();

    const { data: sucursales, isLoading: loadingSucursales } = useQuery<ISucursal[]>({
        queryKey: ['sucursales-a-cargo'],
        queryFn: async () => {
            const response = await fetch('/api/sucursales/aCargo');
            const data = await response.json();
            return data.sucursales;
        }
    });

    const { data: usuarios, isLoading: loadingUsuarios } = useQuery<IUser[]>({
        queryKey: ['usuarios-lista'],
        queryFn: async () => {
            if(!user) return [];
            const response = await fetch('/api/usuarios');
            const data = await response.json();
            console.log("Usuarios fetched:", data);
            return data.usuarios;
        },
        enabled: hasRole([TIPO_CARGO.encargado, TIPO_CARGO.gerente, TIPO_CARGO.neo])
    });

    useEffect(() => {
        if (!loadingSucursales && sucursales && sucursales.length > 0) {
            const stored = typeof window !== "undefined" ? localStorage.getItem("sucursalId") : null;
            const defaultId = stored && sucursales.some(s => s.id === stored)
                ? stored
                : sucursales[0].id;
            setValue("sucursalId", defaultId);
        }
    }, [loadingSucursales, sucursales, setValue]);

    return (<fieldset className="border rounded-md px-4 pb-4 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Datos Generales</legend>

        {hasRole([TIPO_CARGO.gerente]) &&
            <Selector options={usuarios || []}
                label="Seleccione usuario*"
                getLabel={u => u.name}
                getValue={u => u.id || ''}
                register={register("usuarioId", { required: true })}
                isLoading={loadingUsuarios} />}

        <Selector options={sucursales || []}
            label="Sucursal"
            getLabel={s => s.nombre}
            getValue={s => s.id}
            register={register("sucursalId", { required: true })}
            onChange={val => {
                setValue("sucursalId", val);
                localStorage.setItem("sucursalId", val);
            }}
            isLoading={loadingSucursales} />

        <div className="w-full">
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
                id="tipo"
                {...register('tipo', { valueAsNumber: true, required: true })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
            >
                <option>Seleccione tipo</option>
                <option value={1}>Venta</option>
                <option value={2}>Traslado</option>
                <option value={3}>Órden de Trabajo</option>
                <option value={4}>Cotización</option>
            </select>
        </div>

        <div className="w-full">
            <label htmlFor="comentario" className="w-full text-sm font-medium text-gray-700">Comentario</label>
            <textarea
                id="comentario"
                {...register('comentario')}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                placeholder="Comentario para la venta"
            ></textarea>
        </div>
    </fieldset>);
}