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

    const { data: checklist, isLoading: isLoadingChecklist } = useQuery<IChecklistData>({
        queryKey: ["checklist", user?.id],
        queryFn: async () => {
            const r = await fetch("/api/usuarios/checklist");
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
        enabled: !loadingUser && !!user
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