"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChecklistModal from "../modals/ChecklistModal";
import { TIPO_CHECKLIST } from "@/app/utils/constants";
import { useUser } from "../providers/UserProvider";

interface IChecklistData {
    ok: boolean;
    passed: boolean;
    checklists: Array<{ tipo: number; passed: boolean; created_at?: string }>;
}

interface ChecklistContextType {
    tipo: 'personal' | 'vehiculo';
    checklist: IChecklistData | null;
    isLoadingChecklist: boolean;
    hasApprovedChecklist: (tipoChecklist: number) => boolean;
}

const ChecklistContext = createContext<ChecklistContextType | null>(null);

export function ChecklistProvider({ tipo, children }: { 
    tipo: 'personal' | 'vehiculo'; 
    children: React.ReactNode 
}) {
    const [showModal, setShowModal] = useState(false);
    const { user, loading: loadingUser } = useUser();
    // La fecha del día se incluye en la key para que React Query invalide
    // automáticamente al cambiar de día sin necesidad de reload manual en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const { data: checklist, isLoading: isLoadingChecklist } = useQuery<IChecklistData>({
        queryKey: ["checklist", user?.id, today],
        queryFn: async () => {
            // cache: 'no-store' evita que el navegador devuelva la respuesta
            // HTTP cacheada del día anterior sin consultar al servidor.
            const r = await fetch("/api/usuarios/checklist", { cache: 'no-store' });
            if (!r.ok) {
                if (r.status === 401) {
                    return { ok: false, passed: true, checklists: [] };
                }
                throw new Error("No se pudo cargar el checklist");
            }
            const data = await r.json();
            console.log("Checklist data:", data);
            return data;
        },
        enabled: !loadingUser && !!user,
        staleTime: 0,              // Siempre considerado stale → refetch al montar
        refetchOnMount: 'always',  // Refetch cada vez que el componente monta (cambio de pantalla)
        refetchOnWindowFocus: true,
    });

    const hasApprovedChecklist = (tipoChecklist: number) => {
        if (!checklist?.checklists) return false;
        return checklist.checklists.some((c) => c.tipo === tipoChecklist && !!c.passed);
    };

    useEffect(() => {
        if (loadingUser || !user || isLoadingChecklist || !checklist) {
            return;
        }

        if (!checklist.passed) {
            console.log("TIPO", tipo, checklist.checklists);
            if (tipo === 'personal' && checklist.checklists?.find((c: { tipo: number, passed: boolean }) => c.tipo === TIPO_CHECKLIST.personal && c.passed)) {
                return;
            }
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [loadingUser, user, isLoadingChecklist, checklist, tipo]);

    return (
        <ChecklistContext.Provider value={{ tipo, checklist: checklist || null, isLoadingChecklist, hasApprovedChecklist }}>
            {children}
            {showModal === true && (
                <ChecklistModal tipo={tipo} onFinish={() => setShowModal(false)} />
            )}
        </ChecklistContext.Provider>
    );
}

export function useChecklist() {
    const ctx = useContext(ChecklistContext);
    if (!ctx) throw new Error("ChecklistContext not found");
    return ctx;
}