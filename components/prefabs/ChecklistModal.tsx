"use client";

import { useState, useMemo } from "react";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM, USER_ROLE } from "@/app/utils/constants";
import { AiOutlineClose } from "react-icons/ai";
import Loader from "../Loader";
import { IoIosArrowBack } from "react-icons/io";
import type { IChecklistModalProps, IChecklistAnswer, IChecklistlistResult } from "./types";
import { useSession } from "next-auth/react";

const itemEmployeeLabels: { [key: string]: string } = {
    zapatos_seguridad: "¿Zapatos de seguridad presentes?",
    polera_geologo: "¿Polera de geólogo presente?",
    guantes_segurdad: "¿Guantes de seguridad presentes?",
    bloqueador_solar: "¿Bloqueador solar presente?",
    intercomunicador: "¿Intercomunicador presente?",
    pantalon: "¿Pantalón corporativo presente?",
    casco: "¿Casco con cubrenuca presente?",
    lentes: "¿Lentes de seguridad presentes?",
    impresora: "¿Impresora portátil presente?",
};

const itemDriverLabels: { [key: string]: string } = {
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

function getChecklistItems(tipo: 'personal' | 'vehiculo'): IChecklistAnswer[] {
    // Filtra solo los items de conductor (id < 128)
    return Object.entries(TIPO_CHECKLIST_ITEM)
        .filter(([, v]) => tipo === 'vehiculo' ? v < 128 : v >= 128)
        .sort((a, b) => a[1] - b[1])
        .map(([key]): IChecklistAnswer => ({
            tipo: key as keyof typeof TIPO_CHECKLIST_ITEM,
            valor: TIPO_CHECKLIST_ITEM[key as keyof typeof TIPO_CHECKLIST_ITEM]
        }));
}

export default function ChecklistModal({ onFinish, tipo, vehiculos }: IChecklistModalProps) {
    const checklistItems = useMemo(() => getChecklistItems(tipo), [tipo]);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<IChecklistAnswer[]>([]);
    const [kilometros, setKilometros] = useState(0);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    
    const { data: session } = useSession();

    const totalSteps = checklistItems.length + 1;

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleAnswer = (answer: IChecklistAnswer) => {
        console.log("RESPUESTA", answer);
        setAnswers(prev => [...prev, answer]);
        handleNext();
    };

    const handleKilometros = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKilometros(Number(e.target.value));
    };

    const handleKilometrosNext = () => {
        if ((tipo === 'vehiculo' && kilometros) || tipo === 'personal') 
            handleNext();
    };

    // Animación simple de carrousel
    const getSlideStyle = (i: number): React.CSSProperties => ({
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
    const downloadChecklistPDF = async (kilometraje: number, result: IChecklistlistResult, answers: IChecklistAnswer[], vehiculoId: string) => {
        result.tipo = tipo === 'vehiculo' ? TIPO_CHECKLIST.vehiculo : TIPO_CHECKLIST.personal;        
        try {
            const res = await fetch("/api/reportes/checklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kilometraje, result, answers, vehiculoId }),
            });
            if (!res.ok) {
                alert("No se pudo generar el PDF del checklist.");
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            a.download = `checklist_${tipo}_${dd}${mm}${yy}.pdf`;
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
            {!loading && <div className="relative w-full max-w-xl mx-auto h-[380px] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col justify-center">
                {/* Botón de cerrar */}
                {tipo === 'vehiculo' && <button
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl z-10"
                    onClick={() => window.history.back()}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                    <AiOutlineClose />
                </button>}
                {/* Slides */}
                <div className="relative w-full h-full">
                    {/* Paso 0: Título */}
                    <div style={getSlideStyle(0)} className="flex flex-col items-center justify-center h-full px-8">
                        <h1 className="text-3xl mb-4">Checklist {tipo}</h1>
                        {tipo === 'vehiculo' && <>
                            <h2 className="text-md mb-4 -mt-4">Vehiculo y kilometros</h2>
                            {vehiculos && vehiculos.length > 1 && <div className="text-left">
                                <span>Patente</span>
                                <select
                                    className="border rounded px-4 py-2 text-lg w-64 mb-4"
                                    value={selectedVehicleId}
                                    onChange={(e) => {
                                        setSelectedVehicleId(e.currentTarget.value);
                                    }}
                                >
                                    <option>Selecciona un vehículo</option>
                                    {vehiculos?.map((vehiculo) => (
                                        <option key={vehiculo._id} value={vehiculo._id}>
                                            {vehiculo.patente} - {vehiculo.marca}
                                        </option>
                                    ))}
                                </select>
                            </div>}
                            <div className="text-left">
                                <span>Kilometros</span>
                                <input
                                    type="number"
                                    className="border rounded px-4 py-2 text-lg w-64 mb-4"
                                    value={kilometros}
                                    onChange={handleKilometros}
                                    placeholder="Ej: 123456"
                                    min={0}
                                />
                            </div>
                        </>}
                        <button
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                            onClick={handleKilometrosNext}
                            disabled={tipo === 'vehiculo' && !kilometros}
                        >
                            {step == 0 ? 'Iniciar' : 'Siguiente'}
                        </button>
                    </div>
                    {/* Items del checklist */}
                    {checklistItems.map((key, idx) => {
                        const label = (session?.user.role == USER_ROLE.conductor ? itemDriverLabels : itemEmployeeLabels)[key.tipo as keyof typeof itemDriverLabels]
                            || `¿${String(key.tipo).replace(/_/g, " ")}?`;
                        const value = answers.find(a => a.tipo === key.tipo)?.valor || 0;
                        // Selector especial
                        if (specialSelectorItems.includes(key.tipo as string)) {
                            return (
                                <div key={String(key.tipo)} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                    <h2 className="text-xl font-bold mb-6">{label}</h2>
                                    <div className="flex space-x-3 mb-6">
                                        {selectorOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`px-4 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer({ tipo: key.tipo, valor: opt.value })}
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
                        if (limpiezaItems.includes(key.tipo as string)) {
                            return (
                                <div key={String(key.tipo)} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                    <h2 className="text-xl font-bold mb-6">{label}</h2>
                                    <div className="flex space-x-3 mb-6">
                                        {limpiezaOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`px-6 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer({ tipo: key.tipo, valor: opt.value })}
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
                            <div key={String(key.tipo)} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                <h2 className="text-xl font-bold mb-6">{label}</h2>
                                <div className="flex space-x-6 mb-6">
                                    <button
                                        className={`px-8 py-2 rounded border font-bold ${value !== 1 ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer({ tipo: key.tipo, valor: 1 })}
                                    >
                                        Sí
                                    </button>
                                    <button
                                        className={`px-8 py-2 rounded border font-bold ${value !== 0 ? "bg-red-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer({ tipo: key.tipo, valor: 0 })}
                                    >
                                        No
                                    </button>
                                </div>
                                <button className="flex text-gray-500 underline" onClick={handlePrev} 
                                    disabled={step === (tipo === 'vehiculo' ? 0 : 1)}>
                                    <IoIosArrowBack className="mt-0.5 -ml-6" size="1.25rem" />ATRÁS
                                </button>
                            </div>
                        );
                    })}
                    {/* Finalizar */}
                    <div style={getSlideStyle(totalSteps)} className="flex flex-col items-center justify-center h-full px-8">
                        <h2 className="text-2xl font-bold mb-8">Checklist completado</h2>
                        {(() => {
                            // Determina si el checklist está aprobado o rechazado
                            function resultadoChecklist(checklistItems: IChecklistAnswer[], answers: IChecklistAnswer[]): boolean {
                                return checklistItems.every((item) => {
                                    const key = item.tipo;
                                    const value = item.valor;
                                    // If value is odd, check if answer is truthy (approved)
                                    if (value % 2 === 1) {
                                        const answer = answers.find(a => a.tipo === key);
                                        return !!answer && !!answer.valor;
                                    }
                                    return true;
                                });
                            }
                            const aprobado = resultadoChecklist(checklistItems, answers);
                            return aprobado ? (
                                <div className="inline-block border-4 border-green-600 text-green-600 font-bold text-xl px-8 py-2 rounded-xl bg-green-50 shadow-md uppercase tracking-wider mb-6" style={{ transform: "rotate(-8deg)" }}>
                                    <span className="mr-2 text-2xl align-middle">✅</span> APROBADO
                                </div>
                            ) : (
                                <div className="inline-block border-4 border-red-600 text-red-600 font-bold text-xl px-8 py-2 rounded-xl bg-red-50 shadow-md uppercase tracking-wider mb-6" style={{ transform: "rotate(-8deg)" }}>
                                    <span className="mr-2 text-2xl align-middle">❌</span> RECHAZADO
                                </div>
                            );
                        })()}
                        <button
                            className={`w-full bg-green-500 text-white px-8 h-12 rounded-md font-bold text-lg mt-4 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={loading}
                            onClick={() => {
                                setLoading(true);
                                function resultadoChecklist(
                                    checklistItems: { tipo: string; valor: number }[],
                                    answers: IChecklistAnswer[]
                                ): boolean {
                                    return checklistItems.every(({ tipo, valor }: { tipo: string; valor: number }) => {
                                        if (valor % 2 === 1) {
                                            const respuesta = answers.find(a => a.tipo === tipo)?.valor;
                                            return respuesta !== 0;
                                        }
                                        return true;
                                    });
                                }
                                onFinish(kilometros, answers);                                
                                downloadChecklistPDF(
                                    kilometros,
                                    {
                                        tipo: tipo === 'vehiculo' ? TIPO_CHECKLIST.vehiculo : TIPO_CHECKLIST.personal,
                                        aprobado: resultadoChecklist(
                                            checklistItems.map(item => ({
                                                tipo: String(item.tipo),
                                                valor: item.valor
                                            })),
                                            answers
                                        )
                                    },
                                    answers, // answers array
                                    selectedVehicleId // vehiculoId string
                                );
                                setStep(0);
                                setAnswers([]);
                            }}>
                            {loading ? <div className="relative"><Loader texto="FINALIZANDO" /></div> : "FINALIZAR CHECKLIST"}
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
            </div>}
            {loading && <h1 className="text-white text-xl"><Loader texto="Informando..." /></h1>}
        </div>
    );
}