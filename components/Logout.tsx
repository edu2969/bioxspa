"use client";

import { useEffect } from "react";
import Loader from "./Loader";
import { IoAlertOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginOut() {
    const router = useRouter();
    const { signOut } = useAuth();

    useEffect(() => {
        async function logout() {
            await signOut();
            router.replace("/");
        }

        logout();
    }, [router, signOut]);

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