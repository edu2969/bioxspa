"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChecklistModal from "../modals/ChecklistModal";

interface ChecklistContextType {
    tipo: 'personal' | 'vehiculo';
}

const ChecklistContext = createContext<ChecklistContextType | null>(null);

export function ChecklistProvider({ tipo, children }: { 
    tipo: 'personal' | 'vehiculo'; 
    children: React.ReactNode 
}) {
    const [showModal, setShowModal] = useState(false);

    const { data: checklist, isLoading: isLoadingChecklist } = useQuery({
        queryKey: ["checklist"],
        queryFn: async () => {
            const r = await fetch("/api/users/checklist");
            const data = await r.json();
            return data;
        }
    });

    useEffect(() => {
        if (!isLoadingChecklist 
            && !checklist.passed 
            && checklist.checklists.every((cl: {
                tipo: string;
                aprobado: boolean;
            }) => cl.tipo !== tipo)) {
            setShowModal(true);
        }
    }, [isLoadingChecklist, checklist]);

    return (
        <ChecklistContext.Provider value={{ tipo }}>
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