"use client";

import { useState, useMemo } from "react";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM, USER_ROLE } from "@/app/utils/constants";
import { AiOutlineClose } from "react-icons/ai";
import Loader from "./Loader";
import { IoIosArrowBack } from "react-icons/io";

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

function getChecklistItems(tipo) {
    // Filtra solo los items de conductor (id < 128)
    return Object.entries(TIPO_CHECKLIST_ITEM)
        .filter(([, v]) => tipo === TIPO_CHECKLIST.vehiculo ? v < 128 : v >= 128)
        .sort((a, b) => a[1] - b[1]);
}

export default function CheckList({ session, onFinish, vehiculos = [], tipo, loading }) {
    const checklistItems = useMemo(() => getChecklistItems(tipo), [tipo]);
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
        if ((tipo === TIPO_CHECKLIST.vehiculo && kilometraje) || tipo === TIPO_CHECKLIST.personal) handleNext();
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

    // Imprime el checklist usando una ventana nueva (desktop) o descarga PDF/HTML (mobile)
    // Genera y descarga el PDF del checklist usando la API del backend
    // Permite descargar el PDF del checklist después de finalizarlo
    const downloadChecklistPDF = async (checklist) => {
        checklist.tipo = tipo;
        try {
            const res = await fetch("/api/reportes/checklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(checklist),
            });
            if (!res.ok) {
                alert("No se pudo generar el PDF del checklist.");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "reporte_checklist.pdf";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            alert("Error al descargar el PDF del checklist.");
            console.error("Error al descargar el PDF del checklist:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-2">
            <div className="relative w-full max-w-xl mx-auto h-[380px] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col justify-center">
                {/* Botón de cerrar */}
                {tipo === TIPO_CHECKLIST.vehiculo && <button
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl z-10"
                    onClick={() => window.history.back()}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                    <AiOutlineClose/>
                </button>}
                {/* Slides */}
                <div className="relative w-full h-full">
                    {/* Paso 0: Título */}
                    <div style={getSlideStyle(0)} className="flex flex-col items-center justify-center h-full px-8">
                        <h1 className="text-3xl mb-4">Checklist {tipo === TIPO_CHECKLIST.vehiculo ? "vehiculo" : "personal"}</h1>
                        {tipo === TIPO_CHECKLIST.vehiculo && <>
                        <h2 className="text-md mb-4 -mt-4">Vehiculo y kilometraje</h2>
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
                        </div>}
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
                        </>}                        
                        <button
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                            onClick={handleKilometrajeNext}
                            disabled={tipo === TIPO_CHECKLIST.vehiculo && !kilometraje}
                        >
                            {step == 0 ? 'Iniciar' : 'Siguiente'}
                        </button>
                    </div>
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
                                <button className="flex text-gray-500 underline" onClick={handlePrev} disabled={step === (tipo === TIPO_CHECKLIST.vehiculo ? 0 : 1)}>
                                    <IoIosArrowBack className="mt-0.5 -ml-6" size="1.25rem"/>ATRÁS
                                </button>
                            </div>
                        );
                    })}
                    {/* Finalizar */}
                    <div style={getSlideStyle(totalSteps)} className="flex flex-col items-center justify-center h-full px-8">
                        <h2 className="text-2xl font-bold mb-8">Checklist completado</h2>                        
                        {(() => {
                            // Determina si el checklist está aprobado o rechazado
                            function resultadoChecklist(checklistItems, answers) {
                                return checklistItems.every(([key, value]) => {
                                    if (value % 2 === 1) {
                                        const respuesta = answers[key];
                                        return respuesta !== 0 && respuesta !== false && respuesta !== undefined && respuesta !== null;
                                    }
                                    return true;
                                });
                            }
                            const aprobado = resultadoChecklist(checklistItems, answers);
                            return aprobado ? (
                                <div className="inline-block border-4 border-green-600 text-green-600 font-bold text-xl px-8 py-2 rounded-xl bg-green-50 shadow-md uppercase tracking-wider mb-6" style={{transform: "rotate(-8deg)"}}>
                                    <span className="mr-2 text-2xl align-middle">✅</span> APROBADO
                                </div>
                            ) : (
                                <div className="inline-block border-4 border-red-600 text-red-600 font-bold text-xl px-8 py-2 rounded-xl bg-red-50 shadow-md uppercase tracking-wider mb-6" style={{transform: "rotate(-8deg)"}}>
                                    <span className="mr-2 text-2xl align-middle">❌</span> RECHAZADO
                                </div>
                            );
                        })()}
                        <button
                            className={`w-full bg-green-500 text-white px-8 h-12 rounded-md font-bold text-lg mt-4 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={loading}
                            onClick={() => {
                                console.log("CHECKLIST ---> ", { kilometraje, ...answers, vehiculoId: selectedVehicleId});
                                onFinish?.({ kilometraje, ...answers, vehiculoId: selectedVehicleId });
                                downloadChecklistPDF({ kilometraje, ...answers, vehiculoId: selectedVehicleId });
                                setStep(0);
                                setAnswers({});
                            }}>
                                {loading ? <div className="relative"><Loader texto="FINALIZANDO"/></div> : "FINALIZAR CHECKLIST"}
                            </button>
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