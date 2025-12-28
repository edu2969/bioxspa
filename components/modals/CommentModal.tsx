"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import Loader from "../Loader";

export default function CommentModal({
    ventaId,
    setShowCommentModal
}: {
    ventaId: string | null,
    setShowCommentModal: React.Dispatch<React.SetStateAction<boolean>>
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [comentario, setComentario] = useState<string | null>(null);

    const onSaveComment = useCallback(async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/ventas/comentar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ventaId: ventaId,
                    comentario
                })
            });

            const data = await response.json();
            if (data.ok) {
                toast.success("Comentario guardado con éxito");
                setShowCommentModal(false);
            } else {
                toast.error(`Error al guardar el comentario: ${data.error}`);
            }
        } catch (error) {
            console.error("Error en onSaveComment:", error);
        } finally {
            setIsSaving(false);
            setShowCommentModal(false);
            setComentario(null);
        }
    }, [ventaId, comentario, setIsSaving, setShowCommentModal]);

    const onCloseComment = useCallback(() => {
        setShowCommentModal(false);
        setComentario(null);
    }, [setShowCommentModal, setComentario]);

    return (<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="mt-3 text-left">
            <h2 className="w-full flex justify-center text-xl font-bold mb-2">Comentario</h2>
            <textarea
                id="comentario"
                rows={4}
                onChange={(e) => setComentario(e.currentTarget.value)}
                className="w-full border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Escribe tu comentario aquí..."
                value={comentario || ""}
            />
            <div className={`mt-4 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={onSaveComment}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    {isSaving ? <div><Loader texto="ACTUALIZANDO" /></div> : "ACTUALIZAR"}
                </button>
                <button
                    onClick={onCloseComment}
                    disabled={isSaving}
                    className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                    CANCELAR
                </button>
            </div>
        </div>
    </div>);
}