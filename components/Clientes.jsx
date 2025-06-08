"use client"

import { useState, useEffect } from 'react';
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { MdSearch } from "react-icons/md";

export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async (query = '') => {
        try {
            const response = await fetch(`/api/clientes${query ? `?q=${query}` : ''}`);
            const data = await response.json();
            if (data.ok) {
                setClientes(data.clientes);
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error('Error fetching clientes:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchClientes(searchQuery);
    };

    return (
        <main className="px-6 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center space-x-4 text-ship-cove-800 pt-4">
                            <Link href="/modulos">
                                <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                            </Link>
                            <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">CLIENTES</span>
                        </div>
                        <form onSubmit={handleSearch} className="flex items-center space-x-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar clientes..."
                                    className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <MdSearch className="absolute left-3 top-2.5 text-gray-500" size="1.2rem" />
                            </div>
                            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Buscar</button>
                        </form>
                    </div>
                    <div>
                        {clientes.map((cliente, index) => (
                            <div key={`cliente_${index}`} className="flex justify-between items-center bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 p-4">
                                <div>
                                    <p className="text-lg font-semibold">{cliente.nombre}</p>
                                    <p className="text-sm text-gray-500">{cliente.email}</p>
                                    <p className="text-sm">{cliente.direccion}</p>
                                </div>
                                <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">EDITAR</button>
                            </div>
                        ))}
                        {clientes.length === 0 && (
                            <div className="flex justify-center py-10">
                                <p className="text-xl mt-2 ml-4 uppercase">Sin clientes</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};