"use client";

import { useState } from 'react';
import { handleRutInput, isValidRutFormat } from '@/app/utils/rutFormatter';

interface RutInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function RutInput({
    value,
    onChange,
    placeholder = "Ej: 12.345.678-9",
    className = "",
    disabled = false,
    ...props
}: RutInputProps & React.InputHTMLAttributes<HTMLInputElement>) {
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const formattedValue = handleRutInput(newValue);
        onChange(formattedValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Permitir teclas de navegación y edición
        const allowedKeys = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End'
        ];

        if (allowedKeys.includes(e.key)) return;

        // Permitir Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;

        // Permitir solo números y K/k
        if (!/^[0-9kK]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const formattedValue = handleRutInput(pastedText);
        onChange(formattedValue);
    };

    const isValid = value ? isValidRutFormat(value) : true;

    return (
        <>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full
                    ${!isValid ? 'border-red-300 focus:border-red-500' : ''}
                    ${isFocused ? 'ring-2 ring-pink-200' : ''}
                    transition-all duration-200 bg-transparent ${className}
                `}
                {...props}
            />
            {!isValid && (
                <div className="ml-2 text-xs text-red-500">
                    RUT inválido
                </div>
            )}
        </>
    );
}