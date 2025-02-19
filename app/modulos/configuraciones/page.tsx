import Link from 'next/link';
import { HiUserGroup } from "react-icons/hi";
import { TbLockAccess } from 'react-icons/tb';
import { BiSolidOffer } from "react-icons/bi";
import { RiHomeOfficeFill } from 'react-icons/ri';
import { FaTruck } from 'react-icons/fa';
import { LuFileJson2 } from 'react-icons/lu';

export default function Configuraciones() {
    return (
        <main className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 p-2 md:p-6 max-w-2xl mx-auto mt-14">
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
            <Link href="/modulos/configuraciones/flota">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <FaTruck className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>FLOTA</span>
                </div>
            </Link>
            <Link href="/modulos/configuraciones/clientes">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <HiUserGroup className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>CLIENTES</span>
                </div>
            </Link>            
            <Link href="/modulos/configuraciones/importacion">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <LuFileJson2 className="mx-auto mb-1" size="6rem" />
                    </div>
                    <span>IMPORTAR DATA</span>
                </div>
            </Link>
        </main>
    );
}