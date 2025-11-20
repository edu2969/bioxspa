"use client"

import React, { useState } from 'react';
import { TbDatabaseImport } from 'react-icons/tb';
import toast, { Toaster } from 'react-hot-toast';

const ImportacionPage = () => {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Por favor seleccione un archivo.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const body = {
                    filename: file.name,
                    entities: json
                };
                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (data.ok) {
                    toast.success("Archivo procesado exitosamente.");
                } else {
                    toast.error(data.message || "Error al procesar el archivo.");
                }
            } catch (error) {
                toast.error("Error al procesar el archivo.");
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl uppercase mb-4">Importación de datos</h1>
            <div className="flex items-center">
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ width: '380px' }}
                />
                <button
                    onClick={handleUpload}
                    className="ml-2 flex items-center bg-blue-500 text-white px-4 py-2 rounded"
                >
                    <TbDatabaseImport className="mr-2" />
                    IMPORTAR
                </button>
            </div>
            <Toaster />
        </div>
    );
};

export default ImportacionPage;