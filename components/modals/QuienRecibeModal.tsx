"use client";

import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { LiaTimesSolid } from "react-icons/lia";

interface FormData {
    nombreRetira: string;
    rutRetiraNum: string;
    rutRetiraDv: string;
}

export default function QuienRecibeModal({
    rutaId,
    onClose
}: {
    rutaId: string;
    onClose: () => void;
}) {
    const { handleSubmit, register } = useForm<FormData>();

    const onSubmit = async (data: FormData) => {
        try {
            await fetch('/api/pedidos/despacho/actualizarRetira', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...data, rutaId })
            });

            toast.success("Información actualizada correctamente");
        } catch (error) {
            console.error("Error updating data:", error);
            toast.error("Error al actualizar la información");
        } finally {
            onClose();
        }
    }

    return (<form onSubmit={handleSubmit(onSubmit)}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                <div className="absolute top-2 right-2">
                    <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                        aria-label="Cerrar"
                        type="button"
                    >
                        <LiaTimesSolid />
                    </button>
                </div>
                <div className="text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Nombre y RUT de quien retira</h3>
                    <div className="mt-2 space-y-4 text-left">
                        <div className="flex flex-col">
                            <label htmlFor="nombreRetira" className="text-sm text-gray-500">Nombre</label>
                            <input
                                {...register("nombreRetira", { required: true })}
                                id="nombreRetira"
                                type="text"
                                className="border rounded-md px-3 py-2 text-base"
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="rutRetira" className="text-sm text-gray-500">RUT</label>
                            <div className="flex space-x-2">
                                <input
                                    id="rutRetiraNum"
                                    {...register("rutRetiraNum", { required: true })}
                                    type="text"
                                    className="border rounded-md px-3 py-2 text-base w-28 text-right"
                                    placeholder="12.345.678"
                                    maxLength={10}
                                />
                                <span className="text-gray-500 font-bold text-lg">-</span>
                                <input
                                    id="rutRetiraDv"
                                    type="text"
                                    className="border rounded-md px-3 py-2 text-base w-10 text-center"
                                    {...register("rutRetiraDv", { required: true })}
                                    placeholder="K"
                                    maxLength={1}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Ejemplo: 12.345.678-K</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            GUARDAR
                        </button>
                        <button
                            onClick={() => onClose()}
                            className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </form>);
}