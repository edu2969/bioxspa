import Link from 'next/link';
import { SiTask } from "react-icons/si";
import { TbLockAccess } from 'react-icons/tb';
import { BiSolidOffer } from "react-icons/bi";
import { RiHomeOfficeFill } from 'react-icons/ri';
import { FaTruck } from 'react-icons/fa';

export default function Configuraciones() {
    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-14">
            <Link href="/modulos/sucursales">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <RiHomeOfficeFill className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>SUCURSALES</span>
                </div>
            </Link>
            <Link href="/modulos/comisiones">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <BiSolidOffer className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>COMISIONES</span>
                </div>
            </Link>
            <Link href="/modulos/accesos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <TbLockAccess className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>ACCESOS</span>
                </div>
            </Link>
            <Link href="/modulos/flota">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaTruck className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>FLOTA</span>
                </div>
            </Link>
        </main>
    );
}