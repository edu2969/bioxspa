'use client'
import { signOut } from 'next-auth/react';
import Link from 'next/link'
import { useEffect, useState } from 'react';
import { AiFillHome, AiOutlineMenu, AiOutlineClose, AiFillAliwangwang, AiOutlineLogout } from 'react-icons/ai'
import { usePathname, useRouter } from 'next/navigation'
import { MdOutlinePropaneTank, MdSell } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import { USER_ROLE } from '@/app/utils/constants';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function Nav() {
    const [role, setRole] = useState(0);
    const router = useRouter();
    const [menuActivo, setMenuActivo] = useState(false);  
    const path = usePathname(); 
    const { data: session, status } = useSession();
    
    useEffect(() => {
        if(status === 'loading') return;
        if(session && session.user && session.user?.role) {
            setRole(session.user.role);
        }
    }, [session, setRole, status]);

    return (
        <div className={`w-full absolute top-0 left-0 ${path === '/' ? 'hidden' : 'visible'}`}>
            <div className="absolute">
                <div className="flex">
                    <AiOutlineMenu size="1.7rem" className="m-4 text-slate-800 cursor-pointer"
                        onClick={() => setMenuActivo(true)} />
                </div>
            </div>
            <div className="absolute right-0">                
                <Link href={`/modulos`} onClick={() => setMenuActivo(false)}>
                    <AiFillHome size="1.7rem" className="mt-4 mr-4 text-slate-800 justify-end cursor-pointer" />
                </Link>                
            </div>
            <div className={`w-full h-screen min-w-2xl min-h-full z-50 absolute transition-all bg-[#313A46] p-6 ${menuActivo ? 'left-0' : '-left-full'}`}>
                <AiOutlineClose size="2rem" className="text-white m-auto cursor-pointer absolute top-4 right-4"
                    onClick={() => setMenuActivo(false)} />
                <div className="mt-12 text-white space-y-6">
                    {role == USER_ROLE.gerente && <>
                    <Link href="/modulos/configuraciones" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <IoSettingsSharp size="4rem" />
                            <p className="text-2xl ml-2 mt-4">CONFIGURACIONES</p>
                        </div>
                    </Link>
                    <Link href="/modulos/operacion" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <MdOutlinePropaneTank size="4rem" />
                            <p className="text-2xl ml-2 mt-4">OPERACIÓN</p>
                        </div>
                    </Link>
                    </>}
                    <Link href="/modulos/pedidos/nuevo" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <MdSell size="4rem" />
                            <p className="text-2xl ml-2 mt-4">VENTA</p>
                        </div>
                    </Link>
                    <Link href="/modulos/about" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <AiFillAliwangwang size="4rem" />
                            <p className="text-2xl ml-2 mt-4">Acerca de...</p>
                        </div>
                    </Link>
                    <button className="min-w-2xl flex hover:bg-white hover:text-[#9cb6dd] rounded-md p-2"
                        onClick={async () => { 
                            setMenuActivo(false);
                            signOut({ redirect: false }).then(() => {
                                router.push('/modulos/logingOut'); 
                            });
                        }}>
                        <AiOutlineLogout size="4rem" />
                        <p className="text-2xl ml-2 mt-4">Cerrar sesión</p>
                    </button>
                </div>
                {session?.user && (
                    <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-2">
                        <div className="flex flex-row items-center space-x-4">
                            <div className="flex flex-col text-right">
                                <span className="text-lg text-green-800 font-semibold">{session.user.name}</span>
                                <span className="text-sm text-gray-300">{session.user.email}</span>
                            </div>
                            <Image
                                src={`/profiles/${session.user.email.split('@')[0]}.jpg`}
                                alt="Perfil"
                                className="w-14 h-14 rounded-full object-cover border-2 border-white"
                                width={56}
                                height={56}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}