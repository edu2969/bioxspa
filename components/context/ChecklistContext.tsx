"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ChecklistModal from "../prefabs/ChecklistModal";

// Ajusta estos tipos según tus constantes y modelos
type ChecklistTipo = "vehiculo" | "personal";
interface ChecklistItem {
    [key: string]: number | boolean | string;
}

interface ChecklistData {
    tipo: ChecklistTipo;
    vehiculoId?: string;
    kilometraje?: number;
    items: ChecklistItem;
}

interface ChecklistContextType {
    tipo: 'personal' | 'vehiculo';
    passed: boolean | null;
    showModal: boolean;
    data: ChecklistData;
    setData: (d: ChecklistData) => void;
    submitData: () => Promise<void>;
    isSubmitting: boolean;
}

const ChecklistContext = createContext<ChecklistContextType | null>(null);

export function ChecklistProvider({ tipo, children }: { 
    tipo: 'personal' | 'vehiculo'; 
    children: React.ReactNode 
}) {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<ChecklistData>({
        tipo: "vehiculo",
        vehiculoId: "",
        kilometraje: undefined,
        items: {},
    });

    const { data: checklist, isLoading: isLoadingChecklist } = useQuery({
        queryKey: ["checklist"],
        queryFn: async () => {
            const r = await fetch("/api/users/checklist");
            const data = await r.json();
            console.log("Data", data);
            return data;
        },
        staleTime: 1000 * 60,
    });

    const mutation = useMutation({
        mutationFn: async () => {
            console.log("DATA", data);
            await fetch("/api/users/checklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            setShowModal(false);
        }
    });

    const submitData = async () => {
        await mutation.mutateAsync();
    };

    useEffect(() => {
        console.log("Checklist data:", isLoadingChecklist, checklist);
        if (!isLoadingChecklist && checklist && !checklist.passed) {
            setShowModal(true);
        }
    }, [isLoadingChecklist, checklist]);

    return (
        <ChecklistContext.Provider
            value={{
                passed: checklist?.passed ?? null,
                tipo,
                showModal,
                data,
                setData,
                submitData,
                isSubmitting: mutation.isPending,
            }}
        >
            {children}            
            {showModal === true && <ChecklistModal
                onFinish={() => setShowModal(false)}
                tipo={tipo}
            />}
        </ChecklistContext.Provider>
    );
}

export function useChecklist() {
    const ctx = useContext(ChecklistContext);
    if (!ctx) throw new Error("ChecklistContext not found");
    return ctx;
}