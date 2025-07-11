"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "../Loader";
import { IoAlertOutline } from "react-icons/io5";

// filepath: d:/git/bioxspa/components/uix/LoginOut.jsx

async function waitForSessionToBeUnauthenticated(timeoutMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (!session?.user) {
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
                await waitForSessionToBeUnauthenticated();
            } catch {
                // Ignorar timeout, igual redirigir
            }
            router.replace("/");
        }
        cerrarSesion();
    }, [router]);

    return (
        <main className="absolute w-full flex min-h-screen flex-col items-center justify-between py-8 px-6">
            <div className="area z-0">
                <ul className="circles">
                    <li></li><li></li><li></li><li></li><li></li>
                    <li></li><li></li><li></li><li></li><li></li>
                </ul>
            </div>
            <div className="h-screen z-10 -mt-24 flex flex-row items-center scale-150">
                <div className="justify-center items-center flex flex-col space-y-4">
                    <IoAlertOutline size="4rem" />
                    <Loader texto="Cerrando sesión" />
                </div>
            </div>
        </main>
    );
}