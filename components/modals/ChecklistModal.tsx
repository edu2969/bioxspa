"use client";

import { useState, useMemo, useEffect } from "react";
import { TIPO_CHECKLIST_ITEM, USER_ROLE } from "@/app/utils/constants";
import { AiOutlineClose } from "react-icons/ai";
import Loader from "../Loader";
import { IoIosArrowBack } from "react-icons/io";
import type { IChecklistAnswer } from "../prefabs/types";
import { useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IVehiculo } from "@/types/vehiculo";

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

interface IChecklistForm {
    vehiculoId?: string;
    kilometros?: number;
    [key: string]: number | string | undefined; // Para permitir claves dinámicas de items del checklist
}

export default function ChecklistModal({ tipo, onFinish }: { 
    tipo: 'personal' | 'vehiculo',
    onFinish: () => void
}) {
    const checklistItems = useMemo(() => getChecklistItems(tipo), [tipo]);
    const [step, setStep] = useState(0);
    const { register, getValues, setValue, watch, handleSubmit, control } = useForm<IChecklistForm>({
        defaultValues: {
            vehiculoId: undefined,
            kilometros: undefined,
            // Inicializar todos los items del checklist en 0
            ...checklistItems.reduce((acc, item) => {
                acc[item.tipo as string] = 0;
                return acc;
            }, {} as Record<string, number>)
        }
    });    
    const { data: session } = useSession();
    const kilometros = useWatch({
        control,
        name: "kilometros"
    });
    const totalSteps = checklistItems.length + 1;

    useEffect(() => {
        console.log("Kilometros changed:", kilometros);
    }, [kilometros]);
    
    const { data: vehiculos, isLoading } = useQuery<IVehiculo[]>({
        queryKey: ["vehiculos-conductor"],
        queryFn: async () => {
            const r = await fetch("/api/flota/porConductor");
            const data = await r.json();
            return data.vehiculos;
        },        
        enabled: tipo === 'vehiculo',
    });

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            const formValues = getValues();
            const items: IChecklistAnswer[] = checklistItems.map((item) => ({
                tipo: item.tipo,
                valor: Number(formValues[String(item.tipo)]) || 0,
            }));
            const data: any = {
                tipo,
                items,
            };
            if (tipo === 'vehiculo') {
                data.vehiculoId = vehiculos?.length === 1 ? vehiculos[0]._id : formValues.vehiculoId;
                data.kilometraje = formValues.kilometros;
            }
            console.log("DATA", data);
            await fetch("/api/users/checklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        },
        onSuccess: async () => {            
            if(tipo === 'vehiculo') {
                console.log("Invalidando query de conductores...");
                queryClient.invalidateQueries({ queryKey: ["conductores"] });
            }
        }
    });

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 0) setStep(step - 1);
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

    const onSubmit = async () => {
        await mutation.mutateAsync();
        onFinish();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-2" style={{ zIndex: 102 }}>
            {(!isLoading && !mutation.isPending) && <div className="relative w-full max-w-xl mx-auto h-[380px] overflow-hidden bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col justify-center">
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
                                    {...register("vehiculoId")}
                                    className="border rounded px-4 py-2 text-lg w-64 mb-4"                                    
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
                                    {...register("kilometros", { valueAsNumber: true })}
                                    type="number"
                                    className="border rounded px-4 py-2 text-lg w-64 mb-4"
                                    placeholder="Ej: 123456"
                                    min={0}
                                />
                            </div>
                        </>}
                        <button
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50"
                            onClick={handleNext}
                            type="button"
                            disabled={tipo === 'vehiculo' && Number(kilometros) == 0}
                        >
                            {step == 0 ? 'Iniciar' : 'Siguiente'}
                        </button>
                    </div>
                    {/* Items del checklist */}
                    {checklistItems.map((key, idx) => {
                        const label = (session?.user.role == USER_ROLE.conductor ? itemDriverLabels : itemEmployeeLabels)[key.tipo as keyof typeof itemDriverLabels]
                            || `¿${String(key.tipo).replace(/_/g, " ")}?`;
                        const value = watch(key.tipo as string) || 0;
                        
                        const handleAnswer = (valor: number) => {
                            setValue(key.tipo as string, valor);
                            handleNext();
                        };
                        
                        // Selector especial
                        if (specialSelectorItems.includes(key.tipo as string)) {
                            return (
                                <div key={String(key.tipo)} style={getSlideStyle(idx + 1)} className="flex flex-col items-center justify-center h-full px-8">
                                    <h2 className="text-xl font-bold mb-6">{label}</h2>
                                    <div className="flex space-x-3 mb-6">
                                        {selectorOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`px-4 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer(opt.value)}
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
                                                type="button"
                                                className={`px-6 py-2 rounded border font-bold ${value === opt.value ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                                onClick={() => handleAnswer(opt.value)}
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
                                        className={`px-8 py-2 rounded border font-bold ${value === 1 ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer(1)}
                                        type="button"
                                    >
                                        Sí
                                    </button>
                                    <button
                                        className={`px-8 py-2 rounded border font-bold ${value === 0 ? "bg-red-600 text-white" : "bg-gray-100"}`}
                                        onClick={() => handleAnswer(0)}
                                        type="button"
                                    >
                                        No
                                    </button>
                                </div>
                                <button type="button" className="flex text-gray-500 underline" onClick={handlePrev} 
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
                            function resultadoChecklist(checklistItems: IChecklistAnswer[], formValues: Record<string, any>): boolean {
                                return checklistItems.every((item) => {
                                    const key = item.tipo as string;
                                    const value = item.valor;
                                    // If value is odd, check if answer is truthy (approved)
                                    if (value % 2 === 1) {
                                        const answer = formValues[key];
                                        return answer !== undefined && answer !== 0;
                                    }
                                    return true;
                                });
                            }
                            const formValues = getValues();
                            const aprobado = resultadoChecklist(checklistItems, formValues);
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
                            className={`w-full bg-green-500 text-white px-8 h-12 rounded-md font-bold text-lg mt-4 ${mutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                            type="button"
                            disabled={mutation.isPending}
                            onClick={handleSubmit(onSubmit)}>
                            {mutation.isPending ? <div className="relative"><Loader texto="FINALIZANDO" /></div> : "FINALIZAR CHECKLIST"}
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
            {mutation.isPending && <h1 className="text-white text-xl"><Loader texto="Informando..." /></h1>}
        </div>
    );
}


// Imprime el checklist usando una ventana nueva (desktop) o descarga PDF/HTML (mobile)
    // Genera y descarga el PDF del checklist usando la API del backend
    // Permite descargar el PDF del checklist después de finalizarlo
    /*const downloadChecklistPDF = async (kilometraje: number, result: IChecklistlistResult, answers: IChecklistAnswer[], vehiculoId: string) => {
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
    };*/