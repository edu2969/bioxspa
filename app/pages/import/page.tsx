"use client";

import { useState } from "react";
import Loader from "@/components/Loader";

export default function ImportPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setMessage("No file selected.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const fileContent = await file.text();
            const jsonData = JSON.parse(fileContent);

            const response = await fetch("/api/regenerator?q=fixDT", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();
            if (response.ok && result.ok) {
                setMessage("Processing completed successfully.");
            } else {
                setMessage(`Error: ${result.error || "Unknown error occurred."}`);
            }
        } catch (error) {
            console.error("Error processing file:", error);
            setMessage("An error occurred while processing the file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Import JSON File</h1>
            <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="mb-4"
            />
            {loading && <Loader texto="Processing..." />}
            {message && <p className="mt-4">{message}</p>}
        </div>
    );
}