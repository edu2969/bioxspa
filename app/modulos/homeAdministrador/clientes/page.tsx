'use client'
import Loader from "@/components/Loader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaPlus, FaUserCircle } from "react-icons/fa";

export default function Clientes() {
    const [loadingList, setLoadingList] = useState(true);
    const [clients, setClients] = useState<ClientItemListType[]>([]);

    async function getClients() {
        const res = await fetch(`/api/clients`)
        res.json().then((data: any) => {
            setClients(data.clients)
            console.log("CLIENTES", data.clients);
            setLoadingList(false);
        });
    }

    useEffect(() => {
        getClients();
    }, []);

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <div className="w-[720px] p-6 m-auto">
                <div className="relative shadow-md sm:rounded-lg p-2">                    
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
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
                        <Link href="/modulos/homeneo/clientes/edicion">
                            <button className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            type="submit">
                                <FaPlus size="1rem" className="mt-1"/><span className="mt-0">&nbsp;Nuevo</span>
                            </button>
                        </Link>
                    </div>
                    <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        {(!loadingList && clients.length > 0) && <div className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-3/6 px-6 py-3">
                                    Nombre
                                </div>
                                <div className="w-2/6 px-6 py-3">
                                    email
                                </div>
                                <div className="w-1/6 px-6 py-3">
                                    Acción
                                </div>
                            </div>
                        </div>}
                        <div>
                            {clients.map(client => (
                                <div key={client.id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <div className="w-3/6 flex items-center px-6 py-4 text-gray-900 whitespace-nowrap dark:text-white">
                                        {client.imgLogo && <img className="w-10 h-10 rounded-full" src={client.imgLogo} alt={`${client.name} avatar`} />}
                                        {client.imgLogo == "" && <FaUserCircle className="w-10 h-10 text-slate-400" size="1em" />}
                                        <div className="ps-3">
                                            <div className="text-base font-semibold">{client.name}</div>
                                        </div>
                                    </div>
                                    <div className="w-2/6 px-6 py-4">
                                        {client.email}
                                    </div>
                                    <div className="w-1/6 px-6 py-4">
                                        <Link href={{
                                            pathname: "/modulos/homeneo/clientes/edicion",
                                            query: { _id: client.id }
                                        }}>
                                            <span className="font-medium text-blue-600 dark:text-blue-500 hover:underline">EDITAR</span>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {(!loadingList && clients.length == 0) && <div className="bg-teal-100 border-t-4 border-teal-500 rounded-b text-teal-900 px-4 py-3 shadow-md" role="alert">
                        <div className="flex">
                            <div className="py-1">
                                <svg className="fill-current h-6 w-6 text-teal-500 mr-4" xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20">
                                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                                </svg>
                            </div>
                            <div>
                                <p><b>No hay clientes en lista</b></p>
                                <p className="text-sm">Estos son manejados por el encargado de herramientas</p>
                            </div>
                        </div>
                    </div>}
                </div>
                {loadingList && <div className="my-4"><Loader></Loader></div>}
            </div>
        </main>
    )
}