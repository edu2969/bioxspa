"use client"

import { RiHomeOfficeFill } from "react-icons/ri";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import dayjs from "dayjs";
import { CiBellOn } from "react-icons/ci";
import { FaWhatsappSquare } from "react-icons/fa";

const data = [
    {
        category: "Deuda",
        points: Array.from({ length: 12 }, (_, i) => ({
            date: dayjs().subtract(i, 'month').startOf("month").toDate(),
            value: Math.floor(Math.random() * 1000000),
        })).reverse(),
    },
    {
        category: "Pagos",
        points: Array.from({ length: 12 }, (_, i) => ({
            date: dayjs().subtract(i, 'month').startOf("month").toDate(),
            value: Math.floor(Math.random() * 1000000),
        })).reverse(),
    }
];

const tempeture = Array.from({ length: 7 }, () => Math.floor(Math.random() * 9));

const stateColors = [
    "bg-white",
    "bg-red-500",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-green-500",
    "bg-green-600",
];

const sucursales = ["TALCAHUANO", "CHILLÁN", "LOS ÁNGELES"];

const branches = sucursales.map((sucursal, index) => ({
    nombre: sucursal,
    tempeture: Math.floor(Math.random() * 9),
    rentability: (Math.random() * 35 - 10).toFixed(1),
    data: [
        {
            category: "Deuda",
            points: Array.from({ length: 12 }, (_, i) => ({
                date: dayjs().subtract(i, 'month').startOf("month").toDate(),
                value: Math.floor(Math.random() * 1000000),
            })).reverse(),
        },
        {
            category: "Pagos",
            points: Array.from({ length: 12 }, (_, i) => ({
                date: dayjs().subtract(i, 'month').startOf("month").toDate(),
                value: Math.floor(Math.random() * 1000000),
            })).reverse(),
        }
    ],
    empresas: [
        { rut: "76256452-1", nombre: "DISTRIBUIDORA DE GASES Y MATERIALES DE SOLDADURA SOCIEDAD DE RESPONSAB", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
        { rut: "77271464-5", nombre: "DISTRIBUIDORA Y TRANSPORTES BIOX SPA", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
        { rut: "77908357-8", nombre: "GASES BIOBIO SPA", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
        { rut: "77367653-4", nombre: "INMOBILIARIA CJC SPA", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
        { rut: "76983366-8", nombre: "SOCIEDAD DISTRIBUIDORA Y DE TRANSPORTE BIOX SPA", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
        { rut: "78073033-1", nombre: "TRANSPORTES CJC SPA", rentabilidad: (Math.random() * 35 - 10).toFixed(2) + '%', deuda: (Math.random() * 50000000), utilidades: (Math.random() * 20000000), iva: (Math.random() * 10000000) },
    ]
}));

export default function BranchBussinessView() {
    const houses = Array(3).fill(null);
    return (
        <main className="mt-10 h-screen overflow-y-auto">
            <div className="grid grid-cols-3 h-full">
                {branches.map((_, index) => (
                    <div key={index} className="flex justify-start h-full">
                        <div className="absolute w-1/3 h-1/2">
                            <RiHomeOfficeFill className="ml-8" size="14.1rem" />
                            <div className="absolute w-40 h-40 top-20 left-28">
                                <MultiLineChart
                                    data={data}
                                    width={120}
                                    height={100}
                                    simple={true}
                                    colorIndexes={[7, 2]}
                                />
                            </div>
                            <div className="absolute top-8 left-20 w-8 h-40 flex flex-col justify-end">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div
                                        key={`segmento_${index}_${i}`}
                                        className={`w-full h-3 mb-1 ${i < (7 - tempeture[index]) ? 'bg-white' : stateColors[tempeture[index]]} ${i === 6 ? 'rounded-bl-md' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className="absolute top-12 left-72 text-4xl font-bold orbitron">
                                {branches[index].rentability}%
                                <div className="text-xs">RENTABILIDAD</div>
                            </div>
                            <div className="absolute top-4 left-48 text-2xl font-bold">
                                {sucursales[index]}
                            </div>
                            <div className="absolute top-48 left-8 overflow-y-auto h-[500px]">
                                {branches[index].empresas.map((empresa, i) => (
                                    <div key={i} className="bg-blue-100 shadow-md rounded-lg mt-4 px-2 mb-2 pb-0 w-full">
                                        <div className="flex">
                                            <div className="w-9/12">
                                                <div className="bg-slate-700 text-white text-sm font-bold px-4 rounded-md rounded-bl-none rounded-tr-none -ml-2 hover:bg-slate-500 cursor-pointer"
                                                onClick={() => {
                                                    router.push(`/sucursales?empresa=${empresa.nombre}`);
                                                }}>{empresa.nombre}</div>                                                
                                                <div className="flex items-center">
                                                    <span className="text-sm mr-2">{empresa.rut}</span>
                                                </div>
                                            </div>
                                            <div className="w-3/12 flex justify-end items-start relative mt-2">
                                                <div className="relative">
                                                    <CiBellOn size="2rem" />
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                                        4
                                                    </div>
                                                </div>
                                                <div className="relative ml-2">
                                                    <FaWhatsappSquare className="text-green-600" size="2rem" />
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                                        9
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full flex">
                                            <div className="w-4/12 flex flex-col items-center justify-center">
                                                <div className="text-4xl orbitron">{parseFloat(empresa.rentabilidad).toFixed(1)}%</div>
                                                <div className="text-xs">RENTABILIDAD</div>
                                            </div>
                                            <div className="w-7/2 flex flex-col text-sm">
                                                <div className="text-red-500 uppercase">Deuda: ${(empresa.deuda / 1000000).toFixed(2)}M CLP</div>
                                                <div className="text-green-600 uppercase">Utilidad: ${(empresa.utilidades / 1000000).toFixed(2)}M CLP</div>
                                                <div className="text-blue-500 uppercase">IVA: ${(empresa.iva / 1000000).toFixed(2)}M CLP</div>
                                            </div>
                                            <div className="w-3/12">                                            
                                                <MultiLineChart
                                                    data={branches[index].data}
                                                    width={240}
                                                    height={120}
                                                    simple={true}
                                                    colorIndexes={[7, 2]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}