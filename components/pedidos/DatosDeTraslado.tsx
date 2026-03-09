import { UseFormRegister } from "react-hook-form";
import ClienteSearchView from "../prefabs/ClienteSearchView";
import { useState } from "react";
import { IClienteSeachResult } from "../prefabs/types";
import ClientAddressManagerView from "../prefabs/ClientAddressManagerView";
import { INuevaVentaSubmit } from "./types";

export default function DatosDeTraslado({ register }: { register: UseFormRegister<INuevaVentaSubmit> }) {
    const [clienteSelected, setClienteSelected] = useState<IClienteSeachResult | null>(null);
    
    return (<fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Detalle de Traslado</legend>

        {/* MOTIVO DE TRASLADO */}
        <div className="w-full">
            <label htmlFor="motivoTraslado" className="block text-sm font-medium text-gray-700">Motivo de traslado</label>
            <select
                id="motivoTraslado"
                {...register("motivoTraslado", { required: true, valueAsNumber: true })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
            >
                <option value={0}>Seleccione motivo</option>
                <option value={1}>Retiro de cilindros</option>
                <option value={2}>Solo transporte</option>
                <option value={3}>Llenado de cilindros</option>
            </select>
        </div>

        {/* EMPRESA PARA RETIRO */}
        <div className="w-full">
            <ClienteSearchView titulo="Empresa donde se retira" register={register('empresaDondeRetirar')}
            setClienteSelected={setClienteSelected}/>
        </div>

        {/*DIRECCIÓN DONDE RETIRAR */}
        <ClientAddressManagerView label="Dirección de retiro" register={register('direccionRetiroId')} 
            direcciones={clienteSelected?.direccionesDespacho || []}/>
    </fieldset>);
}