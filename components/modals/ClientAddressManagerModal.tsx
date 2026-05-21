import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { BiTargetLock, BiX } from "react-icons/bi";
import MapWithDraggableMarker from "../maps/MapWithDraggableMarker";
import { useEffect, useState } from "react";
import { GoogleMapsProvider } from "../providers/GoogleMapProvider";
import { IDireccion } from "@/types/direccion";
import InputAddressAutocomplete from "../_prefabs/AddressAutocompleteInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from 'react-hot-toast';
import Loader from "../Loader";

export function ClientAddressManagerModal({
    clienteId,
    show,
    initialDireccion,
    onClose
}: {
    clienteId: string | null;
    show: boolean;
    initialDireccion?: IDireccion | null;
    onClose: () => void;
}) {
    const [direccionEdit, setDireccionEdit] = useState<IDireccion | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!show) return;

        const latitud = initialDireccion?.latitud ?? -33.45;
        const longitud = initialDireccion?.longitud ?? -70.65;

        setDireccionEdit({
            id: initialDireccion?.id ?? "",
            direccionCliente: initialDireccion?.direccionCliente ?? "",
            latitud,
            longitud,
            comentario: initialDireccion?.comentario ?? ""
        });
    }, [show, initialDireccion]);    
    
    const guardarDireccionDespacho = useMutation({
        mutationFn: async (data: IDireccion) => {
            const direccion = { ...data };
            if(direccion.direccionCliente && direccion.direccionCliente.indexOf(",") !== -1) {
                direccion.direccionCliente = direccion.direccionCliente.split(",")[0];
            }
            const response = await fetch(`/api/clientes/direccionesDespacho`, {
                method: 'POST',
                body: JSON.stringify({
                    clienteId,
                    direccion
                })
            });
            return await response.json();        
        },
        onSuccess: (resp: { ok: boolean, error?: string }) => {
            if(resp.ok) {
                toast.success("Guardado exitósamente");
                queryClient.invalidateQueries({ queryKey: ["cliente-by-id", clienteId] });
                onClose();
            } else {
                toast.error("No se ha guardado: " + resp.error);
            }            
        },
        onError: (error) => {
            toast.error("Error: " + error);
        }
    });

    const handleMapMarkerChange = ({ lat, lng }: { lat: number; lng: number }) => {
        setDireccionEdit((prev) => prev ? 
            { ...prev, latitud: lat, longitud: lng } : 
            { id: "", direccionCliente: "", latitud: lat, longitud: lng });
    };

    // Guarda los cambios en la dirección
    const handleGuardarDireccion = () => {
        if (!direccionEdit) return;
        guardarDireccionDespacho.mutate(direccionEdit);
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
                <DialogTitle className="text-lg font-bold text-gray-700 px-4 pt-4 pb-2">
                    Gestor de direcciones
                </DialogTitle>                  
                <div className="w-full px-4 pb-2">
                    <InputAddressAutocomplete onSelect={setDireccionEdit} initialAddress={direccionEdit?.direccionCliente || ''} />
                </div>
                <div className={`w-full flex transition-all ease-linear overflow-hidden px-4`}>
                    <div className="w-2/3 h-80 mb-2">
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
                        className="relative flex px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
                        onClick={handleGuardarDireccion}
                    >
                        <BiTargetLock className="mt-0.5 mr-2" size="1.25em" />GUARDAR
                        {guardarDireccionDespacho.isPending && <div className="absolute left-0 top-0 bg-white/70 w-full py-1">
                            <Loader texto=""/>
                        </div>}
                    </button>
                </div>
            </DialogPanel>
        </Dialog>
    </GoogleMapsProvider>);
}