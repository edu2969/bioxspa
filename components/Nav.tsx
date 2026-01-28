'use client'

import Link from 'next/link'
import { useState } from 'react';
import { AiFillHome, AiOutlineMenu, AiOutlineClose, AiFillAliwangwang, AiOutlineLogout } from 'react-icons/ai'
import { usePathname, useRouter } from 'next/navigation'
import { MdOutlinePropaneTank, MdSell } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { RESOURCES, ACTIONS, ROLES } from '@/lib/auth/permissions';
import { Can } from '@/lib/auth/AuthorizationComponents';
import Image from 'next/image';
import { BsQrCodeScan } from 'react-icons/bs';
import PowerScanView from './prefabs/powerScan/PowerScanView';
import { supabase } from '@/lib/supabase';

export default function Nav() {
    const [menuActivo, setMenuActivo] = useState(false);
    const path = usePathname();
    const auth = useAuthorization();
    const [scanMode, setScanMode] = useState(false);
    const router = useRouter();

    const activateSuperScanMode = () => {
        setScanMode(true);
        setMenuActivo(false);
    }

    return (
        <div className={`w-full absolute top-0 left-0 ${path === '/' ? 'hidden' : 'visible'}`} style={{ zIndex: 201 }}>
            <div className="absolute">
                <div className="flex">
                    <AiOutlineMenu size="1.7rem" className="m-4 text-slate-800 cursor-pointer"
                        onClick={() => setMenuActivo(true)} />
                </div>
            </div>
            <div className="absolute right-0">
                <Link href={`/pages`} onClick={() => setMenuActivo(false)}>
                    <AiFillHome size="1.7rem" className="mt-4 mr-4 text-slate-800 justify-end cursor-pointer" />
                </Link>
            </div>
            <div className={`w-full h-screen min-w-2xl min-h-full z-50 absolute transition-all bg-[#313A46] p-6 ${menuActivo ? 'left-0' : '-left-full'}`}>
                <AiOutlineClose size="2rem" className="text-white m-auto cursor-pointer absolute top-4 right-4"
                    onClick={() => setMenuActivo(false)} />
                <div className="mt-12 text-white space-y-6">
                    <Can resources={[RESOURCES.CONFIGURACION]} actions={[ACTIONS.READ]}>
                        <Link href="/pages/configuraciones" onClick={() => setMenuActivo(false)}>
                            <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer bg-slate-500 shadow-sm">
                                <IoSettingsSharp size="4rem" />
                                <p className="text-2xl mx-6 mt-4">CONFIGURACIONES</p>
                            </div>
                        </Link>
                    </Can>
                    
                    <Can resources={[RESOURCES.INVENTARIO]} actions={[ACTIONS.READ]}>
                        <Link href="/pages/operacion" onClick={() => setMenuActivo(false)}>
                            <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer bg-slate-500 shadow-sm">
                                <MdOutlinePropaneTank size="4rem" />
                                <p className="text-2xl mx-6 mt-4">OPERACIÓN</p>
                            </div>
                        </Link>
                    </Can>
                    <Link href="/pages/pedidos/nuevo" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer bg-slate-500 shadow-sm">
                            <MdSell size="4rem" />
                            <p className="text-2xl mx-6 mt-4">VENTA</p>
                        </div>
                    </Link>

                    <button onClick={() => {
                        activateSuperScanMode();
                    }}
                        className="w-full flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer bg-slate-500 shadow-sm mt-2">
                        <BsQrCodeScan size="4rem" />
                        <p className="text-2xl mx-6 mt-4">Power Scan</p>
                    </button>
                    <Link href="/pages/about" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer bg-slate-500 shadow-sm mt-2">
                            <AiFillAliwangwang size="4rem" />
                            <p className="text-2xl mx-6 mt-4">Acerca de...</p>
                        </div>
                    </Link>
                    <div className="min-w-2xl flex hover:bg-white hover:text-[#9cb6dd] rounded-md px-2 m-0 bg-slate-500 shadow-sm"
                        onClick={async () => {
                            setMenuActivo(false);
                            try {
                                await supabase.auth.signOut(); // Cerrar sesión con Supabase
                                router.replace("/"); // Redirigir a la página principal
                            } catch (error) {
                                console.error("Error al cerrar sesión:", error);
                            }
                        }}>
                        <AiOutlineLogout size="4rem" />
                        <p className="text-2xl mx-6 my-4">Cerrar sesión</p>
                    </div>
                </div>
                {auth.user && (
                    <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-2">
                        <div className="flex flex-row items-center space-x-4">
                            <div className="flex flex-col text-right">
                                <span className="text-lg text-green-800 font-semibold">{auth.user.nombre}</span>
                                <span className="text-sm text-gray-300">{auth.user.email}</span>
                            </div>
                            <Image
                                src={`/profiles/${auth.user.email.split('@')[0]}.jpg`}
                                alt="Perfil"
                                className="w-14 h-14 rounded-full object-cover border-2 border-white"
                                width={56}
                                height={56}
                            />
                        </div>
                    </div>
                )}
            </div>
            {scanMode && 
            <PowerScanView 
                scanMode={scanMode} setScanMode={setScanMode} rutaId={null} ventaId={null}
                operacion="gestionar" />}
        </div>
    )
}