"use client"

import React, { useState } from 'react';
import { IoCloseSharp, IoSettingsOutline } from 'react-icons/io5';
import { useEffect } from 'react';
import Loader from './Loader';
import { useForm } from 'react-hook-form';
import { TIPO_ITEM_CATALOGO } from '@/app/utils/constants';

export default function Catalogo() {
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
    const [subcategorias, setSubcategorias] = useState([]);
    const [items, setItems] = useState([]);
    const [loadingCategoria, setLoadingCategoria] = useState(false);
    const [loadingSubcategoria, setLoadingSubcategoria] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [editingCategoria, setEditingCategoria] = useState(null);
    const [editingSubcategoria, setEditingSubcategoria] = useState(null);
    const [savingCategoria, setSavingCategoria] = useState(false);
    const [savingSubcategoria, setSavingSubcategoria] = useState(false);

    const { register, handleSubmit, setValue,  formState: { isValid, isSubmitting } } = useForm({ 
        mode: "onChange" 
    });
    
    const handleCategoriaClick = async (index) => {
        setLoadingSubcategoria(true);
        const categoria = categorias[index];
        setSelectedCategoria(categoria);
        setSelectedSubcategoria(null);
        setItems([]);
        const response = await fetch(`/api/catalogo/subcategoria?id=${categoria._id}`);
        const data = await response.json();
        setSubcategorias(data);
        setLoadingSubcategoria(false);
    };

    const handleSubcategoriaClick = async (subcategoria) => {
        setLoadingItems(true);
        setSelectedSubcategoria(subcategoria);
        const response = await fetch(`/api/catalogo/subcategoria/items?id=${subcategoria._id}`);
        const data = await response.json();
        setItems(data);
        setLoadingItems(false);
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

    const handleCategoriaSettingsClick = (categoria) => {
        // Carga los datos de la categoría seleccionada en el formulario
        if (categoria) {
            Object.entries(categoria).forEach(([key, value]) => {
                setValue(key, value ?? "");
            });
            setEditingCategoria(categoria); // Abre el modal de edición
        }
    };

    const handleSubcategoriaSettingsClick = (subcategoria) => {
        // Carga los datos de la subcategoría seleccionada en el formulario
        if (subcategoria) {
            Object.entries(subcategoria).forEach(([key, value]) => {
                setValue(key, value ?? "");
            });
            setEditingSubcategoria(subcategoria); // Abre el modal de edición
        }
    };

    const handleSubmitSubcategoria = async (data) => {
        setSavingSubcategoria(true);
        const response = await fetch('/api/catalogo/subcategoria', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        setSavingSubcategoria(false);
        if (response.ok) {
            setSubcategorias((prev) =>
                prev.map((subcat) => (subcat._id === result._id ? result : subcat))
            );
            setEditingSubcategoria(null);
        }
    };

    const onSaveCategoria = async (data) => {
        console.log("Guardando categoría:", data);
        setSavingCategoria(true);
        const response = await fetch(`/api/catalogo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        setSavingCategoria(false);
        if (response.ok) {
            setCategorias((prev) =>
                prev.map((cat) => (cat._id === result._id ? result : cat))
            );
            setEditingCategoria(null);
        }
    };

    useEffect(() => {
        setLoadingCategoria(true);
        const fetchCategorias = async () => {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            setCategorias(data);
            setLoadingCategoria(false);
        };

        fetchCategorias();
    }, []);

    return (
        <main className="w-full h-screen">
            <div className="py-4 w-full">
                <div className="w-full h-full pb-20">
                    {selectedCategoria === null ? (
                        <div className="text-center">
                            <h1 className="text-4xl font-bold uppercase mb-4">CATEGORÍAS</h1>
                            <div className="h-[calc(100vh-94px)] flex flex-wrap justify-center overflow-y-auto px-6">
                                {!loadingCategoria ? categorias.map((categoria, index) => (
                                    <div
                                        key={index}
                                        className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer"
                                        onClick={() => handleCategoriaClick(index)}
                                    >
                                        <div className="relative w-full h-full bg-gray-200 hover:bg-gray-500 rounded-lg p-4 shadow-md hover:text-white text-gray-700">
                                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                {categoria.cantidadSubcategorias || 0}
                                            </div>
                                            <div className="text-center mt-2">
                                                <p className="text-md font-bold">{categoria.nombre}</p>
                                            </div>
                                        </div>
                                        <IoSettingsOutline className="absolute ml-1 mb-1 left-2 bottom-2 text-gray-400 hover:text-red-600 cursor-pointer" size="1.5rem"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCategoriaSettingsClick(categoria);
                                            }} />
                                    </div>
                                )) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                                    <Loader />
                                </div>}
                            </div>
                        </div>
                    ) : selectedSubcategoria === null ? (
                        <div className="flex flex-wrap justify-center overflow-y-auto">
                            <button className="absolute top-2 right-40 text-4xl" onClick={handleBackClick}>
                                <IoCloseSharp />
                            </button>
                            <div className="w-full text-center">
                                <h1 className="text-4xl font-bold uppercase mb-4">{selectedCategoria.nombre}</h1>
                                <div className="h-[calc(100vh-160px)] flex flex-wrap justify-center overflow-y-auto px-6">
                                    {!loadingSubcategoria ? subcategorias.map((subcategoria, index) => (
                                        <div
                                            key={index}
                                            className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer"
                                            onClick={() => handleSubcategoriaClick(subcategoria)}
                                        >
                                            <div className="relative w-full h-full bg-gray-200 hover:bg-gray-500 rounded-lg p-4 shadow-md hover:text-white text-gray-700">
                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                    {subcategoria.cantidadItemsCatalogo || 0}
                                                </div>
                                                <div className="text-center mt-2">
                                                    <p className="text-md font-bold">{subcategoria.nombre}</p>
                                                </div>
                                            </div>
                                            <IoSettingsOutline className="absolute ml-1 mb-1 left-2 bottom-2 text-gray-400 hover:text-red-600 cursor-pointer" size="1.5rem"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSubcategoriaSettingsClick(subcategoria);
                                            }} />
                                        </div>
                                    )) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                                        <Loader />
                                    </div>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-wrap justify-center overflow-y-auto">
                            <button className="absolute top-2 right-40 text-4xl" onClick={handleBackClick}>
                                <IoCloseSharp />
                            </button>
                            <div className="w-full text-center">
                                <h1 className="text-4xl font-bold uppercase mb-4"><small>{selectedCategoria.nombre}</small> {selectedSubcategoria.nombre}</h1>
                                <div className="h-[calc(100vh-160px)] flex flex-wrap justify-center overflow-y-auto">
                                    <div className="w-full px-6">
                                        <div className="grid grid-cols-12 gap-4 bg-gray-200 p-4 rounded-t-lg">
                                            <div className="col-span-1 font-bold">Código</div>
                                            <div className="col-span-2 font-bold">Nombre</div>
                                            <div className="col-span-3 font-bold">Descripción</div>
                                            <div className="col-span-2 font-bold">Ficha Técnica</div>
                                            <div className="col-span-2 font-bold">Garantía Anual</div>
                                            <div className="col-span-2 font-bold">Stock Actual</div>
                                        </div>
                                        {!loadingItems ? items.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b">
                                                <div className="col-span-1">{item.codigo}</div>
                                                <div className="col-span-2">{item.nombre}</div>
                                                <div className="col-span-3">{item.descripcion}</div>
                                                <div className="col-span-2">{item.fichaTecnica}</div>
                                                <div className="col-span-2">{item.garantiaAnual}</div>
                                                <div className="col-span-2">{item.stockActual}</div>
                                            </div>
                                        )) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                                            <Loader />
                                        </div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editingCategoria && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                            onClick={() => setEditingCategoria(null)}
                            aria-label="Cerrar"
                            type="button"
                        >
                            <IoCloseSharp />
                        </button>
                        <h2 className="text-xl font-bold mb-4 text-center">Editar Categoría</h2>
                        <form onSubmit={handleSubmit(onSaveCategoria)}>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("nombre", { required: true })}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("descripcion")}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">URL Imagen</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("urlImagen", { required: true })}
                                />
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">Tipo</label>
                                    <select
                                        id="tipo"
                                        {...register('tipo', { required: true })}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                    >
                                        <option value="">Seleccione tipo</option>
                                        {Object.entries(TIPO_ITEM_CATALOGO).map(([key, value]) => (
                                            <option key={key} value={value}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">Gas</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        {...register("gas")}
                                    />
                                </div>
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">Elemento</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        {...register("elemento")}
                                    />
                                </div>
                                <div className="flex items-center mt-6">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        {...register("seguir")}
                                    />
                                    <span className="text-gray-700">Seguir</span>
                                </div>
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        {...register("esIndustrial")}
                                    />
                                    <span className="text-gray-700">Industrial</span>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="mr-2"
                                        {...register("esMedicinal")}
                                    />
                                    <span className="text-gray-700">Medicinal</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    type="submit"
                                    className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold ${!isValid || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={!isValid || isSubmitting}
                                >
                                    {isSubmitting || savingCategoria ? <Loader texto="Guardando..." /> : "GUARDAR"}
                                </button>
                                <button
                                    type="button"
                                    className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
                                    onClick={() => setEditingCategoria(null)}
                                    disabled={savingCategoria}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingSubcategoria && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                            onClick={() => setEditingSubcategoria(null)}
                            aria-label="Cerrar"
                            type="button"
                        >
                            <IoCloseSharp />
                        </button>
                        <h2 className="text-xl font-bold mb-4 text-center">Editar Subcategoría</h2>
                        <form onSubmit={handleSubmitSubcategoria}>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("nombre", { required: true })}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("cantidad")}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Unidad</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("unidad")}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Nombre Gas</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("nombreGas")}
                                />
                            </div>
                            <div className="mb-4 flex items-center">
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    {...register("sinSifon")}
                                />
                                <span className="text-gray-700">Sin Sifón</span>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">URL Imagen</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2"
                                    {...register("urlImagen")}
                                />
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    type="submit"
                                    className="w-full h-12 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700"
                                    disabled={savingSubcategoria}
                                >
                                    {savingSubcategoria ? <Loader texto="Guardando" /> : "Guardar"}
                                </button>
                                <button
                                    type="button"
                                    className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
                                    onClick={() => setEditingSubcategoria(null)}
                                    disabled={savingSubcategoria}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
