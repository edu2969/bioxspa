"use client";

import { ChecklistProvider } from "./context/ChecklistContext";
import HomeAccessPanel from "./_prefabs/HomeAccessPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthorization } from "@/lib/auth/useAuthorization";
import { TIPO_CARGO } from "@/app/utils/constants";
import Nav from "./Nav";
import HomeGerencia from "./HomeGerencia";

export default function Home() {
    const auth = useAuthorization();
    const isGerente = auth.hasRole([TIPO_CARGO.gerente]);

    const queryClient = new QueryClient();
    return (<QueryClientProvider client={queryClient}>
        {isGerente ? (
            <HomeGerencia/>
        ) : (
            <ChecklistProvider tipo="personal">
                <HomeAccessPanel />
            </ChecklistProvider>
        )}
        <Nav />
        <Toaster />
    </QueryClientProvider>)
}