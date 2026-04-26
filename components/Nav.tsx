'use client'

import Link from 'next/link'
import { useState } from 'react';
import { AiFillHome, AiOutlineMenu, AiOutlineClose, AiFillAliwangwang, AiOutlineLogout } from 'react-icons/ai'
import { usePathname, useRouter } from 'next/navigation'
import { MdOutlinePropaneTank, MdSell } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import { useAuthorization } from '@/lib/auth/useAuthorization';
import { RESOURCES, ACTIONS } from '@/lib/auth/permissions';
import { Can } from '@/lib/auth/AuthorizationComponents';
import Image from 'next/image';
import { BsQrCodeScan } from 'react-icons/bs';
import PowerScanView from './_prefabs/powerScan/PowerScanView';
import SoundPlayerProvider from './context/SoundPlayerContext';

export default function Nav() {
    const [menuActivo, setMenuActivo] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const path = usePathname();
    const auth = useAuthorization();
    const [scanMode, setScanMode] = useState(false);
    const router = useRouter();    

    const menuItemClass = "w-full min-h-20 rounded-md bg-slate-500 shadow-sm text-white hover:bg-white hover:text-[#313A46] transition-colors flex flex-col justify-center items-center";
    const menuItemContentClass = "h-full w-full px-4 py-3 flex items-center gap-4 text-left";
    const menuLabelClass = "text-xl font-semibold leading-tight";
    const menuIconClass = "shrink-0";

    const activateSuperScanMode = () => {
        setScanMode(true);
        setMenuActivo(false);
    }

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        setMenuActivo(false);

        try {
            // Cierra sesión server-side para limpiar cookies httpOnly si existen.
            await fetch('/api/auth/login', {
                method: 'DELETE',
                credentials: 'include',
            });

            // Navegación dura para asegurar estado limpio en toda la app.
            router.push('/pages/logout');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            setIsLoggingOut(false);
        }
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
            <div className={`w-full md:w-96 h-screen min-w-2xl min-h-full z-50 absolute transition-all bg-[#313A46] p-6 ${menuActivo ? 'left-0' : '-left-full'}`}>
                <AiOutlineClose size="2rem" className="text-white m-auto cursor-pointer absolute top-4 right-4"
                    onClick={() => setMenuActivo(false)} />
                <div className="mt-12 grid grid-cols-1 gap-3 text-white">
                    <Can resources={[RESOURCES.CONFIGURACION]} actions={[ACTIONS.READ]}>
                        <Link href="/pages/configuraciones" onClick={() => setMenuActivo(false)}>
                            <div className={menuItemClass}>
                                <div className={menuItemContentClass}>
                                    <IoSettingsSharp size="2.25rem" className={menuIconClass} />
                                    <p className={menuLabelClass}>CONFIGURACIONES</p>
                                </div>
                            </div>
                        </Link>
                    </Can>
                    
                    <Can resources={[RESOURCES.INVENTARIO]} actions={[ACTIONS.READ]}>
                        <Link href="/pages/operacion" onClick={() => setMenuActivo(false)}>
                            <div className={menuItemClass}>
                                <div className={menuItemContentClass}>
                                    <MdOutlinePropaneTank size="2.25rem" className={menuIconClass} />
                                    <p className={menuLabelClass}>OPERACION</p>
                                </div>
                            </div>
                        </Link>
                    </Can>
                    <Link href="/pages/pedidos/nuevo" onClick={() => setMenuActivo(false)}>
                        <div className={menuItemClass}>
                            <div className={menuItemContentClass}>
                                <MdSell size="2.25rem" className={menuIconClass} />
                                <p className={menuLabelClass}>VENTA</p>
                            </div>
                        </div>
                    </Link>

                    <button onClick={() => {
                        activateSuperScanMode();
                    }}
                        className={menuItemClass}>
                        <div className={menuItemContentClass}>
                            <BsQrCodeScan size="2rem" className={menuIconClass} />
                            <p className={menuLabelClass}>POWER SCAN</p>
                        </div>
                    </button>
                    <Link href="/pages/about" onClick={() => setMenuActivo(false)}>
                        <div className={menuItemClass}>
                            <div className={menuItemContentClass}>
                                <AiFillAliwangwang size="2.5rem" className={menuIconClass} />
                                <p className={menuLabelClass}>ACERCA DE</p>
                            </div>
                        </div>
                    </Link>
                    <button
                        type="button"
                        disabled={isLoggingOut}
                        className={`${menuItemClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                        onClick={handleLogout}
                    >
                        <div className={menuItemContentClass}>
                            <AiOutlineLogout size="2.25rem" className={menuIconClass} />
                            <p className={menuLabelClass}>{isLoggingOut ? 'CERRANDO SESION...' : 'CERRAR SESION'}</p>
                        </div>
                    </button>
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
            {scanMode && <SoundPlayerProvider>
                <PowerScanView 
                    scanMode={scanMode} setScanMode={setScanMode} rutaId={null} ventaId={null}
                    operacion="gestionar" />
                </SoundPlayerProvider>}
        </div>
    )
}