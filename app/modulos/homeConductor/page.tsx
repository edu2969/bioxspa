"use client";
import Link from 'next/link';
import { FaRoute } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';

export default function HomeConductor() {
    const [tienePedidos, setTienePedidos] = useState(false);

    const fetchTienePedidos = async () => {
        try {
            const response = await fetch("/api/home/chofer", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            setTienePedidos(data.tienePedidos);
        } catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    }

    useEffect(() => {
        socket.on("update-pedidos", () => {
            fetchTienePedidos();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, []);

    useEffect(() => {
        fetchTienePedidos();
    }, []);

    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 px-16 md:px-6 max-w-lg mx-auto mt-7">
            <Link href="/modulos/homeConductor/pedidos" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaRoute className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>PEDIDOS</span>
                </div>
                {tienePedidos ? <div className="absolute top-8 right-20 bg-blue-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                    <span className="text-lg mr-1">1</span>
                </div> :
                    <div className="absolute top-8 right-20 bg-green-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                        <span className="text-lg mr-1">0</span>
                    </div>}                
            </Link>
            <Link href="/modulos/comisiones" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <TbReportMoney className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>MIS RENTAS</span>
                </div>
            </Link>  
        </main>
    );
}