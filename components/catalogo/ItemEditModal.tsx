import { IoCloseSharp } from "react-icons/io5";
import Loader from "../Loader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useForm } from "react-hook-form";
import InputMonto from "../_prefabs/MontoInput";

interface IItemEditModal {
    id?: string;
    nombre: string;
    cantidad?: number;
    unidad?: string;
    nombreGas?: string;
    sinSifon?: boolean;
    urlImagen?: string;
    precioSugerido?: number;
    esIndustrial?: boolean;
    esMedicinal?: boolean;
    elemento?: string;
}

export default function ItemEditModal({
    isCategoria,
    item,
    onClose,
    categoriaId
}: {
    isCategoria: boolean;
    item: IItemEditModal;
    onClose: () => void;
    categoriaId?: string;
}) {
    const queryClient = useQueryClient();
    
    const itemSaveMutation = useMutation({
        mutationFn: async (data: IItemEditModal) => {
            const response = await fetch(`/api/catalogo/${isCategoria ? 'categoria' : 'subcategoria'}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return response.json();
        },
        onSuccess: (result) => {
            toast.success(`${isCategoria ? "Categoría" : "Subcategoría"} actualizada exitosamente`);
            
            // Invalidar queries para refrescar datos
            if (isCategoria) {
                queryClient.invalidateQueries({ queryKey: ['categorias'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['subcategorias', categoriaId] });
            }
            
            onClose();
        },
        onError: (error) => {
            toast.error(`Error al guardar: ${error.message}`);
        }
    });

    const onSubmit = async (data: IItemEditModal) => {
        itemSaveMutation.mutate(data);
    };

    const { register, handleSubmit, formState: { isValid }, reset } = useForm<IItemEditModal>({
        mode: "onChange",
        defaultValues: item
    });

    const handleCancel = () => {
        reset();
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 text-left px-4">
            <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
                <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl mx-auto p-8">
                    <button
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                        onClick={() => {
                            handleCancel();
                        }}
                        aria-label="Cerrar"
                        type="button"
                    >
                        <IoCloseSharp />
                    </button>
                    <div className="space-y-4 text-left">
                        <h2 className="text-xl font-bold mb-4">Editar {isCategoria ? "Categoría" : "Subcategoría"}</h2>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-semibold mb-1">Nombre</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                {...register("nombre", { required: true })}
                            />
                        </div>
                        {isCategoria && <div className="mb-4">
                            <label className="block text-gray-700 font-semibold mb-1">Elemento</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                {...register("elemento")}
                            />
                        </div>}
                        {!isCategoria ? <><div className="mb-4">
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
                        </> : <>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Es medicinal?</label>
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    {...register("esMedicinal")}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-1">Es industrial?</label>
                                <input
                                    type="checkbox"
                                    className="mr-2"
                                    {...register("esIndustrial")}
                                />
                            </div>
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div className="mb-4">
                                    <label className="block text-gray-700 font-semibold mb-1">Precio lista</label>
                                    <InputMonto name="Precio lista"
                                        register={register("precioSugerido")}
                                        symbol='$' />
                                </div>
                            </div>
                        </>}
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button
                            type="submit"
                            className="w-full h-12 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700"
                            disabled={itemSaveMutation.isPending || !isValid}
                        >
                            {itemSaveMutation.isPending ? <Loader texto="Guardando" /> : "Guardar"}
                        </button>
                        <button
                            type="button"
                            className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700"
                            onClick={() => handleCancel()}
                            disabled={itemSaveMutation.isPending}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}