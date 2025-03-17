"use client"
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { IoIosArrowForward } from "react-icons/io";
import { MdSearch } from "react-icons/md";
import { FaCheck, FaTimes, FaPencilAlt, FaPlus } from "react-icons/fa";
import Loader from '@/components/Loader';
import amountFormat from '@/app/utils/currency';


const Precios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [copiaUsuario, setCopiaUsuario] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [precioData, setPrecioData] = useState({
        fechaDesde: new Date().toISOString().split('T')[0],
        fechaHasta: '',
        clienteId: '',
        sucursalId: '',
        dependenciaId: '',
        unidad: '',
        valor: ''
    });
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState({});

    const getInitials = (name) => {
        return name.split(' ').map((n) => n[0]).join('');
    };

    useEffect(() => {
        fetchUsuarios();
        fetchClientes();
        fetchSucursales();
    }, []);

    const fetchUsuarios = async (query = '') => {
        setLoading(true);
        try {
            const response = await fetch('/api/precios');
            const data = await response.json();
            const filteredData = data.filter(usuario =>
                usuario.name.toLowerCase().includes(query.toLowerCase()) ||
                usuario.precios.some(precio => precio.cliente.nombre.toLowerCase().includes(query.toLowerCase()))
            );
            setUsuarios(filteredData);
            setCopiaUsuario(filteredData);
            console.log('data:', filteredData);
        } catch (error) {
            console.error('Error fetching usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientes = async () => {
        try {
            const response = await fetch('/api/clientes');
            const data = await response.json();
            setClientes(data);
        } catch (error) {
            console.error('Error fetching clientes:', error);
        }
    };

    const fetchSucursales = async () => {
        try {
            const response = await fetch('/api/sucursales');
            const data = await response.json();
            setSucursales(data);
        } catch (error) {
            console.error('Error fetching sucursales:', error);
        }
    };

    const fetchDependencias = async (sucursalId) => {
        try {
            const response = await fetch(`/api/sucursales/dependencias?id=${sucursalId}`);
            const data = await response.json();
            setDependencias(data);
        } catch (error) {
            console.error('Error fetching dependencias:', error);
        }
    };

    const handleSearch = (q) => {
        const filteredUsuarios = copiaUsuario.map(usuario => {
            const filteredPrecios = usuario.precios.filter(precio =>
                precio.cliente?.nombre.toLowerCase().includes(q.toLowerCase())
            );
            if (usuario.name.toLowerCase().includes(q.toLowerCase())) {
                return usuario;
            } else if (filteredPrecios.length > 0) {
                return { ...usuario, precios: filteredPrecios };
            }
            return null;
        }).filter(usuario => usuario !== null);

        setUsuarios(filteredUsuarios);
    };

    const handleEdit = (index, precio) => {
        setEditingIndex(index);
        setPrecioData(precio);
        if (precio.sucursalId) {
            fetchDependencias(precio.sucursalId);
        }
    };

    const handleCancel = () => {
        setEditingIndex(null);
        setPrecioData({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPrecioData((prev) => ({ ...prev, [name]: value }));
        if (name === 'sucursalId') {
            fetchDependencias(value);
        }
    };

    const handleSave = async (userId) => {
        try {
            const response = await fetch('/api/precios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...precioData, userId }),
            });
            const data = await response.json();
            console.log('data:', data);
            if (data.error) {
                console.error(data.error);
            } else {
                fetchUsuarios();
                handleCancel();
            }
        } catch (error) {
            console.error('Error saving precio:', error);
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
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PRECIOS</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Buscar usuarios..."
                                    className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <MdSearch className="absolute left-3 top-2.5 text-gray-500" size="1.2rem" />
                            </div>
                        </div>
                    </div>
                    <div>
                        {loading ? (
                            <Loader />
                        ) : (
                            <>
                                {usuarios.length > 0 ? (
                                    usuarios.map((usuario, index) => (
                                        <div key={`usuario_${index}`} className="flex flex-col bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 p-4">
                                            <div className="flex items-center justify-between">
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
                                                <button
                                                    type="button"
                                                    className="flex text-white bg-blue-500 hover:bg-blue-600 rounded-md px-4 py-2"
                                                    onClick={() => handleEdit(index, { ...precioData, userId: usuario._id })}
                                                >
                                                    <FaPlus className="mt-1" /><span className="ml-2">NUEVO PRECIO</span>
                                                </button>
                                            </div>
                                            {usuario.precios && usuario.precios.length > 0 ? (
                                                <div className="flex flex-wrap">
                                                    {usuario.precios.map((precio, precioIndex) => (
                                                        <div key={`precio_${precioIndex}`} className="relative flex flex-col justify-between items-start mt-4 p-2 border rounded-md w-full md:w-1/2 lg:w-1/3">
                                                            {editingIndex === `${index}_${precioIndex}` ? (
                                                                <div className="flex flex-col space-y-2">
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="fechaDesde">Fecha Desde</label>
                                                                        <input
                                                                            type="date"
                                                                            name="fechaDesde"
                                                                            value={precioData.fechaDesde || new Date().toISOString().split('T')[0]}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="fechaHasta">Fecha Hasta</label>
                                                                        <input
                                                                            type="date"
                                                                            name="fechaHasta"
                                                                            value={precioData.fechaHasta}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="clienteId">Cliente</label>
                                                                        <select
                                                                            name="clienteId"
                                                                            value={precioData.clienteId}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        >
                                                                            <option value="">Seleccione un cliente</option>
                                                                            {clientes.length && clientes.map((cliente) => (
                                                                                <option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="sucursalId">Sucursal</label>
                                                                        <select
                                                                            name="sucursalId"
                                                                            value={precioData.sucursalId}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        >
                                                                            <option value="">Seleccione una sucursal</option>
                                                                            {sucursales.length && sucursales.map((sucursal) => (
                                                                                <option key={sucursal._id} value={sucursal._id}>{sucursal.nombre}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="dependenciaId">Dependencia</label>
                                                                        <select
                                                                            name="dependenciaId"
                                                                            value={precioData.dependenciaId}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        >
                                                                            <option value="">Seleccione una dependencia</option>
                                                                            {dependencias.length && dependencias.map((dependencia) => (
                                                                                <option key={dependencia._id} value={dependencia._id}>{dependencia.nombre}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="unidad">Unidad</label>
                                                                        <select
                                                                            name="unidad"
                                                                            value={precioData.unidad}
                                                                            onChange={handleChange}
                                                                            className="border rounded-md px-3 py-1"
                                                                        >
                                                                            <option value="">Seleccione una unidad</option>
                                                                            <option value="porcentaje">Porcentaje</option>
                                                                            <option value="monto">Monto</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="valor">Valor</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            name="valor"
                                                                            value={precioData.valor}
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
                                                                <div className="flex flex-col items-start space-y-2">
                                                                    <button className="absolute top-3 right-3 text-blue-500 hover:text-blue-600" onClick={() => handleEdit(`${index}_${precioIndex}`, precio)}>
                                                                        <FaPencilAlt />
                                                                    </button>
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-sm bg-slate-700 text-white rounded-md py-1 pl-2 pr-1">
                                                                            {precio.unidad === 'porcentaje' ? `${precio.valor || 0}%` : `$${amountFormat(precio.valor || 0)}`}
                                                                        </span>
                                                                        <span> {precio.categoriaItemNombre} {precio.subcategoriaItemNombre}</span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500">{precio.cliente?.nombre}</p>
                                                                    {precio.fechaDesde && <span className="text-xs text-gray-500">De {new Date(precio.fechaDesde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })} a {new Date(precio.fechaHasta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex justify-center py-0">
                                                    <p className="text-xl -mt-8 ml-4 uppercase">Sin precios</p>
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

export default Precios;