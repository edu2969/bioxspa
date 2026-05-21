"use client"

import Nav from '../Nav';
import Loader from "../Loader";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { IoCloseSharp } from "react-icons/io5";
import InputFilter from "../_prefabs/FilerInput";
import ItemBox from "./ItemBox";
import ItemEditModal from "./ItemEditModal";
import { TIPO_CATEGORIA_CATALOGO } from "@/app/utils/constants";
import ItemList from './ItemList';

export default function Catalogo() {
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
    const [selectedSubcategoriaId, setSelectedSubcategoriaId] = useState<string | null>(null);
    const [filteredIds, setFilteredIds] = useState<string[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [clearTrigger, setClearTrigger] = useState(0);

    const { data: categorias, isLoading: isLoadingCategorias } = useQuery({
        queryKey: ['categorias'],
        queryFn: async () => {
            const response = await fetch('/api/catalogo/categorias');
            const data = await response.json();
            return data.categorias || [];
        }
    });

    const { data: subcategorias, isLoading: isLoadingSubcategorias } = useQuery({
        queryKey: ['subcategorias', selectedCategoriaId],
        queryFn: async () => {
            const response = await fetch(`/api/catalogo/subcategorias?categoriaId=${selectedCategoriaId}`);
            const data = await response.json();
            return data.subcategorias || [];
        },
        enabled: !!selectedCategoriaId
    });

    const selectedCategoria = useMemo(() => {
        console.log("Calculating selected category with ID:", selectedCategoriaId);
        if (!selectedCategoriaId || !categorias) return null;
        return categorias.find((categoria: any) => categoria.id === selectedCategoriaId) || null;
    }, [selectedCategoriaId, categorias]);

    const selectedSubcategoria = useMemo(() => {
        console.log("Calculating selected subcategoria with ID:", selectedSubcategoriaId);
        if (!selectedSubcategoriaId || !subcategorias) return null;
        return subcategorias.find((sub: any) => sub.id === selectedSubcategoriaId) || null;
    }, [selectedSubcategoriaId, subcategorias]);

    // Determinar qué items mostrar: categorías o subcategorías
    const itemsToDisplay = selectedCategoriaId ? subcategorias : categorias;
    const isLoading = selectedCategoriaId ? isLoadingSubcategorias : isLoadingCategorias;

    // Memoizar el array de items para evitar ciclos infinitos
    const filterItems = useMemo(() => {
        
        console.log("Items to display changed, recalculating filter items...");
        return itemsToDisplay?.map((item: { id: string; nombre: string; cantidad?: number; unidad?: string }) => {
            let value = item.nombre || "";
            if (selectedCategoriaId && selectedCategoria?.tipo === TIPO_CATEGORIA_CATALOGO.cilindro) {
                value = `${item.cantidad || ""} ${item.unidad || ""}`.trim();
            }
            return {
                key: item.id,
                value
            };
        }) || [];
    }, [itemsToDisplay, selectedCategoriaId, selectedCategoria?.tipo]);

    // Memoizar la función callback
    const handleFilterChange = useCallback((results: string[]) => {
        console.log("Filter change!", results);
        setFilteredIds(results);
    }, [setFilteredIds]);

    // Filtrar items basado en los IDs filtrados
    const displayedItems = useMemo(() => {
        console.log("Rendering displayed items with filter:", filteredIds);
        if (!itemsToDisplay) return [];
        if (filteredIds.length === 0) return itemsToDisplay;
        return itemsToDisplay.filter((item: any) => filteredIds.includes(String(item.id)));
    }, [itemsToDisplay, filteredIds]);

    const handleItemClick = useCallback((id: string) => {
        console.log("ClicK!", id);
        // Si está viendo categorías, selecciona la categoría
        if (!selectedCategoriaId) {
            setClearTrigger(prev => prev + 1);
            setSelectedCategoriaId(id);
            setFilteredIds([]);
            return;
        }
        
        if (!selectedSubcategoriaId) {
            // Seleccionar subcategoría y mostrar items
            setSelectedSubcategoriaId(id);
            return;
        }
    }, [setClearTrigger, setSelectedCategoriaId, setFilteredIds, selectedCategoriaId, selectedSubcategoriaId]);

    const handleSettingsClick = useCallback((id: string) => {
        console.log("Settings Click!", id);
        const item = itemsToDisplay.find((i: any) => String(i.id) === id);
        if (item) {
            setEditingItem(item);
            setIsEditModalOpen(true);
        }
    }, [setEditingItem, setIsEditModalOpen, itemsToDisplay]);

    const handleBackClick = () => {
        console.log("Back Click!");
        if (selectedSubcategoriaId) {
            setSelectedSubcategoriaId(null);
        } else if (selectedCategoriaId) {
            setClearTrigger(prev => prev + 1);
            setSelectedCategoriaId(null);
            setFilteredIds([]);
        }
    };

    const handleCloseModal = useCallback(() => {
        console.log("Close modal!");        
        setIsEditModalOpen(false);
        setEditingItem(null);
    }, [setIsEditModalOpen, setEditingItem]);

    const formatUnitText = (cantidad?: number, unidad?: string) => {
        if (cantidad == null && !unidad) return null;
        const unitParts = String(unidad || "").split("").map((char, index) => {
            if (/\d/.test(char)) {
                return <sup key={index} className="text-xs align-super">{char}</sup>;
            }
            return char;
        });
        return (
            <span className="inline-flex items-baseline gap-2 text-lg font-semibold">
                <span>{cantidad ?? ""}</span>
                {unidad ? <span className="text-base">{unitParts}</span> : null}
            </span>
        );
    };
    
    return (
        <main className="w-full h-screen">
            <div className="py-4 w-full">
                <div className="w-full h-full pb-20">
                    <div className="text-center relative">
                        <div className="w-full flex items-center justify-center space-x-6 pb-4">
                            <h1 className="text-4xl font-bold">
                                {selectedSubcategoriaId ? `${selectedCategoria?.nombre || "CATEGORÍA"} ${selectedSubcategoria?.nombre || "SUBCATEGORÍA"}` : selectedCategoriaId ? selectedCategoria?.nombre || "Subcategorías" : "Categorías"}
                            </h1>
                            <InputFilter
                                items={filterItems}
                                onChangeResults={handleFilterChange}
                                minChars={3}
                                debounceMs={1000}
                                clearTrigger={clearTrigger}
                            />
                        </div>

                        {/* Botón de cerrar/atrás cuando se selecciona una categoría */}
                        {selectedCategoriaId && (
                            <button
                                className="absolute top-2 right-24 text-4xl text-gray-600 hover:text-red-600 transition-colors"
                                onClick={handleBackClick}
                                title="Volver a categorías"
                            >
                                <IoCloseSharp />
                            </button>
                        )}

                        <div className="h-[calc(100vh-70px)] flex flex-wrap justify-center overflow-y-auto px-6 gap-1">
                            {(!isLoading && !selectedSubcategoriaId) && (
                                displayedItems && displayedItems.length > 0 && (
                                    displayedItems.map((item: { 
                                        id: string; 
                                        nombre?: string; 
                                        cantidadSubcategorias?: number; 
                                        cantidadItemsCatalogo?: number; 
                                        cantidad?: number; 
                                        unidad?: string 
                                    }, index: number) => {
                                        const isCilindroCategory = selectedCategoria?.tipo === TIPO_CATEGORIA_CATALOGO.cilindro;
                                        return (
                                            <ItemBox
                                                key={item.id}
                                                id={item.id}
                                                index={index}
                                                text={
                                                    selectedCategoriaId && isCilindroCategory
                                                        ? formatUnitText(item.cantidad, item.unidad)
                                                        : item.nombre || ""
                                                }
                                                count={selectedCategoriaId ? item.cantidadItemsCatalogo ?? 0 : item.cantidadSubcategorias ?? 0}
                                                onSettingClick={() => handleSettingsClick(item.id)}
                                                onClick={handleItemClick}
                                            />
                                        );
                                    })
                                )
                            )}

                            {!isLoading && !selectedCategoriaId && displayedItems && displayedItems.length === 0 && ((
                                <div className="flex justify-center items-center h-[calc(100vh-70px)] w-full">
                                    <p className="text-gray-500 text-lg">No hay elementos para mostrar</p>
                                </div>
                            ))}

                            {!isLoading && selectedSubcategoriaId && <ItemList subcategoriaId={selectedSubcategoriaId || ""} />}

                            {isLoading && (
                                <div className="flex justify-center items-center h-[calc(100vh-70px)] w-full">
                                    <Loader />
                                </div>
                            )}
                        </div>

                        {/* Modal de edición */}
                        {isEditModalOpen && editingItem && (
                            <ItemEditModal
                                isCategoria={!selectedCategoriaId}
                                item={editingItem}
                                categoriaId={selectedCategoriaId || undefined}
                                onClose={handleCloseModal}
                            />
                        )}
                    </div>
                </div>
            </div>
            <Nav />
        </main>
    );
}
