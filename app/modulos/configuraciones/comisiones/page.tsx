"use client"
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { MdSearch } from "react-icons/md";
import { FaCheck, FaTimes } from "react-icons/fa";
import Loader from '@/components/Loader';

const ComisionesPage = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingIndex, setEditingIndex] = useState<null | number>(null);
    const [comisionData, setComisionData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('');
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async (query = '') => {
        setLoading(true);
        try {
            const response = await fetch(`/api/comisiones${query ? `?q=${query}` : ''}`);
            const data = await response.json();
            setUsuarios(data);
        } catch (error) {
            console.error('Error fetching usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: any) => {
        e.preventDefault();
        fetchUsuarios(searchQuery);
    };

    const handleEdit = (index: number, comision: any) => {
        setEditingIndex(index);
        setComisionData(comision);
    };

    const handleCancel = () => {
        setEditingIndex(null);
        setComisionData({});
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setComisionData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (userId: string) => {
        try {
            const response = await fetch('/api/comisiones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...comisionData, userId }),
            });
            const data = await response.json();
            if (data.error) {
                console.error(data.error);
            } else {
                fetchUsuarios();
                handleCancel();
            }
        } catch (error) {
            console.error('Error saving comision:', error);
        }
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
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">COMISIONES</span>
                        </div>
                        <form onSubmit={handleSearch} className="flex items-center space-x-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar usuarios..."
                                    className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <MdSearch className="absolute left-3 top-2.5 text-gray-500" size="1.2rem" />
                            </div>
                            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Buscar</button>
                        </form>
                    </div>
                    <div>
                        {loading ? (
                            <Loader />
                        ) : (
                            <>
                                {usuarios.length > 0 ? (
                                    usuarios.map((usuario: any, index) => (
                                        <div key={`usuario_${index}`} className="flex justify-between items-center bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 p-4">
                                            <div className="flex items-center">
                                                {imageError[usuario.email] ? (
                                                    <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white text-lg font-semibold mr-4">
                                                        {getInitials(usuario.name)}
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={`/profiles/${usuario.email.split('@')[0]}.jpg`}
                                                        alt="avatar"
                                                        className="w-10 h-10 rounded-full mr-4"
                                                        onError={() => setImageError((prev) => ({ ...prev, [usuario.email]: true }))}
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-lg font-semibold">{usuario.name}</p>
                                                    <p className="text-sm text-gray-500">{usuario.email}</p>
                                                </div>
                                            </div>
                                            {editingIndex === index ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex flex-col">
                                                        <label htmlFor="comisionGeneral">General</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            name="comisionGeneral"
                                                            value={comisionData.comisionGeneral}
                                                            onChange={handleChange}
                                                            className="border rounded-md px-3 py-1"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="comisionRetiro">Retiro</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            name="comisionRetiro"
                                                            value={comisionData.comisionRetiro}
                                                            onChange={handleChange}
                                                            className="border rounded-md px-3 py-1"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="comisionEntrega">Entrega</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            name="comisionEntrega"
                                                            value={comisionData.comisionEntrega}
                                                            onChange={handleChange}
                                                            className="border rounded-md px-3 py-1"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label htmlFor="comisionPtoVta">Pto Vta</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            name="comisionPtoVta"
                                                            value={comisionData.comisionPtoVta}
                                                            onChange={handleChange}
                                                            className="border rounded-md px-3 py-1"
                                                        />
                                                    </div>
                                                    <div className="flex items-center space-x-2 mt-4">
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-green-600 text-xl hover:bg-green-500 hover:text-white rounded-md p-2"
                                                            onClick={() => handleSave(usuario._id)}
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-red-600 text-xl hover:bg-red-100 rounded-md p-2"
                                                            onClick={handleCancel}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 uppercase">
                                                    <p className={`text-sm bg-slate-${usuario.comision?.comisionGeneral || 0 ? '700' : '400'} rounded-md text-white py-1 pl-2 pr-1 mt-2`}>General: <span className="bg-slate-200 text-black px-2 py-0.5 rounded-r-sm font-bold">{usuario.comision?.comisionGeneral || 0}%</span></p>
                                                    <p className={`text-sm bg-slate-${usuario.comision?.comisionRetiro || 0 ? '700' : '400'} rounded-md text-white py-1 pl-2 pr-1 mt-2`}>Retiro: <span className="bg-slate-200 text-black px-2 py-0.5 rounded-r-sm font-bold">{usuario.comision?.comisionRetiro || 0}%</span></p>
                                                    <p className={`text-sm bg-slate-${usuario.comision?.comisionEntrega || 0 ? '700' : '400'} rounded-md text-white py-1 pl-2 pr-1 mt-2`}>Entrega: <span className="bg-slate-200 text-black px-2 py-0.5 rounded-r-sm font-bold">{usuario.comision?.comisionEntrega || 0}%</span></p>
                                                    <p className={`text-sm bg-slate-${usuario.comision?.comisionPtoVta || 0 ? '700' : '400'} rounded-md text-white py-1 pl-2 pr-1 mt-2`}>Pto Vta: <span className="bg-slate-200 text-black px-2 py-0.5 rounded-r-sm font-bold">{usuario.comision?.comisionPtoVta || 0}%</span></p>
                                                    <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mt-2" onClick={() => handleEdit(index, usuario.comision)}>EDITAR</button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-center py-10">
                                        <p className="text-xl mt-2 ml-4 uppercase">Sin resultados</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default ComisionesPage;