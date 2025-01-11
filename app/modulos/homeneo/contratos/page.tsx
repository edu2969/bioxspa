'use client'
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaPlus, FaUserCircle } from "react-icons/fa";
import { CONTRACT_STATUS } from "@/app/utils/constants";
import { RiPencilFill } from "react-icons/ri";
import { SiTask } from "react-icons/si";
import 'react-circular-progressbar/dist/styles.css';
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { useSearchParams } from "next/navigation";
import { GiNightSleep } from "react-icons/gi";

export default function Contratos() {
    const [contracts, setContracts] = useState<ContractItemListType[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const initData = useRef(false);
    const params = useSearchParams();

    async function getContracts() {
        const res = await fetch(`/api/contracts`)
        res.json().then((data: ContractItemListType[] | any) => {
            console.log("DATA", data);
            setContracts(data.contracts);
            setLoadingList(false);
        });
    }

    const nombreEstado = (valor: number) => {
        return Object.keys(CONTRACT_STATUS).find(key => CONTRACT_STATUS[key as keyof typeof CONTRACT_STATUS] === valor)?.toUpperCase();
    }

    const statusColors = ["bg-yellow-300", "bg-green-500", "bg-gray-400", "bg-blue-400", "bg-red-500"];

    useEffect(() => {
        if (!initData.current) {
            initData.current = true
            getContracts();
        }
    }, [])

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">            
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                            <div className="flex items-start space-x-4 text-ship-cove-800 pt-4">
                                <Link href="/modulos">
                                    <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                                </Link>
                                <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">CONTRATOS</span>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="table-search" className="sr-only">Search</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                    </svg>
                                </div>
                                <input type="text" id="table-search-users" className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Codigo/Nombre" />
                            </div>
                        </div>
                        <Link href="/modulos/homeneo/contratos/edicion">
                            <button className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                type="submit">
                                <FaPlus size="1rem" className="mt-1" /><span className="mt-0">&nbsp;Nuevo</span>
                            </button>
                        </Link>
                    </div>
                    <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <div className="w-full text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-2/12 py-2 pl-3">
                                    CLIENTE
                                </div>
                                <div className="w-6/12 py-2 pl-3">
                                    TITULO
                                </div>
                                <div className="w-1/12 py-2 pl-3 text-center">
                                    RENTABILIDAD
                                </div>
                                <div className="w-3/12 py-2 text-center">ACCIONES</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        {contracts && contracts.map(contract => (
                            <div key={contract.id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600">
                                <div className="w-2/12 flex items-center pl-4 text-gray-900 whitespace-nowrap dark:text-white">
                                    {contract.clientImg && <img className="w-10 h-10 rounded-full" src={contract.clientImg} alt={`${contract.clientName} avatar`} />}
                                    {contract.clientImg == "" && <FaUserCircle className="w-10 h-10 text-slate-400" size="1em" />}
                                    <div className="ps-3">
                                        <div className="text-base font-semibold">{contract.clientName}</div>
                                    </div>
                                </div>
                                <div className="w-6/12 px-2 flex items-center uppercase">
                                    <div>
                                        <p className="uppercase font-extrabold text-md">{contract.title}</p>
                                        <div className="flex items-center text-xs">
                                            <div className={`h-2.5 w-2.5 rounded-full me-2 ${statusColors[contract.status]}`}></div>
                                            {nombreEstado(contract.status)}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-1/12 text-center pt-5">
                                    <p className="orbitron text-3xl">32<small>%</small></p>
                                </div>
                                <div className="w-3/12 flex justify-center text-center mt-2 py-2">
                                    <Link href={{
                                        pathname: "/modulos/homeneo/contratos/edicion",
                                        query: { _id: contract.id }
                                    }} className="hover:text-blue-400 shadow-xl rounded-xl w-24 h-14 mr-2">
                                        <RiPencilFill size="1.5rem" className="mx-auto" /><span className="text-xs">EDIT</span>
                                    </Link>
                                    <Link href={{
                                        pathname: "/modulos/homeneo/proyectos",
                                        query: { contractId: contract.id }
                                    }} className="hover:text-blue-400 shadow-xl rounded-xl w-24 h-14">
                                        <SiTask size="1.5rem" className="mx-auto" /><span className="text-xs">PROYECTOS</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {contracts.length === 0 && !loadingList && (<div className="flex justify-center py-10">
                            <GiNightSleep size="3rem" />
                            <p className="text-xl mt-2 ml-4 uppercase">Sin contratos</p></div>)}
                    </div>
                </div>
            </div>
        </main>
    )
}