import { useAuthorization } from '@/lib/auth/useAuthorization';
import { ChangeEvent, useState } from "react";
import { ICategoriasView } from "@/types/categoriaCatalogo";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import toast from "react-hot-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LiaTimesSolid } from "react-icons/lia";
import { useForm } from "react-hook-form";
import { TIPO_CARGO } from "@/app/utils/constants";
import Loader from "../Loader";

interface ISolicitudPrecioForm {    
    subcategoriaCatalogoId: string;
    precio: number;
}

export default function SolicitudPrecioModal({
    clienteId,
    onClose
}: {
    clienteId: string;
    onClose: () => void;
}) {

    const { user, hasRole } = useAuthorization();
    const [categoriaIdSeleccionada, setCategoriaIdSeleccionada] = useState<string>('');
    const [precioData, setPrecioData] = useState<ISolicitudPrecioForm | null>(null);
    const { register, setValue } = useForm<ISolicitudPrecioForm>();

    const { data: categorias } = useQuery<ICategoriasView[]>({
        queryKey: ['categorias-catalogo'],
        queryFn: async () => {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            return data;
        },
    });

    const { data: subcategorias } = useQuery<ISubcategoriaCatalogo[]>({
        queryKey: ['subcategorias-catalogo'],
        queryFn: async () => {
            if (!categoriaIdSeleccionada) return [];
            const response = await fetch(`/api/catalogo/subcategoria?categoriaId=${categoriaIdSeleccionada}`);
            const data = await response.json();
            return data;
        },
        enabled: !!categoriaIdSeleccionada,
    });

    const handleCancel = () => {
        onClose();
    };

    const handlePrecioInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const clean = value.replace(/\D/g, "");
        setPrecioData(prev => prev ? { ...prev, valor: parseInt(clean) || 0 } : null);
    };

    const { mutate: savePrecio, isPending: savingPrecio } = useMutation({
        mutationFn: async (data: { clienteId: string; subcategoriaCatalogoId: string; valor: number }) => {
            const response = await fetch('/api/clientes/precios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return response.json();
        },
        onSuccess: (data: { ok: boolean }) => {
            if (data.ok) {
                toast.success('Precio guardado con éxito');
                onClose();
            }
        },
        onError: () => {
            toast.error('Error al guardar el precio');
        }
    });

    const handleSave = () => {
        const subcategoriaId = (document.getElementById('subcategoriaId') as HTMLSelectElement)?.value;
        const precio = parseInt((document.getElementById('precio') as HTMLInputElement)?.value?.replace(/\D/g, '') || '0');
        
        if (!subcategoriaId || !categoriaIdSeleccionada) return;
        
        savePrecio({
            clienteId: clienteId,
            subcategoriaCatalogoId: subcategoriaId,
            valor: precio
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-12 p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                <div className="absolute top-2 right-2">
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                        aria-label="Cerrar"
                        type="button"
                    >
                        <LiaTimesSolid />
                    </button>
                </div>
                <div className="text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Solicitar precio</h3>
                    <div className="mt-2">
                        <div className="mt-4 space-y-3 text-left">
                            <div className="flex flex-col">
                                <label htmlFor="categoriaSelect" className="text-sm text-gray-500">Categoría</label>
                                <select
                                    id="categoriaSelect"
                                    value={categoriaIdSeleccionada}
                                    onChange={(e) => {
                                        setCategoriaIdSeleccionada(e.target.value);
                                    }}
                                    className="border rounded-md px-3 py-2 text-base"
                                >
                                    <option value="">Seleccione una categoría</option>
                                    {categorias && categorias.map((categoria) => (
                                        <option key={categoria._id} value={categoria._id}>
                                            {categoria.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="subcategoriaId" className="text-sm text-gray-500">Subcategoría</label>
                                <select
                                    {...register("subcategoriaCatalogoId")}
                                    value={precioData?.subcategoriaCatalogoId || ""}
                                    onChange={(e) => {
                                        const selectedSubcategoria = subcategorias?.find(sc => sc._id === e.currentTarget.value);
                                        if (selectedSubcategoria) {
                                            setValue("subcategoriaCatalogoId", e.currentTarget.value);
                                        }
                                    }}
                                    className="border rounded-md px-3 py-2 text-base"
                                >
                                    <option value="">Seleccione una subcategoría</option>
                                    {subcategorias &&
                                        subcategorias.filter(sc => sc.categoriaCatalogoId._id === categoriaIdSeleccionada).map((subcategoria) => (
                                            <option key={subcategoria._id} value={subcategoria._id}>
                                                {subcategoria.nombre}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            {hasRole([TIPO_CARGO.gerente, TIPO_CARGO.encargado, TIPO_CARGO.cobranza])
                                && <div className="flex flex-col">
                                    <label htmlFor="precio" className="text-sm text-gray-500">Precio</label>
                                    <div className="flex items-center">
                                        <span className="text-gray-500 mr-1">$</span>
                                        <input
                                            {...register("precio", { required: true })}
                                            value={precioData?.precio || 0}
                                            type="text"
                                            id="precio"
                                            name="precio"
                                            className="border rounded-md px-3 py-2 text-base w-full text-right"
                                            placeholder="Precio"
                                            onChange={handlePrecioInputChange}
                                            inputMode="numeric"
                                        />
                                    </div>
                                </div>}
                        </div>
                    </div>
                    <div className={`mt-4`}>
                        <button
                            onClick={handleSave}
                            disabled={savingPrecio}
                            className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${savingPrecio ? 'opacity-50 cursor-not-allowed' : ''}`}                                >
                            {savingPrecio && <div className="absolute -mt-1"><Loader texto="" /></div>}
                            {hasRole([TIPO_CARGO.gerente, TIPO_CARGO.encargado, TIPO_CARGO.cobranza]) ? 'NUEVO' : 'SOLICITAR'} PRECIO
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={savingPrecio}
                            className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
