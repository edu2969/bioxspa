"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { LiaTimesSolid } from "react-icons/lia";
import Loader from "../Loader";
import RutInput from "../_prefabs/RutInput";

interface FormData {
    nombreRetira: string;
    rutRetira: string;
}

export default function QuienRecibeModal({
    ventaId,
    onClose
}: {
    ventaId: string;
    onClose: () => void;
}) {
    const { handleSubmit, control } = useForm<FormData>();
    const queryClient = useQueryClient();

    const { mutate: saveQuienRecibe, isPending: isSaving } = useMutation({
        mutationFn: async (data: FormData) => {            
            console.log("SUBMITTING DATA:", data);
            const response = await fetch(`/api/pedidos/despacho/actualizarRetira`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ventaId,
                    nombreRecibe: data.nombreRetira,
                    rutRecibe: data.rutRetira
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el comentario');
            }
            return response.json();
        },
        onSuccess: (data) => {
            if (data.ok) {
                toast.success("Comentario guardado con éxito");
                queryClient.invalidateQueries({ queryKey: ['cargamentos-despacho'] });
            } else {
                toast.error(`Error al guardar el comentario: ${data.error}`);
            }
        },
        onError: (error: any) => {
            console.error("Error en saveComment:", error);
            toast.error(error.message || 'Error desconocido al guardar comentario');            
        },
        onSettled: () => {            
            onClose();
        }
    });

    const onSubmit = async (data: FormData) => {
        saveQuienRecibe(data);
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
                            <Controller
                                control={control}
                                name="nombreRetira"
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        id="nombreRetira"
                                        type="text"
                                        className="border rounded-md px-3 py-2 text-base"
                                        placeholder="Nombre completo"
                                    />
                                )}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="rutRetira" className="text-sm text-gray-500">RUT</label>
                            <Controller
                                control={control}
                                name="rutRetira"
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <RutInput
                                        {...field}
                                        className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"                                        
                                    />
                                )}
                            />
                            <p className="text-xs text-gray-400 mt-1">Ejemplo: 12.345.678-K</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            type="submit"
                            className={`flex justify-center items-center relative px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            GUARDAR
                            {isSaving && <div className="absolute -mt-1">
                                <Loader texto=""/></div>}
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