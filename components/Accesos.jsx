'use client'
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AiFillHome } from "react-icons/ai";
import { FaPlus, FaUserCircle } from "react-icons/fa";
import { GiMoebiusStar } from "react-icons/gi";
import { IoIosArrowForward } from "react-icons/io";

const USER_ROLE = {
    client: 'client',
    admin: 'admin'
};

export default function Accesos() {
    const [users, setUsers] = useState([]);
    
    async function getUsers() {
        try {
            const res = await fetch(`/api/users`)
            const data = await res.json();
            setUsers(data.users || []);
            console.log(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    useEffect(() => {
        getUsers();
    }, []);

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <div className="w-full p-6">                
                <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                    <div className="flex items-center space-x-4 text-ship-cove-800">
                        <Link href="/modulos">
                            <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                        </Link>
                        <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">ACCESOS</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <label htmlFor="table-search" className="sr-only">Search</label>
                            <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                </svg>
                            </div>
                            <input type="text" id="table-search-users" className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Codigo/Nombre" />
                        </div>
                        <Link href="/modulos/homeneo/usuarios/edicion">
                            <button className="flex w-full justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                type="submit">
                                <FaPlus size="1rem" className="mt-1" /><span className="mt-0">&nbsp;Nuevo</span>
                            </button>
                        </Link>
                    </div>
                </div>
                <div className="w-[720px] p-6 m-auto">
                    <div className="relative shadow-md sm:rounded-lg">
                        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        Nombre
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <th scope="row" className="flex items-center px-6 py-4 text-gray-900 whitespace-nowrap dark:text-white">
                                            {user.avatarImg && <Image className="w-10 h-10 rounded-full" src={user.avatarImg} alt={`${user.name} avatar`} width={40} height={40}/>}
                                            {user.avatarImg === "" && <FaUserCircle className="w-10 h-10 text-slate-400" size="1em" />}
                                            <div className="ps-3">
                                                <div className="text-base font-semibold">
                                                    {user.role === USER_ROLE.client ? <span className="bg-blue-800 rounded-md text-white p-1">CLIENTE</span>
                                                        : <GiMoebiusStar size="2em" />}
                                                    <div className="font-normal text-gray-500">{user.email}</div>{user.name}
                                                </div>
                                            </div>
                                        </th>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-2.5 w-2.5 rounded-full bg-green-500 me-2"></div> Online
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={{
                                                pathname: "/modulos/homeneo/usuarios/edicion/",
                                                query: { _id: user.id }
                                            }}>
                                                <span className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit user</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    )
}