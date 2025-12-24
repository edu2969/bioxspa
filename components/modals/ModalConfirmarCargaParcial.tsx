import { IoIosWarning } from "react-icons/io";
import { LiaTimesSolid } from "react-icons/lia";

export default function ModalConfirmarCargaParcial({
    onConfirm,
    onClose
}: {
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (<form onSubmit={() => onConfirm()}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                <div className="absolute top-2 right-2">
                    <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                        aria-label="Cerrar"
                        type="button"
                    >
                        <LiaTimesSolid />
                    </button>
                </div>
                <div className="mt-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Confirmar carga parcial</h3>
                    <div className="flex">
                        <IoIosWarning className="text-6xl text-yellow-500 mx-auto mr-2 w-64" />
                        <p className="text-md text-gray-500">¡Falta carga!. Tendrá que completarla más tarde. ¿Seguro desea continuar?</p>
                    </div>
                    <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Confirmar
                    </button>
                    <button
                        onClick={() => onClose()}
                        className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </form>);
}