import Link from 'next/link';
import { FaUsers } from "react-icons/fa";
import { SiTask } from "react-icons/si";
import { FaFileContract } from "react-icons/fa";
import { TbLockAccess } from 'react-icons/tb';

export default function HomeAdministrador() {
    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-14">
            <Link href="/modulos/homeneo/proyectos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <SiTask className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>PROYECTOS</span>
                </div>
            </Link>
            <Link href="/modulos/homeneo/contratos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaFileContract className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>CONTRATOS</span>
                </div>
            </Link>
            <Link href="/modulos/homeneo/clientes">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaUsers className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>CLIENTES</span>
                </div>
            </Link>
            <Link href="/modulos/homeneo/usuarios">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <TbLockAccess className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>Accesos</span>
                </div>
            </Link>
        </main>
    );
}