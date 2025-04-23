"use client";
import Link from 'next/link';
import { FaSignInAlt } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa";
import { TbReportMoney } from 'react-icons/tb';
import { useEffect, useState } from 'react';

export default function HomeAdministrador() {
    const [borradorCount, setBorradorCount] = useState(0);

    useEffect(() => {
        async function fetchCounters() {
            try {
                const response = await fetch('/api/home/administrador');
                const data = await response.json();
                if (data.ok && data.resultado) {
                    setBorradorCount(data.resultado[0].flota || 0);
                }
            } catch (error) {
                console.error('Error fetching counters:', error);
            }
        }

        fetchCounters();
    }, []);

    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-7">
            <Link href="/modulos/pedidos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaFileContract className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>PEDIDOS</span>
                </div>
            </Link>
            <Link href="/modulos/flota" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaSignInAlt className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>ASIGNACION</span>
                </div>
                {borradorCount > 0 && (
                    <div className="absolute top-6 -right-10 bg-red-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                        <span className="text-sm mr-1">{borradorCount > 999999 ? '999999+' : borradorCount}</span> 
                        <span className="text-xs">POR ASIGNAR</span>
                    </div>
                )}
            </Link>            
            <Link href="/modulos/deudas">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <TbReportMoney className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>DEUDAS</span>
                </div>
            </Link>
        </main>
    );
}