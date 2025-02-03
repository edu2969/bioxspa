"use client"

import { RiHomeOfficeFill } from "react-icons/ri";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import dayjs from "dayjs";
import { MdOutlinePropaneTank } from "react-icons/md";
import BarChart from "../charts/BarChart";
import { TbMoneybag } from "react-icons/tb";
import { CiBellOn } from "react-icons/ci";
import { FaWhatsappSquare } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { IoSettingsSharp } from "react-icons/io5"
import NotificationsPanel from "../NotificationsPanel";
import MessagesPanel from "../MessagesPanel";

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

const sucursales = ["BARROS ARANA", "JAIME REPULLO", "SAN JOSÉ", "LOS ÁNGELES"];

const branches_test = () => {
    return sucursales.map((sucursal, index) => ({
        tempeture: Math.floor(Math.random() * 7),
        rentability: (Math.random() * 35 - 10).toFixed(1),
        branchType: (index == 0 || index == 3) ? "SUCURSAL" : "OFICINA",
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
        clientDebts : [
            { empresa: "Comercial Salvo SPA", deuda: Math.floor(Math.random() * 1000000), rut: "76.123.456-7" },
            { empresa: "Maestranza SG Limitada", deuda: Math.floor(Math.random() * 1000000), rut: "77.234.567-8" },
            { empresa: "Empresa constructora Ecocec Limitada", deuda: Math.floor(Math.random() * 1000000), rut: "78.345.678-9" },
            { empresa: "Comercial e Industrial Central Radiadores Limitada", deuda: Math.floor(Math.random() * 1000000), rut: "79.456.789-0" },
            { empresa: "Sociedad Constructora Cordillera Norte Sur SPA", deuda: Math.floor(Math.random() * 1000000), rut: "80.567.890-1" },
        ],
        gasReports: Array.from({ length: 4 }, () => ({
            currentMonth: Math.floor(Math.random() * (560000 - 100000 + 1)) + 100000,
            previousMonth: Math.floor(Math.random() * (560000 - 100000 + 1)) + 100000,
            sameMonthLastYear: Math.floor(Math.random() * (560000 - 100000 + 1)) + 100000,
            currentMonthPackaged: Math.floor(Math.random() * (560000 - 100000 + 1)) + 100000,
        })),
        debts: Array.from({ length: 4 }, () => Math.floor(Math.random() * 1000000)),
    }));
}

