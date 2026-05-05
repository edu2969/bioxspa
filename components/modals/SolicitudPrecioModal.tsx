import { useAuthorization } from '@/lib/auth/useAuthorization';
import { useState } from "react";
import { ICategoriasView } from "@/types/categoriaCatalogo";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LiaTimesSolid } from "react-icons/lia";
import { TbMoneybagMoveBack } from "react-icons/tb";
import { useForm } from "react-hook-form";
import { TIPO_CARGO } from "@/app/utils/constants";
import Loader from "../Loader";
import InputMonto from "../_prefabs/InputMonto";

interface ISolicitudPrecioForm {    
    subcategoriaCatalogoId: string;
    precioSugerido: number;
    valor: number;
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
    const { register, setValue, getValues } = useForm<ISolicitudPrecioForm>();

    const queryClient = useQueryClient();

    const { data: categorias } = useQuery<ICategoriasView[]>({
        queryKey: ['categorias-catalogo'],
        queryFn: async () => {
            const response = await fetch('/api/catalogo/categorias');
            const data = await response.json();
            console.log("Categorías obtenidas:", data);
            return data.categorias;
        },
    });

    const { data: subcategorias, isLoading: isLoadingSubcategorias } = useQuery<ISubcategoriaCatalogo[]>({
        queryKey: ['subcategorias-catalogo'],
        queryFn: async () => {
            if (!categoriaIdSeleccionada) return [];
            const response = await fetch(`/api/catalogo/subcategorias?categoriaId=${categoriaIdSeleccionada}`);
            const data = await response.json();
            console.log("Subcategorías obtenidas para categoría", categoriaIdSeleccionada, ":", data);
            return data.subcategorias;
        },
        enabled: !!categoriaIdSeleccionada,
    });

    const handleCancel = () => {
        onClose();
    };

    const handlePrecioInputChange = (valor: number) => {
        setPrecioData(prev => prev ? { ...prev, valor } : null);
        setValue("valor", valor);
    };

    const savePrecio = useMutation({
        mutationFn: async (data: { clienteId: string; subcategoriaCatalogoId: string; valor: number }) => {
            const response = await fetch('/api/precios', {
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
                queryClient.invalidateQueries({ queryKey: ['precios-cliente', clienteId] });
                onClose();
            }
        },
        onError: () => {
            toast.error('Error al guardar el precio');
        }
    });

    const handleSave = () => {
        const subcategoriaId = getValues("subcategoriaCatalogoId");
        const precio = parseInt(String(getValues("valor") || '0').replace(/\D/g, ''));
        console.log("Data", subcategoriaId, precio);

        if (!subcategoriaId || !precio) return;
        
        savePrecio.mutate({
            clienteId: clienteId,
            subcategoriaCatalogoId: subcategoriaId,
            valor: precio
        });
    };

    const cargarPrecioSugerido = () => {
        console.log("Cargando precio sugerido para subcategoría:", precioData);
        if (!precioData) return;
        setPrecioData(prev => prev ? { ...prev, valor: prev.precioSugerido || 0 } : null);
        setValue("valor", precioData.precioSugerido || 0);
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
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex flex-col">
                                <label htmlFor="subcategoriaId" className="text-sm text-gray-500">Subcategoría</label>
                                <select
                                    {...register("subcategoriaCatalogoId")}
                                    value={precioData?.subcategoriaCatalogoId || ""}
                                    disabled={isLoadingSubcategorias}
                                    onChange={(e) => {
                                        const selectedSubcategoria = subcategorias?.find(sc => sc.id === e.currentTarget.value);
                                        if (selectedSubcategoria) {
                                            setValue("subcategoriaCatalogoId", e.currentTarget.value);
                                            setPrecioData({
                                                subcategoriaCatalogoId: e.currentTarget.value,
                                                valor: 0,
                                                precioSugerido: selectedSubcategoria?.precioSugerido || 0
                                            });
                                        }
                                        console.log("Subcategoría seleccionada:", e.currentTarget.value);
                                        console.log("Datos de precio actualizados:", selectedSubcategoria);
                                    }}
                                    className="border rounded-md px-3 py-2 text-base"
                                >
                                    <option value="">Seleccione una subcategoría</option>
                                    {subcategorias &&
                                        subcategorias.filter(sc => sc.categoriaCatalogoId === categoriaIdSeleccionada).map((subcategoria) => (
                                            <option key={subcategoria.id} value={subcategoria.id}>
                                                {subcategoria.cantidad} {subcategoria.unidad}
                                            </option>
                                        ))
                                    }
                                </select>
                                {isLoadingSubcategorias && <div className="absolute bg-white/80 w-full right-0 top-6">
                                    <Loader texto="" />
                                </div>}
                            </div>
                            {hasRole([TIPO_CARGO.cobranza])
                                && <div className="flex"><div className="flex flex-col w-full">
                                    <label htmlFor="precio" className="text-sm text-gray-500">Precio</label>
                                    <InputMonto
                                        name="valor"
                                        symbol="$"
                                        placeholder="Precio"
                                        className="w-full"
                                        value={precioData?.valor}
                                        register={register("valor", { required: true })}
                                        onChange={handlePrecioInputChange}
                                    />
                                </div>
                                    <button type="button"
                                        className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                                        onClick={() => cargarPrecioSugerido()} >
                                        <TbMoneybagMoveBack size="1.8rem" />
                                    </button>
                                </div>}
                        </div>
                    </div>
                    <div className={`mt-4`}>
                        <button
                            type='button'
                            onClick={handleSave}
                            disabled={savePrecio.isPending}
                            className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${savePrecio.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}                                >
                            {savePrecio.isPending && <div className="absolute -mt-1"><Loader texto="" /></div>}
                            {hasRole([TIPO_CARGO.cobranza]) ? 'NUEVO' : 'SOLICITAR'} PRECIO
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={savePrecio.isPending}
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
