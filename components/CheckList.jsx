"use client";

import { useState, useMemo } from "react";
import { TIPO_CHECKLIST_ITEM, USER_ROLE } from "@/app/utils/constants";

const itemEmployeeLabels = {
    zapatos_seguridad: "¿Zapatos de seguridad presentes?",
    polera_geologo: "¿Polera de geólogo presente?",
    guantes_segurdad: "¿Guantes de seguridad presentes?",
    bloqueador_solar: "¿Bloqueador solar presente?",
    intercomunicador: "¿Intercomunicador presente?",
    pantalon: "¿Pantalón corporativo presente?",
    casco: "¿Casco con cubrenuca presente?",
    lentes: "¿Lentes de seguridad presentes?",
    impresora: "¿Impresora portátil presente?",
}


const itemDriverLabels = {
    tarjeta_combustible: "¿Tarjeta de combustible presente?",
    hoja_seguridad_transporte: "¿Hoja de seguridad de transporte disponible?",
    permiso_circulacion: "¿Permiso de circulación vigente?",
    seguro_obligatorio: "¿Seguro obligatorio vigente?",
    botiquien: "¿Botiquín presente?",
    limpieza_cabina: "Estado de limpieza de la cabina",
    bocina: "¿Bocina funcionando?",
    cinturon_conductor: "Estado del cinturón del conductor",
    estado_pedal_freno: "Estado del pedal de freno",
    luz_emergencia: "¿Luz de emergencia funcionando?",
    luz_bocina_retroceso: "¿Luz/bocina de retroceso funcionando?",
    luz_navegacion_posicion: "¿Luz de navegación/posición funcionando?",
    luces_altas: "¿Luces altas funcionando?",
    luces_bajas: "¿Luces bajas funcionando?",
    intermitentes: "¿Intermitentes funcionando?",
    luz_patente: "¿Luz de patente funcionando?",
    luz_freno: "¿Luz de freno funcionando?",
    freno_mano: "Estado del freno de mano",
    espejos_laterales: "¿Espejos laterales en buen estado?",
    cintas_reflectantes: "Estado de las cintas reflectantes",
    regulador_oxigeno_argon: "¿Regulador de oxígeno/argón presente?",
    neumaticos_delanteros: "Estado de los neumáticos delanteros",
    neumaticos_traseros: "¿Neumáticos traseros en buen estado?",
    neumatico_repuesto: "¿Neumático de repuesto presente?",
    limpieza_exterior: "Estado de limpieza exterior",
    conos_seguridad: "¿Conos de seguridad presentes?",
};

const specialSelectorItems = [
    "cintas_reflectantes",
    "cinturon_conductor",
    "estado_pedal_freno",
    "neumaticos_delanteros",
    "freno_mano",
];

const limpiezaItems = [
    "limpieza_cabina",
    "limpieza_exterior",
];

const selectorOptions = [
    { label: "No tiene", value: 0 },
    { label: "Mal estado", value: 1 },
    { label: "Estado regular", value: 2 },
    { label: "Bien", value: 3 },
];

const limpiezaOptions = [
    { label: "Sucio", value: 0 },
    { label: "Limpio", value: 1 },
];

function getChecklistItems(session) {
    if (!session) return [];
    // Filtra solo los items de conductor (id < 128)
    return Object.entries(TIPO_CHECKLIST_ITEM)
        .filter(([, v]) => session?.user?.role == USER_ROLE.conductor ? v < 128 : v >= 128)
        .sort((a, b) => a[1] - b[1]);
}

