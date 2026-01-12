"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import Loader from "../Loader";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

export default function CommentModal({
    ventaId,
    comentarioInicial,
    show,
    onSaveComment,
    onClose
}: {
    ventaId: string | null,
    comentarioInicial?: string | null,
    show: boolean;    
    onSaveComment: () => void;
    onClose: () => void;
}) {
    const { register, handleSubmit, reset } = useForm<{ comentario: string }>({
        defaultValues: {
            comentario: comentarioInicial || ""
        }
    });

    // Efecto para resetear el form cuando cambia el comentario inicial
    useEffect(() => {
        reset({ comentario: comentarioInicial || "" });
    }, [comentarioInicial, reset]);

    const { mutate: saveComment, isPending: isSaving } = useMutation({
        mutationFn: async (nuevoComentario: string) => {            
            if (!ventaId) {
                throw new Error('No se especificó el ID de la venta');
            }

            const response = await fetch(`/api/ventas/comentar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ventaId: ventaId,
                    comentario: nuevoComentario
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
                // Invalidar las queries relacionadas con las ventas en tránsito
                onSaveComment();
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

    const onSubmit = (data: { comentario: string }) => {
        saveComment(data.comentario);
    }

    if (!show) return null;

    return (<form onSubmit={handleSubmit(onSubmit)}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center" style={{ zIndex: 101 }}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-4">
                <div className="text-left">
                    <h2 className="w-full flex justify-center text-xl font-bold mb-4">Comentario</h2>
                    <textarea
                        id="comentario"
                        rows={4}
                        {...register("comentario")}
                        className="w-full border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Escribe tu comentario aquí..."
                    />
                    <div className={`mt-4 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {isSaving ? <div><Loader texto="ACTUALIZANDO" /></div> : "ACTUALIZAR"}
                        </button>
                        <button
                            onClick={onClose}
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