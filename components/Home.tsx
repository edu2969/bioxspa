"use client";

import { ChecklistProvider } from "./context/ChecklistContext";
import HomeAccessPanel from "./prefabs/HomeAccessPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Nav from "./Nav";

export default function Home() {
    const queryClient = new QueryClient();
    return (<QueryClientProvider client={queryClient}>
        <ChecklistProvider tipo="personal">
            <HomeAccessPanel />
        </ChecklistProvider>
        <Nav />
        <Toaster />
    </QueryClientProvider>)
}