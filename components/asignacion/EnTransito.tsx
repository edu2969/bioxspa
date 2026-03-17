"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IRutasEnTransitoResponse } from '@/types/types';
import { useDroppable } from '@dnd-kit/core';
import Loader from '../Loader';
import RutaEnTransito from './enTransito/RutaEnTransito';

export default function EnTransito({ sucursalId, onShowCommentModal } : {
    sucursalId: string;
    onShowCommentModal: (ventaId: string, comentario?: string | null, onSaveComment?: () => void) => void;
}) {
    const queryClient = useQueryClient();
    const { setNodeRef, isOver } = useDroppable({
        id: 'en-transito',
    });

    const { data: rutasEnTransito, isLoading: loadingRutasEnTransito } = useQuery<IRutasEnTransitoResponse[]>({
        queryKey: ['rutas-en-transito', sucursalId],
        queryFn: async () => {
            const response = await fetch(`/api/pedidos/rutasEnTransito?sucursalId=${sucursalId}`);
            if (!response.ok) throw new Error('Failed to fetch rutasEnTransito');
            const data = await response.json(); 
            console.log("Rutas en tránsito:", data.enTransito);           
            return data.enTransito;
        },
        enabled: !!sucursalId
    });

    const onSaveComment = () => {
        queryClient.invalidateQueries({ queryKey: ['rutas-en-transito', sucursalId] });
    }

    return (
        <div 
            ref={setNodeRef}
            className={`relative col-span-5 border rounded-lg p-4 bg-blue-50 shadow-md h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden pt-12 transition-colors duration-200 ${
                isOver ? 'bg-blue-100 border-blue-300' : ''
            }`}
        >
            <div className="absolute -top-0 -left-0 bg-neutral-200 text-gray-700 text-lg font-bold px-3 py-2 rounded-br-md rounded-tl-md tracking-wider">
                EN TRÁNSITO ({rutasEnTransito?.length || "-"})
            </div>
            {loadingRutasEnTransito ? <Loader texto="Cargando flota..." /> : !rutasEnTransito?.length ? (
                <div className="flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
                    <p className="text-gray-500 text-lg font-semibold">NADIE EN RUTA</p>
                </div>
            ) : rutasEnTransito.map((rd, index) => (
                <RutaEnTransito
                    key={`ruta_en_transito_${index}`}
                    rutaId={rd.rutaId}
                    estado={rd.estado}
                    index={index}
                    onShowCommentModal={onShowCommentModal} />
            ))}
        </div>
    );
}
