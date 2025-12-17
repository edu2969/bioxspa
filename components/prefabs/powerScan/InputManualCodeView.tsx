import Loader from "@/components/Loader";
import { InputEvent, useCallback, useEffect, useRef, useState } from "react";
import { BsQrCodeScan } from "react-icons/bs";
import toast from "react-hot-toast";
import { IItemCatalogoPowerScanView } from "../types";

export default function InputManualCodeView(props: {
    onCodeSubmit: (code: string) => void,
    scanMode: boolean,
    setScanMode: (mode: boolean) => void,
    setSelectedItem: (item: IItemCatalogoPowerScanView) => void,
}) {

    const { onCodeSubmit, scanMode, setScanMode, setSelectedItem } = props;
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    const gestionarItem = useCallback(async (codigo: string) => {
        // Lógica para gestionar el item escaneado
        try {
            const response = await fetch(`/api/cilindros/gestionar/${codigo}`);
            const data = await response.json();

            if (data.ok && data.item) {
                setSelectedItem(data.item);
                toast.success(`Cilindro encontrado: ${codigo}`);
                setInputTemporalVisible(false);
                setScanMode(false);

                // Cargar datos completos y mostrar modal
                onCodeSubmit(codigo);
            } else {
                toast.error(data.error || 'Cilindro no encontrado');
                setInputTemporalVisible(false);
                setScanMode(false);
            }
        } catch (error) {
            console.error('Error al buscar cilindro:', error);
            toast.error('Error al buscar el cilindro');
            setScanMode(false);
        }
    }, [setSelectedItem, setScanMode, onCodeSubmit]);

    useEffect(() => {
        const handleTextInput = (e: Event) => {
            if (scanMode) {
                const inputEvent = e as unknown as InputEvent;
                const codigo = inputEvent.data ? inputEvent.data.trim() : '';
                if (codigo === "x") {
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (hiddenInputRef.current)
                            hiddenInputRef.current.focus();
                    }, 0);
                    return;
                }
                gestionarItem(codigo);
            }
        }

        const inputElement = hiddenInputRef.current;
        if (inputElement) {
            inputElement.addEventListener('textInput', handleTextInput as EventListener);
            inputElement.focus();
        }

        return () => {
            if (inputElement) {
                inputElement.removeEventListener('textInput', handleTextInput as EventListener);
            }
        };
    }, [scanMode, gestionarItem, hiddenInputRef]);    

    return (<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 px-4">
        {!inputTemporalVisible ? <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
            <BsQrCodeScan className="text-8xl text-green-500 mb-4" />
            <div className="flex">
                <Loader texto="Escaneando código..." />
            </div>
            <p className="text-gray-500 text-sm mt-2">Por favor, escanee un código QR</p>
        </div> : <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
            <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
            <input
                ref={hiddenInputRef}
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                onKeyDown={(e) => {
                    console.log("event key:", e.key);
                    if (e.key === 'Enter') {
                        console.log("Código temporal ingresado:", e.currentTarget.value);
                        setInputTemporalVisible(false);
                        gestionarItem(e.currentTarget.value);
                        e.currentTarget.value = '';
                    }
                    if (e.key === 'Escape') {
                        setInputTemporalVisible(false);
                        setScanMode(false);
                    }
                }}
            />
        </div>}
        <input
            ref={hiddenInputRef}
            type="text"
            className="opacity-0 h-0 w-0 absolute"
            inputMode="none"
        />
    </div>);
}