import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface AutocompleteItem {
    key: string | number;
    value: string;
}

interface AutocompleteInputProps {
    items: AutocompleteItem[];
    onChangeResults: (results: (string)[]) => void;
    placeholder?: string;
    className?: string;
    minChars?: number;
    debounceMs?: number;
    clearTrigger?: number;
}

export default function InputFilter({ 
    items = [], 
    onChangeResults, 
    placeholder = "Escribir para buscar...",
    className = "",
    minChars = 3,
    debounceMs = 1000,
    clearTrigger
}: AutocompleteInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [filteredItems, setFilteredItems] = useState<AutocompleteItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const onChangeResultsRef = useRef(onChangeResults);

    // Actualizar ref cuando onChangeResults cambia
    useEffect(() => {
        onChangeResultsRef.current = onChangeResults;
    }, [onChangeResults]);

    useEffect(() => {
        // Limpiar timer anterior
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (inputValue.trim() === "") {
            setFilteredItems([]);
            onChangeResultsRef.current([]);
            return;
        }

        // Si no hay suficientes caracteres, no filtrar
        if (inputValue.trim().length < minChars) {
            setFilteredItems([]);
            onChangeResultsRef.current([]);
            return;
        }

        // Debounce: esperar antes de filtrar
        debounceTimerRef.current = setTimeout(() => {
            const filtered = items.filter(item =>
                item.value.toLowerCase().includes(inputValue.toLowerCase())
            );
            setFilteredItems(filtered);
            onChangeResultsRef.current(filtered.map(item => String(item.key)));
            setSelectedIndex(-1);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [inputValue, minChars, debounceMs, items]);

    useEffect(() => {
        setInputValue("");
        setFilteredItems([]);
        onChangeResultsRef.current([]);
    }, [clearTrigger]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSelect = (item: AutocompleteItem) => {
        onChangeResultsRef.current([String(item.key)]);
        setInputValue("");
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => 
                prev < filteredItems.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
                handleSelect(filteredItems[selectedIndex]);
            } else if (filteredItems.length === 1) {
                handleSelect(filteredItems[0]);
            }
        } else if (e.key === "Escape") {
            onChangeResultsRef.current([]);
            setSelectedIndex(-1);
        }
    };

    const handleAgregarClick = () => {
        if (filteredItems.length > 0) {
            const itemToSelect = selectedIndex >= 0 ? filteredItems[selectedIndex] : filteredItems[0];
            handleSelect(itemToSelect);
        }
    };

    return (
        <div className="relative">
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={`flex-1 border border-[#d5c7aa] rounded px-3 py-2 bg-white focus:border-[#ac9164] focus:outline-none ${className}`}
                />
                <button
                    type="button"
                    onClick={handleAgregarClick}
                    disabled={filteredItems.length === 0}
                    className="bg-[#66754c] text-white px-3 py-2 rounded text-sm hover:bg-[#8e9b6d] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Agregar
                </button>
            </div>            
        </div>
    );
}