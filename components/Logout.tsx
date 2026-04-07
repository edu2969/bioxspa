"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "./Loader";
import { IoAlertOutline } from "react-icons/io5";

async function waitForSessionToBeUnauthenticated(timeoutMs = 9000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return true;
        const session = await res.json();
        console.log("Esperando que la sesión se cierre", session);
        if (!session?.user) { 
            console.log("Sesión cerrada, redirigiendo a la página principal");           
            return true;
        }
        await new Promise((res) => setTimeout(res, 150));
    }
    throw new Error("Timeout esperando que la sesión se cierre");
}

export default function LoginOut() {
    const router = useRouter();
    useEffect(() => {
        async function cerrarSesion() {
            try {
                const resp = await waitForSessionToBeUnauthenticated();
                if(resp) {
                    router.replace("/");
                }
            } catch {
                // Ignorar timeout, igual redirigir
            }
        }
        cerrarSesion();
    }, [router]);

    return (
        <main className="absolute w-full flex min-h-screen flex-col items-center justify-between py-8 px-6">
            <div className="h-screen z-10 -mt-24 flex flex-row items-center scale-150">
                <div className="justify-center items-center flex flex-col space-y-4">
                    <IoAlertOutline size="4rem" />
                    <Loader texto="Cerrando sesión" />
                </div>
            </div>
        </main>
    );
}