export default function BranchBussinessView() {
    const [branches, setBranches] = useState(null);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [messagerVisible, setMessagerVisible] = useState(false);
    const initData = useRef(false);

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            const data = branches_test();
            setBranches(data);
          }
    }, []);

    const handleDebtClick = () => {
        window.location.href = "/modulos/deudas?total=true";
    };

    return (
        <main className="mt-4 h-screen overflow-y-auto">
            <div className="grid grid-cols-2 h-full gap-4 p-4">
                {branches && branches.map((_, index) => (
                    <div key={index} className="flex justify-start h-full">
                        <div className="relative w-full h-full bg-white rounded-lg shadow-lg p-4">
                            <RiHomeOfficeFill className="relative ml-4 -top-0.5" size="14.1rem" />
                            <div className="absolute w-40 h-40 top-24 left-28">
                                <MultiLineChart
                                    data={data}
                                    width={120}
                                    height={100}
                                    simple={true}
                                    colorIndexes={[7, 2]}
                                />
                            </div>
                            <div className="absolute top-12 left-20 w-8 h-40 flex flex-col justify-end">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div
                                        key={`segmento_${index}_${i}`}
                                        className={`w-full h-3 mb-1 ${i < (7 - tempeture[index]) ? 'bg-white' : stateColors[tempeture[index]]} ${i === 6 ? 'rounded-bl-md' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className="absolute bottom-12 left-12 text-4xl font-bold orbitron">
                                {branches[index].rentability}%
                                <div className="text-xs">RENTABILIDAD</div>
                            </div>
                            {branches[index].branchType == "SUCURSAL" && <div className="absolute flex top-16 right-24 font-bold">
                                <div className="text-green-600 mr-6">
                                    <div className="flex orbitron">
                                        <span className="text-2xl">{branches[index].gasReports[0].currentMonth}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">DESPACHADOS AL 31/ENE'25</div>
                                </div>
                                <div className="text-blue-600">
                                    <div className="text-xl mt-1">
                                        <span className="orbitron">{branches[index].gasReports[0].previousMonth}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/DIC'24</div>
                                    <div className="text-xl mt-1">                                        
                                        <span className="orbitron">{branches[index].gasReports[0].sameMonthLastYear}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/ENE'24</div>
                                </div>
                            </div>}
                            <div className="absolute bottom-6 left-48 font-bold text-red-600 hover:bg-red-200 hover:shadow-lg cursor-pointer p-4 rounded-md" onClick={handleDebtClick}>
                                <div className="flex orbitron">
                                    <span className="text-xs mt-2 mr-1">CLP $</span>
                                    <span className="text-xl">{(branches[index].debts[0] / 1000).toFixed(1)}</span>
                                    <span className="text-xs ml-1 mt-2">M</span>
                                </div>
                                <div className="text-xs">DEUDA TOTAL</div>
                            </div>
                            <div className="absolute top-4 left-56 flex items-center">
                                <div className="flex hover:bg-slate-600 hover:text-white rounded-lg px-2 cursor-pointer">
                                    <IoSettingsSharp size="1.5rem" className="text-white mt-1 mr-2"/>
                                    <span className="text-2xl font-bold">{sucursales[index]}</span>
                                </div>
                                <div className="flex ml-4">
                                    <div className="relative hover:scale-125 cursor-pointer" onClick={() => { setNotificationVisible(!notificationVisible); setMessagerVisible(false); }}>
                                        <CiBellOn size="2rem" />
                                        <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                            4
                                        </div>
                                    </div>
                                    <div className="relative ml-2 hover:scale-125 cursor-pointer" onClick={() => { setMessagerVisible(!messagerVisible); setNotificationVisible(false); }}>
                                        <FaWhatsappSquare className="text-green-600" size="2rem" />
                                        <div className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                            9
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {branches[index].branchType == "OFICINA" && <div className="absolute bottom-4 right-4">
                                <BarChart
                                    data={branches[index].clientDebts}
                                    width={320}
                                    height={260}
                                    indexColor={7}
                                />
                            </div>}
                            {branches[index].branchType == "SUCURSAL" && (
                                <div className="absolute flex bottom-4 right-4 bg-green-50 shadow-md rounded-md p-4">
                                    <div className="flex text-green-700">
                                        <TbMoneybag size="2.1em" className="mr-2 mt-2"/>
                                        <div>
                                            <p className="text-sm mt-1">VENDIDOS</p>
                                            <div className="flex flex-nowrap text-xl">
                                                <span><b>{branches[index].gasReports[0].currentMonth}</b>&nbsp;</span>
                                                <span>m<sup>3</sup></span>
                                            </div>
                                        </div>
                                    </div>                                    
                                    <p className="text-md ml-3 text-slate-700 text-center w-full mt-4 mx-4">
                                        <b>vs</b>
                                    </p>
                                    <div className="flex text-blue-700">
                                        <MdOutlinePropaneTank size="2.1em" className="mr-2 mt-2"/>
                                        <div>
                                            <p className="text-sm mt-1">ENVASADOS</p>
                                            <div className="flex flex-nowrap text-xl">
                                                <span><b>{branches[index].gasReports[0].currentMonthPackaged}</b>&nbsp;</span>
                                                <span>m<sup>3</sup></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <NotificationsPanel visible={notificationVisible} onClick={() => setNotificationVisible(!notificationVisible) }/>
            <MessagesPanel visible={messagerVisible} onClick={() => setMessagerVisible(!messagerVisible)} />
        </main>
    );
}







