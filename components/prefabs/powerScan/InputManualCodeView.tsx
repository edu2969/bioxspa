import Loader from "@/components/Loader";
import { InputEvent, useEffect, useRef, useState } from "react";
import { BsQrCodeScan } from "react-icons/bs";
import { useOnVisibilityChange } from "@/components/uix/useOnVisibilityChange";

export default function InputManualCodeView(props: {
    onCodeSubmit: (code: string) => void,
    scanMode: boolean,
    setScanMode: (mode: boolean) => void
}) {
    const { onCodeSubmit, scanMode, setScanMode } = props;
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const visibleInputRef = useRef<HTMLInputElement>(null);
    
    // Hook para manejar cuando la aplicación vuelve a ser visible
    useOnVisibilityChange(() => {
        if (scanMode && !inputTemporalVisible) {
            // Mantener el foco en el input oculto cuando volvemos a la aplicación
            setTimeout(() => {
                if (hiddenInputRef.current) {
                    hiddenInputRef.current.focus();
                }
            }, 100);
        }
    });
    
    useEffect(() => {
        const handleTextInput = (e: Event) => {
            console.log("Input event: scanMode", scanMode, "Data", (e as unknown as InputEvent).data);
            if (scanMode) {
                const inputEvent = e as unknown as InputEvent;
                const codigo = inputEvent.data ? inputEvent.data.trim() : '';
                if (codigo === "x") {
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (visibleInputRef.current)
                            visibleInputRef.current.focus();
                    }, 100);
                    return;
                }

                if(codigo === "Escape") {
                    setScanMode(false);
                    return;
                }
            }
        }

        const inputElement = hiddenInputRef.current;
        if (inputElement && scanMode) {
            inputElement.addEventListener('textInput', handleTextInput as EventListener);
            
            // Solo enfocar cuando no esté visible el input temporal
            if (!inputTemporalVisible) {
                inputElement.focus();
            }
        }

        return () => {
            if (inputElement) {
                inputElement.removeEventListener('textInput', handleTextInput as EventListener);
            }
        };
    }, [scanMode, inputTemporalVisible, setScanMode]);

    return (<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50 px-4">
        {!inputTemporalVisible ? <>
            <div className="absolute top-2 bg-white rounded-lg shadow-lg px-4 py-2 max-w-xs">
                <div className="flex">
                    <Loader texto="Escanee un código..." />
                </div>
            </div>
            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
                onKeyDown={(e) => {                    
                    if (e.key === 'Escape') {
                        setInputTemporalVisible(false);
                        setScanMode(false);
                    }
                }}
            />
        </> :
        <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
            <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
            <input
                ref={visibleInputRef}
                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                onKeyDown={(e) => {
                    console.log("event key:", e.key);
                    if (e.key === 'Enter') {
                        console.log("Código temporal ingresado:", e.currentTarget.value);
                        const codigo = e.currentTarget.value;
                        setInputTemporalVisible(false);
                        onCodeSubmit(codigo);
                        e.currentTarget.value = '';
                        
                        // Re-enfocar el input oculto después de procesar
                        setTimeout(() => {
                            if (hiddenInputRef.current) {
                                hiddenInputRef.current.focus();
                            }
                        }, 100);
                    }
                    if (e.key === 'Escape') {
                        setInputTemporalVisible(false);
                        setScanMode(false);
                    }
                }}
            />
        </div>}
    </div>);
}