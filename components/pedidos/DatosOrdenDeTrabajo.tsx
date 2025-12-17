import { UseFormRegister } from "react-hook-form";
import { INuevaVentaSubmit } from "./types";

export default function DatosOrdenDeTrabajo({
    register,
}: {
    register: UseFormRegister<INuevaVentaSubmit>;
}) {
    return (<fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
        <legend className="font-bold text-gray-700 px-2">Detalle de orden</legend>
        <div className="w-full flex-col mt-3 space-y-4">
            <div className="w-full">
                <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Prestador</label>
                <select
                    id="motivo"
                    {...register('motivo')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                >
                    <option value="">Seleccione opción</option>
                    <option value="2">AirLiquide - Coronel</option>
                    <option value="6">Messer - Coronel</option>
                    <option value="8">Messer - Santiago</option>
                    <option value="9">Planta Envasado Biox</option>
                    <option value="10">Linde Gas Chile S.A.</option>
                </select>
            </div>
            <div className="w-full">
                <label htmlFor="controlEnvase" className="block text-sm font-medium text-gray-700">Control de envase</label>
                <input
                    id="controlEnvase"
                    {...register(`controlEnvase`)}
                    type="text"
                    className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right"
                />
            </div>
            <div className="w-full">
                <label htmlFor="servicio" className="block text-sm font-medium text-gray-700">Servicio</label>
                <select
                    id="servicio"
                    {...register('servicio')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                >
                    <option value="">Seleccione servicio</option>
                    <option value="1">Prueba hidrostática</option>
                    <option value="2">Cambio de Válvula</option>
                    <option value="3">Prueba hidrostática y cambio de válvula</option>
                    <option value="4">Recarga cilindros</option>
                </select>
            </div>
        </div>
    </fieldset>);
}