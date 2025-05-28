"use client";

import { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BarcodeScanner() {
    const [currentScan, setCurrentScan] = useState<string>('');
    const [scannedItems, setScannedItems] = useState<string[]>([]);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Variables para detectar si es un escáner o entrada manual
        let lastInputTime = 0;
        const scannerDelay = 50; // milisegundos entre teclas para un escáner típico

        const handleInput = (e: any) => {
            toast.info("--- Input: " + e.which, { autoClose: 20000 });
            const currentTime = Date.now();
            const inputElement = e.target as HTMLInputElement;
            const value = e.which;

            setCurrentScan(value);

            // Si es final de escaneo (normalmente detectado por tiempo entre caracteres)
            if (value && (currentTime - lastInputTime < scannerDelay || lastInputTime === 0)) {
                if (value.includes('\n') || value.includes('\r')) {
                    const cleanValue = value.replace(/[\r\n]+/g, '');
                    setScannedItems(prev => [...prev, cleanValue]);
                    setCurrentScan('');
                    inputElement.value = '';
                }
            } else if (currentTime - lastInputTime > scannerDelay && lastInputTime !== 0) {
                // Reiniciar si parece entrada manual
                inputElement.value = '';
            }

            lastInputTime = currentTime;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            toast.info("--- KeyDown: " + e.key, { autoClose: 20000 });
            if (e.key === 'Enter' && currentScan) {
                setScannedItems(prev => [...prev, currentScan]);
                setCurrentScan('');
            }
        }

        const handlePaste = (e: ClipboardEvent) => {
            const pastedText = e.clipboardData?.getData('text') || '';
            toast.info("--- Paste:" + pastedText, { autoClose: 20000 });
            setCurrentScan(pastedText);
            setScannedItems(prev => [...prev, pastedText]);
            e.preventDefault();
        }

        const handleTextInput = (e: any) => {
            toast.info("--- TextInput: " + e.data, { autoClose: 20000 });
            if (e.data) setCurrentScan(prev => prev + e.data);
        }

        const inputElement = hiddenInputRef.current;
        if (inputElement) {
            // Standard input event for text capture
            inputElement.addEventListener('input', handleInput);

            // Keyboard event (some scanners simulate keyboard input)
            inputElement.addEventListener('keydown', handleKeyDown);

            // Paste event (some PDA scanners use clipboard)
            inputElement.addEventListener('paste', handlePaste);

            // textInput event (supported by some mobile browsers)
            inputElement.addEventListener('textInput', handleTextInput);

            inputElement.focus();
        }

        toast.success("--- Events registered...");

        return () => {
            if (inputElement) {
                inputElement.removeEventListener('input', handleInput);
                inputElement.removeEventListener('keydown', handleKeyDown);
                inputElement.removeEventListener('paste', handlePaste);
                inputElement.removeEventListener('textInput', handleTextInput);
            }
        };
    }, []);

    // Mantener el foco en el input oculto para capturar eventos
    useEffect(() => {
        const keepFocus = setInterval(() => {
            if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
                hiddenInputRef.current.focus();
            }
        }, 300);

        return () => clearInterval(keepFocus);
    }, []);

    return (
        <div className="min-h-screen p-4">
            <h1 className="text-2xl font-bold mb-6 mt-12">Escáner PDA v0.73</h1>

            {/* Input invisible para capturar eventos sin mostrar teclado */}
            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                autoFocus
            />

            {/* Visualización del escaneo actual */}
            <div className="mb-6">
                <h2 className="text-xl mb-2">Escaneo actual:</h2>
                <div className="border p-3 bg-gray-50 min-h-[40px]">
                    {currentScan || "Esperando escaneo..."}
                </div>
            </div>

            {/* Historial de escaneos */}
            <div>
                <h2 className="text-xl mb-2">Historial de escaneos:</h2>
                {scannedItems.length > 0 ? (
                    <ul className="border divide-y">
                        {scannedItems.map((item, index) => (
                            <li key={index} className="p-3">
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No hay escaneos registrados</p>
                )}
            </div>
            <ToastContainer />
        </div>
    );
}
