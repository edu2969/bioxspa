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
    }, [scanMode, hiddenInputRef]);    

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
                        onCodeSubmit(e.currentTarget.value);
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