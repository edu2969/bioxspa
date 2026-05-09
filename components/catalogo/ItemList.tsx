"use client";

import { useQuery } from "@tanstack/react-query";
import Loader from "../Loader";

interface ItemListProps {
    subcategoriaId: string;
}

export default function ItemList({ subcategoriaId }: ItemListProps) {
    const { data: items, isLoading, error } = useQuery({
        queryKey: ['items-catalogo', subcategoriaId],
        queryFn: async () => {
            const response = await fetch(`/api/catalogo/subcategorias/items?id=${subcategoriaId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }
            const data = await response.json();
            return data;
        },
        enabled: !!subcategoriaId
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <div className="text-red-500">Error loading items: {error.message}</div>;
    }

    if (!items || items.length === 0) {
        return <div className="text-gray-500">No hay items en ésta subcategoría</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="px-4 py-2 border-b text-left">Código</th>
                        <th className="px-4 py-2 border-b text-left">Nombre</th>
                        <th className="px-4 py-2 border-b text-left">Descripción</th>
                        <th className="px-4 py-2 border-b text-left">Stock Actual</th>
                        <th className="px-4 py-2 border-b text-left">Stock Mínimo</th>
                        <th className="px-4 py-2 border-b text-left">Estado</th>
                        <th className="px-4 py-2 border-b text-left">Visible</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border-b">{item.codigo}</td>
                            <td className="px-4 py-2 border-b">{item.nombre}</td>
                            <td className="px-4 py-2 border-b">{item.descripcion}</td>
                            <td className="px-4 py-2 border-b">{item.stockActual}</td>
                            <td className="px-4 py-2 border-b">{item.stockMinimo}</td>
                            <td className="px-4 py-2 border-b">{item.estado}</td>
                            <td className="px-4 py-2 border-b">{item.visible ? 'Sí' : 'No'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}