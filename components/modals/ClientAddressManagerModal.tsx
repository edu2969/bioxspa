import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { BiSolidCommentDots, BiTargetLock, BiX } from "react-icons/bi";
import MapWithDraggableMarker from "../maps/MapWithDraggableMarker";
import { useEffect, useState } from "react";
import { GoogleMapsProvider } from "../maps/GoogleMapProvider";
import { IDireccion } from "@/types/direccion";

export function ClientAddressManagerModal({
    show,
    initialDireccion,
    onClose
}: {
    show: boolean;
    initialDireccion?: IDireccion | null;
    onClose: () => void;
}) {
    const [direccionEdit, setDireccionEdit] = useState<{
        direccionCliente: string;
        latitud: number;
        longitud: number;
        comentario?: string;
        direccionId?: number;
    } | null>(null);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);

    useEffect(() => {
        if (!show) return;

        const latitud = initialDireccion?.latitud ?? -33.45;
        const longitud = initialDireccion?.longitud ?? -70.65;

        setDireccionEdit({
            direccionCliente: initialDireccion?.direccionCliente ?? "",
            latitud,
            longitud,
            comentario: initialDireccion?.comentario ?? "",
            direccionId: initialDireccion?.id ? Number(initialDireccion.id) : undefined
        });
    }, [show, initialDireccion]);

    const handleMapMarkerChange = ({ lat, lng }: { lat: number; lng: number }) => {
        setDireccionEdit((prev) => prev ? 
            { ...prev, latitud: lat, longitud: lng } : 
            { direccionCliente: "", latitud: lat, longitud: lng, comentario: "" });
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
        if (!direccionEdit) return;

        // TODO: Reemplazar por mutateAsync de TanStack Query hacia /api/clientes/direcciones.
        // Sugerencia payload: { id: direccionEdit.direccionId, nombre, latitud, longitud, comentario }
        onClose();
    };

    return (<GoogleMapsProvider>
        <Dialog open={show} onClose={onClose} className="fixed w-full md:w-[480px] m-auto inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <DialogPanel className="relative z-10 w-full max-w-5xl rounded-lg bg-white shadow-xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    aria-label="Cerrar modal"
                >
                    <BiX size="1.8em" />
                </button>
                <DialogTitle className="text-lg font-bold text-gray-700 px-4 pt-4">
                    Gestor de direcciones
                </DialogTitle>
                <div className={`w-full flex transition-all ease-linear overflow-hidden px-4`}>
                    <div className="w-2/3 h-80">
                        <MapWithDraggableMarker
                            lat={direccionEdit?.latitud ?? 0}
                            lng={direccionEdit?.longitud ?? 0}
                            onMarkerChange={handleMapMarkerChange}
                        />
                    </div>
                    <div className="w-1/3 pl-4 flex flex-col">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2 mt-2">
                                <div>
                                    <label className="block text-xs text-gray-500">Latitud</label>
                                    <input
                                        type="number"
                                        value={direccionEdit?.latitud ?? ""}
                                        readOnly
                                        className="block w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Longitud</label>
                                    <input
                                        type="number"
                                        value={direccionEdit?.longitud ?? ""}
                                        readOnly
                                        className="block w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs text-gray-500 mb-1">Comentario</label>
                                <textarea
                                    value={direccionEdit?.comentario || ""}
                                    onChange={e => setDireccionEdit(prev => prev ? { ...prev, comentario: e.target.value } : null)}
                                    className="block w-full px-2 py-1 border border-gray-200 rounded bg-gray-50 text-xs resize-none"
                                    rows={9}
                                    placeholder="Algún detalle importante del lugar"
                                />
                            </div>
                        </div>
                    </div>
                </div>    
                <div className="w-full px-4">
                        <div key={`direccion_despacho`} className="flex items-center gap-2 mb-2">
                            <input type="text"
                                value={direccionEdit?.direccionCliente || ""}
                                onChange={e => handleDireccionChange("direccionCliente", e.target.value)}
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
                <div className="w-full px-4 pb-4 pt-2 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        type="button"
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        onClick={onClose}
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
            </DialogPanel>
        </Dialog>
    </GoogleMapsProvider>);
}