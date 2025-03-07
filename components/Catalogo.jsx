"use client"
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { AiFillHome } from 'react-icons/ai';
import { IoIosArrowForward } from 'react-icons/io';
import { IoCloseSharp } from 'react-icons/io5';
import { useEffect } from 'react';

export default function Catalogo() {
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
    const [subcategorias, setSubcategorias] = useState([]);
    const [items, setItems] = useState([]);

    const handleCategoriaClick = async (index) => {
        const categoria = categorias[index];
        setSelectedCategoria(categoria);
        setSelectedSubcategoria(null);
        setItems([]);
        const response = await fetch(`/api/catalogo/subcategoria?id=${categoria._id}`);
        const data = await response.json();
        setSubcategorias(data);
    };

    const handleSubcategoriaClick = async (subcategoria) => {
        setSelectedSubcategoria(subcategoria);
        const response = await fetch(`/api/catalogo/subcategoria/items?id=${subcategoria._id}`);
        const data = await response.json();
        setItems(data);
    };

    const handleBackClick = () => {
        if (selectedSubcategoria) {
            setSelectedSubcategoria(null);
            setItems([]);
        } else {
            setSelectedCategoria(null);
            setSubcategorias([]);
        }
    };

    const router = useRouter();

    const [categorias, setCategorias] = useState([]);

    useEffect(() => {
        const fetchCategorias = async () => {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            setCategorias(data);
        };

        fetchCategorias();
    }, []);
    
    return (
        <main className="w-full h-screen">
            <div className="py-10 w-full h-screen overflow-y-scroll">
                <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 pt-4 mx-10 bg-white dark:bg-gray-900">
                    <div className="flex items-center space-x-4 text-ship-cove-800">
                        <Link href="/modulos">
                            <AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                        </Link>
                        <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => router.back()}>CONFIGURACIONES</span>
                        <IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">CATALOGO</span>
                    </div>
                </div>
                <div className="absolute w-full h-full mt-5 px-6 overflow-y-auto pb-20">
                    {selectedCategoria === null ? (
                        <div className="flex flex-wrap justify-center overflow-y-auto">
                            {categorias.map((categoria, index) => (
                                <div
                                    key={index}
                                    className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer"
                                    onClick={() => handleCategoriaClick(index)}
                                >
                                    <div className="relative w-full h-full bg-white hover:bg-gray-400 rounded-lg p-4 shadow-md">
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                            {categoria.cantidadSubcategorias || 0}
                                        </div>
                                        <div className="text-center mt-2">
                                            <p className="text-md font-bold">{categoria.nombre}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : selectedSubcategoria === null ? (
                        <div className="absolute w-full flex flex-col items-center justify-center bg-white overflow-y-auto px-6 pb-20">
                            <button className="absolute top-10 right-40 text-4xl" onClick={handleBackClick}>
                                <IoCloseSharp />
                            </button>
                            <div className="text-center">
                                <h1 className="text-6xl font-bold uppercase">{selectedCategoria.nombre}</h1>
                                <div className="flex flex-wrap justify-center mt-10 overflow-y-auto">
                                    {subcategorias.map((subcategoria, index) => (
                                        <div
                                            key={index}
                                            className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer"
                                            onClick={() => handleSubcategoriaClick(subcategoria)}
                                        >
                                            <div className="relative w-full h-full bg-white hover:bg-gray-400 rounded-lg p-4 shadow-md">
                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                    {subcategoria.cantidadItemsCatalogo || 0}
                                                </div>
                                                <div className="text-center mt-2">
                                                    <p className="text-md font-bold">{subcategoria.nombre}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute w-full flex flex-col items-center justify-center bg-white overflow-y-auto pb-20">
                            <button className="absolute top-10 right-40 text-4xl" onClick={handleBackClick}>
                                <IoCloseSharp />
                            </button>
                            <div className="text-center">
                                <h1 className="text-6xl font-bold uppercase">{selectedSubcategoria.nombre}</h1>
                                <div className="flex flex-wrap justify-center mt-10 overflow-y-auto">
                                    <div className="w-full">
                                        <div className="grid grid-cols-12 gap-4 bg-gray-200 p-4 rounded-t-lg">
                                            <div className="col-span-1 font-bold">Código</div>
                                            <div className="col-span-2 font-bold">Nombre</div>
                                            <div className="col-span-3 font-bold">Descripción</div>
                                            <div className="col-span-2 font-bold">Ficha Técnica</div>
                                            <div className="col-span-2 font-bold">Garantía Anual</div>
                                            <div className="col-span-2 font-bold">Stock Actual</div>
                                        </div>
                                        {items.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b">
                                                <div className="col-span-1">{item.codigo}</div>
                                                <div className="col-span-2">{item.nombre}</div>
                                                <div className="col-span-3">{item.descripcion}</div>
                                                <div className="col-span-2">{item.fichaTecnica}</div>
                                                <div className="col-span-2">{item.garantiaAnual}</div>
                                                <div className="col-span-2">{item.stockActual}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