export default function CheckList({ session, onFinish, vehiculos }) {
    const checklistItems = useMemo(() => getChecklistItems(session), [session]);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [kilometraje, setKilometraje] = useState("");
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    
    const totalSteps = checklistItems.length + 1;

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleAnswer = (key, value) => {
        setAnswers({ ...answers, [key]: value });
        handleNext();
    };

    const handleKilometraje = (e) => {
        setKilometraje(e.target.value);
    };

    const handleKilometrajeNext = () => {
        if (kilometraje) handleNext();
    };

    // Animación simple de carrousel
    const getSlideStyle = (i) => ({
        transform: `translateX(${100 * (i - step)}%)`,
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "absolute",
        width: "100%",
        top: 0,
        left: 0,
    });

    const printChecklistReport = (checklistItems) => {
        // Mapas para mostrar los labels y opciones legibles
        const allLabels = { ...itemDriverLabels, ...itemEmployeeLabels };
        const selectorValueToLabel = {};
        selectorOptions.forEach(opt => { selectorValueToLabel[opt.value] = opt.label; });
        limpiezaOptions.forEach(opt => { selectorValueToLabel[opt.value] = opt.label; });

        // Construir filas del reporte
        const rows = checklistItems.map(([key]) => {
            let respuesta = "";
            let icon = "";
            if (specialSelectorItems.includes(key)) {
                const val = answers[key];
                respuesta = selectorValueToLabel[val] ?? "-";
                icon = val === 3 ? "✔️" : val === 0 ? "❌" : "";
            } else if (limpiezaItems.includes(key)) {
                const val = answers[key];
                respuesta = limpiezaOptions.find(opt => opt.value === val)?.label ?? "-";
                icon = val === 1 ? "✔️" : val === 0 ? "❌" : "";
            } else {
                const val = answers[key];
                if (val === true) {
                    respuesta = "Sí";
                    icon = "✔️";
                } else if (val === false) {
                    respuesta = "No";
                    icon = "❌";
                } else {
                    respuesta = "-";
                }
            }
            return `
                <tr style="font-size: 10px;">
                    <td style="padding: 6px 12px; border: 1px solid #ccc;">${allLabels[key] || key}</td>
                    <td style="padding: 6px 12px; border: 1px solid #ccc; text-align:center;">${respuesta}</td>
                    <td style="padding: 6px 12px; border: 1px solid #ccc; text-align:center;">${icon}</td>
                </tr>
            `;
        }).join("");

        // Datos generales
        const fecha = new Date().toLocaleString();
        const usuario = session?.user?.name || "";
        const km = kilometraje || "-";

        const reportHtml = `
            <html>
            <head>
            <title>Reporte Checklist</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 2em; }
                h2 { margin-bottom: 0.5em; }
                table { border-collapse: collapse; width: 100%; margin-top: 1em; }
                th, td { border: 1px solid #ccc; padding: 6px 12px; }
                th { background: #f5f5f5; }
                .firma { margin-top: 2em; }
            </style>
            </head>
            <body>
            <h2>Reporte Checklist</h2>
            <div>
                <b>Fecha:</b> ${fecha}<br/>
                <b>Usuario:</b> ${usuario}<br/>
                <b>Kilometraje:</b> ${km}
            </div>
            <table>
                <thead>
                <tr>
                    <th>Ítem</th>
                    <th>Respuesta</th>
                    <th>Estado</th>
                </tr>
                </thead>
                <tbody>
                ${rows}
                </tbody>
            </table>
            <div class="firma">
                <br/><br/>
                ____________________________
                <p style="margin-left: 48px;">Firma: <b>${usuario}</b></p>
            </div>
            </body>
            </html>
        `;
        // Abre una ventana nueva y manda a imprimir
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-2">
            <div className="relative w-full max-w-xl mx-auto h-[340px] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col justify-center">
                {/* Slides */}
                <div className="relative w-full h-full">
                    {/* Paso 0: Kilometraje */}
                    {session && session.user?.role == USER_ROLE.conductor && < div style={getSlideStyle(0)} className="flex flex-col items-center justify-center h-full px-8">
                        <h2 className="text-2xl font-bold mb-4">Vehiculo y kilometraje</h2>
                        {vehiculos?.length > 1 && <div className="text-left">
                            <span>Patente</span>
                            <select
                                className="border rounded px-4 py-2 text-lg w-64 mb-4"
                                defaultValue=""
                                onClick={(e) => setSelectedVehicleId(e.target.value)}
                            >
                                <option value="" disabled>Selecciona un vehículo</option>
                                {vehiculos?.map((vehiculo) => (
                                    <option key={vehiculo._id} value={vehiculo._id}>
                                        {vehiculo.patente} - {vehiculo.marca}
                                    </option>
                                ))}
                            </select>
                        </div>
                        }
                        <div className="text-left">
                        <span>Kilometraje</span>
                        <input
                            type="number"
                            className="border rounded px-4 py-2 text-lg w-64 mb-4"
                            value={kilometraje}
                            onChange={handleKilometraje}
                            placeholder="Ej: 123456"
                            min={0}
                        />
                        </div>
                        <button
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                            onClick={handleKilometrajeNext}
                            disabled={!kilometraje}
                        >
                            Siguiente
                        </button>
                    </div>}
                    {/* Items del checklist */}
                    {checklistItems.map(([key, ], idx) => {
                        const label = (session.user.role == USER_ROLE.conductor ? itemDriverLabels : itemEmployeeLabels)[key] || `¿${key.replace(/_/g, " ")}?`;
                        const value = answers[key];
                        // Selector especial
                        if (specialSelectorItems.includes(key)) {
                            return (
                                <div key={key} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                    <h2 className="text-xl font-bold mb-6">{label}</h2>
                                    <div className="flex space-x-3 mb-6">
                                        {selectorOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`px-4 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer(key, opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="text-gray-500 underline" onClick={handlePrev} disabled={step === 0}>Atrás</button>
                                </div>
                            );
                        }
                        // Limpieza
                        if (limpiezaItems.includes(key)) {
                            return (
                                <div key={key} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                    <h2 className="text-xl font-bold mb-6">{label}</h2>
                                    <div className="flex space-x-3 mb-6">
                                        {limpiezaOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`px-6 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer(key, opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="text-gray-500 underline" onClick={handlePrev} disabled={step === 0}>Atrás</button>
                                </div>
                            );
                        }
                        // Check SI/NO
                        return (
                            <div key={key} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                <h2 className="text-xl font-bold mb-6">{label}</h2>
                                <div className="flex space-x-6 mb-6">
                                    <button
                                        className={`px-8 py-2 rounded border font-bold ${value === true ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer(key, true)}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        className={`px-8 py-2 rounded border font-bold ${value === false ? "bg-red-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer(key, false)}
                                    >
                                        No
                                    </button>
                                </div>
                                <button className="text-gray-500 underline" onClick={handlePrev} disabled={step === 0}>Atrás</button>
                            </div>
                        );
                    })}
                    {/* Finalizar */}
                    <div style={getSlideStyle(totalSteps)} className="flex flex-col items-center justify-center h-full px-8">
                        <h2 className="text-2xl font-bold mb-6">Checklist completado</h2>
                        <p className="text-gray-600 mb-6">Presiona para imprimir el reporte y finalizar el checklist</p>
                        <button
                            className={`w-full bg-green-500 text-white px-8 py-3 rounded-md font-bold text-lg`}
                            onClick={() => {
                                printChecklistReport(checklistItems);
                                onFinish?.({ kilometraje, ...answers, vehiculoId: selectedVehicleId});
                            }}>FINALIZAR CHECKLIST</button>
                    </div>
                </div>
                {/* Barra de progreso */}
                <div className="absolute bottom-4 left-0 right-0 px-8">
                    <p className="ml-1 text-xs text-right font-bold mb-1 mr-2">{`${step} / ${totalSteps}`}</p>
                    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-4 bg-blue-600 transition-all duration-300"
                            style={{
                                width: `${Math.round((step / totalSteps) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}