import { Dialog, DialogTitle } from "@headlessui/react";
import { BiSolidCommentDots, BiTargetLock } from "react-icons/bi";
import MapWithDraggableMarker from "../maps/MapWithDraggableMarker";
import { useState } from "react";
import { GoogleMapsProvider } from "../maps/GoogleMapProvider";

export function ClientAddressManagerModal({
    show,
    onClose
}: {
    show: boolean;
    onClose: () => void;
}) {
    const [editMode, setEditMode] = useState(false);
    const [direccionEdit, setDireccionEdit] = useState<{
        nombre: string;
        latitud: number;
        longitud: number;
        comentario?: string;
        direccionId?: number;
    } | null>(null);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);

    const handleMapMarkerChange = ({ lat, lng }: { lat: number; lng: number }) => {
        setDireccionEdit((prev) => prev ? { ...prev, latitud: lat, longitud: lng } : { nombre: "", latitud: lat, longitud: lng, comentario: "" });
    };

    const handleDireccionChange = (field: string, value: string | number) => {
        setDireccionEdit((prev) => prev ? { ...prev, [field]: value } : null);
    };

    const handleRemoveDireccion = (idx: number) => {
        // TODO: Implement remove logic
    };

    const handleAjustarDireccion = (idx: number) => {
        // TODO: Implement adjust logic
    };

    // Guarda los cambios en la dirección
    const handleGuardarDireccion = () => {
        // TODO: Implement save logic
    };

    return (<GoogleMapsProvider>
        <Dialog open={show} onClose={onClose}>
            <DialogTitle className="text-lg font-bold text-gray-700 px-4 pt-4">Gestor de direcciones</DialogTitle>
            <div className={`w-full flex transition-all ease-linear overflow-hidden`}>
                <div className="w-2/3 h-80">
                    <MapWithDraggableMarker
                        lat={direccionEdit?.latitud ?? 0}
                        lng={direccionEdit?.longitud ?? 0}
                        onMarkerChange={handleMapMarkerChange}
                    />
                </div>
                <div className="w-1/3 pl-4">
                    <div className="gap-4">
                        <div className="flex gap-4 mt-2">
                            <div>
                                <label className="block text-xs text-gray-500">Latitud</label>
                                <input
                                    type="number"
                                    value={direccionEdit?.latitud ?? ""}
                                    readOnly
                                    className="block w-32 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Longitud</label>
                                <input
                                    type="number"
                                    value={direccionEdit?.longitud ?? ""}
                                    readOnly
                                    className="block w-32 px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs text-gray-500 mb-1">Comentario</label>
                            <textarea
                                value={direccionEdit?.comentario || ""}
                                onChange={e => setDireccionEdit(prev => prev ? { ...prev, comentario: e.target.value } : null)}
                                className="block w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs resize-none"
                                rows={3}
                                placeholder="Comentario sobre la dirección"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                onClick={() => setEditMode(false)}
                            >
                                CANCELAR
                            </button>
                            <button
                                type="button"
                                className="flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                                onClick={handleGuardarDireccion}
                            >
                                <BiTargetLock className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full pr-0 md:pr-4 flex">
                <div className="w-full">
                    <label htmlFor="direccion_despacho_id" className="block text-sm font-medium text-gray-700">Label!</label>

                    <div key={`direccion_despacho`} className="flex items-center gap-2 mb-2">
                        <input type="text"
                            value={direccionEdit?.nombre || ""}
                            onChange={e => handleDireccionChange("nombre", e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                            placeholder="Nombre dirección"
                        />
                        <button type="button"
                            className={`flex text-black-500 hover:text-black-700 ${direccionEdit?.comentario == null ? 'opacity-20' : ''}`}
                        >
                            <BiSolidCommentDots size="2.25em" className="mx-auto" />
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    </GoogleMapsProvider>);
}