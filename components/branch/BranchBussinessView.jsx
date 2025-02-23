"use client"

import { RiHomeOfficeFill } from "react-icons/ri";
import dayjs from "dayjs";
import { MdOutlinePropaneTank } from "react-icons/md";
import BarChart from "../charts/BarChart";
import Gaugue from "../charts/Gaugue";
import MultiLineChart from "../charts/MultiLineChart";
import { TbMoneybag } from "react-icons/tb";
import { CiBellOn } from "react-icons/ci";
import { FaWhatsappSquare } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { IoSettingsSharp } from "react-icons/io5"
import NotificationsPanel from "../NotificationsPanel";
import MessagesPanel from "../MessagesPanel";
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";

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

export default function BranchBussinessView() {
    const [loadingAdminPanel, setLoadingAdminPanel] = useState(true);
    const [branches, setBranches] = useState(null);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [messagerVisible, setMessagerVisible] = useState(false);
    const [branchSelected, setBranchSelected] = useState(null);
    const [graficoGases, setGraficoGases] = useState(null);
    const initData = useRef(false);
    const [loadingMultilinear, setLoadingMultilinear] = useState(false);

    const fetchMainPanelData = async () => {
        setLoadingAdminPanel(true);
        try {
            const response = await fetch("/api/mainPanel");
            const data = await response.json();
            setBranches(data);
            setLoadingAdminPanel(false);
        } catch (error) {
            console.error("Error fetching main panel data:", error);
        }
    };

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            fetchMainPanelData();
        }
    }, []);

    const handleDebtClick = () => {
        window.location.href = "/modulos/deudas?total=true";
    };

    const fetchAdminPanelData = async () => {
        const response = await fetch("/api/adminPanel");
        const data = await response.json();

        setGraficoGases(data);
        setLoadingMultilinear(false);
    };

    const handleBranchClick = (index) => {
        setBranchSelected(branchSelected != null && branchSelected === index ? null : index);
        setLoadingMultilinear(true);

    };



    const getBoxStyles = (index) => {
        if (branchSelected === index) {
            return {
                width: '100%',
                height: '100%',
                transform: 'translate(0, 0)',
            };
        } else if (branchSelected !== null) {
            const translateMap = [
                'translate(-100%, -100%)',
                'translate(100%, -100%)',
                'translate(-100%, 100%)',
                'translate(100%, 200%)',
            ];
            return {
                width: '50%',
                height: '50vh',
                transform: translateMap[index],
            };
        } else {
            const translateMap = [
                'translate(0, 0)',
                'translate(100%, 0)',
                'translate(0, 100%)',
                'translate(100%, 100%)',
            ];
            return {
                width: '50%',
                height: '50vh',
                transform: translateMap[index],
            };
        }
    };

    return (
        <main className="mt-4 h-screen overflow-y-auto">
            <div className={`absolute w-full h-full`}>
                {branches && branches.map((branch, index) => (
                    <div
                        key={index}
                        className={`absolute w-full h-screen transition-all duration-500`}
                        style={getBoxStyles(index)}
                    >
                        <div className="relative w-full h-full bg-white rounded-lg p-4">
                            <RiHomeOfficeFill className="relative ml-4 -top-0.5" size="14.1rem" />
                            <div className="absolute w-40 h-40 top-24 left-28">
                                {false && <MultiLineChart
                                    data={data}
                                    width={120}
                                    height={100}
                                    simple={true}
                                    colorIndexes={[7, 2]}
                                />}
                            </div>
                            <div className="absolute top-12 left-20 w-8 h-40 flex flex-col justify-end">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div
                                        key={`segmento_${index}_${i}`}
                                        className={`w-full h-3 mb-1 ${i < (7 - branch.estado) ? 'bg-white' : stateColors[branch.estado + 1]} ${i === 6 ? 'rounded-bl-md' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className="absolute bottom-8 text-center left-12 text-4xl font-bold orbitron">
                                {branches[index].rentabilidad}%
                                <div className="text-xs">RENTABILIDAD</div>
                            </div>
                            {branches[index].tipo == TIPO_DEPENDENCIA.sucursal && <div className="absolute flex top-16 left-72 font-bold">
                                <div className="text-green-600 mr-6">
                                    <div className="flex orbitron">
                                        <span className="text-2xl">{branches[index].despachadosHoy}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">DESPACHADOS<br/>AL 31/ENE'25</div>
                                </div>
                                <div className="text-blue-600">
                                    <div className="text-xl mt-1">
                                        <span className="orbitron">{branches[index].despachadosMesAnterior}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/DIC'24</div>
                                </div>
                                <div className="ml-4 text-blue-600">
                                    <div className="text-xl mt-1">
                                        <span className="orbitron">{branches[index].despachadosMismoMesAnterior}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/ENE'24</div>
                                </div>
                            </div>}
                            {branches[index].deudaTotal > 0 && <div className="absolute bottom-4 left-48 font-bold text-red-600 hover:bg-red-200 hover:shadow-lg cursor-pointer p-4 rounded-md" onClick={handleDebtClick}>
                                <div className="flex orbitron">
                                    <span className="text-xs mt-2 mr-1">CLP $</span>
                                    <span className="text-xl">{(branches[index].deudaTotal / 1000000).toFixed(1)}</span>
                                    <span className="text-xs ml-1 mt-2">M</span>
                                </div>
                                <div className="text-xs">DEUDA TOTAL</div>
                            </div>}
                            <div className="absolute top-4 left-56 flex items-center">
                                <div className="flex hover:bg-slate-600 hover:text-white rounded-lg px-2 cursor-pointer" onClick={() => handleBranchClick(index)}>
                                    <IoSettingsSharp size="1.5rem" className="text-white mt-1 mr-2" />
                                    <span className="text-2xl font-bold uppercase">{branch.nombre}</span>
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
                            {branch.tipo == TIPO_DEPENDENCIA.sucursal && <div className={`absolute bottom-0 right-16 ${branchSelected !== null ? 'w-[640px] h-[520px]' : ''}`}>
                                <BarChart
                                    data={branch.topDeudores}
                                    width={branchSelected !== null ? 640 : 320}
                                    height={branchSelected !== null ? 520 : 260}
                                    indexColor={7}
                                />
                            </div>}
                            {branches[index].branchType == "SUCURSAL" && (
                                <div className="absolute flex bottom-4 right-4 bg-green-50 shadow-md rounded-md p-4">
                                    <div className="flex text-green-700">
                                        <TbMoneybag size="2.1em" className="mr-2 mt-2" />
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
                                        <MdOutlinePropaneTank size="2.1em" className="mr-2 mt-2" />
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

                {branchSelected !== null && (
                    <div className="absolute bottom-24 left-4">
                        <div className="w-full">
                            {["VENDIDO", "PRODUCIDO", "ARRIENDO", "O2", "At", "Ar", "Al", "Ac"].map((category, i) => (
                                <button
                                    key={`chip_${category}`}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-0 mr-1 px-4 rounded-md"
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                        <div className="flex">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Gaugue
                                    key={`gaugue_${i}`}
                                    value={[0, 25, 50, 75, 100][Math.random() * 5 | 0]}
                                    width={220}
                                    height={180}
                                    unit={`m³/${["hora", "día", "semana", "mes"][i]}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {branchSelected !== null && graficoGases != null && (
                    <div className="absolute top-24 left-72 w-[600px] h-[320px]">
                        <MultiLineChart
                            data={graficoGases}
                            width={600}
                            height={320}
                            colorIndexes={[1, 2, 3, 4, 5, 6, 7, 8]}
                        />
                    </div>
                )}
            </div>
            <NotificationsPanel visible={notificationVisible} onClick={() => setNotificationVisible(!notificationVisible)} />
            <MessagesPanel visible={messagerVisible} onClick={() => setMessagerVisible(!messagerVisible)} />
        </main>
    );
}







