"use client"

import { RiHomeOfficeFill } from "react-icons/ri";
import { MdOutlinePropaneTank } from "react-icons/md";
import BarChart from "../charts/BarChart";
import Gaugue from "../charts/Gaugue";
import MultiLineChart from "../charts/MultiLineChart";
import { TbMoneybag, TbShoppingBagPlus } from "react-icons/tb";
import { CiBellOn } from "react-icons/ci";
import { FaWhatsappSquare } from "react-icons/fa";
import { useCallback, useEffect, useRef, useState } from "react";
import { IoSettingsSharp } from "react-icons/io5"
import NotificationsPanel from "../NotificationsPanel";
import MessagesPanel from "../MessagesPanel";
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";
import Link from "next/link";
import Loader from "../Loader";
import MapaCilindros from "../maps/MapaCilindros";

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

export default function BranchBussinessView({ googleMapsApiKey }) {
    const [loadingAdmingPanel, setLoadingAdminPanel] = useState(true);
    const [branches, setBranches] = useState(null);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [messagerVisible, setMessagerVisible] = useState(false);
    const [branchSelected, setBranchSelected] = useState(null);
    const [graficoGases] = useState(null);
    const initData = useRef(false);
    const [loadingMultilinea, setLoadingMultilinear] = useState(false);
    const mapRef = useRef(null);
    const [mapData, setMapData] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(null);
    const [propios, setPropios] = useState(true);
    const [llenos, setLlenos] = useState(true);
    const [categorias, setCategorias] = useState(null);    

    const fetchMainPanelData = useCallback(async () => {
        setLoadingAdminPanel(true);
        try {
            const response = await fetch("/api/bi");
            const data = await response.json();
            console.log("DATA", data.branches);
            setBranches(data.branches);
            setLoadingAdminPanel(false);
        } catch (error) {
            console.error("Error fetching main panel data:", error);
        }
    }, [setBranches, setLoadingAdminPanel]);

    const fetchCategorias = useCallback(async () => {
        try {
            const response = await fetch("/api/categoriasGases");
            const data = await response.json();
            console.log("CATEGORIAS", data.categorias);
            setCategorias(data.categorias);
            // Inicializa selectedCategories con todas las categorías en true
            const initialSelected = {};
            (data.categorias || []).forEach(cat => {
                initialSelected[cat] = true;
            });
            setSelectedCategories(initialSelected);
        } catch (error) {
            console.error("Error fetching categorias:", error);
        }
    }, [setCategorias, setSelectedCategories]);

    const fetchMapData = useCallback(async () => {
        try {
            let qry = "?";
            if (categorias) {
                qry += `categorias=${categorias.map(c => c._id).join(",")}&`;
            }
            if (propios) {
                qry += `propios=${propios}&`;
            }
            if (llenos !== null) {
                qry += `llenos=${llenos}`;
            }
            console.log("QUERY", qry);
            const response = await fetch(`/api/bi/cilindros${qry}`);
            const mapData = await response.json();
            console.log("MAP DATA", mapData);
            setMapData(mapData.cilindros);
        } catch (error) {
            console.error("Error fetching map data:", error);
        }
    }, [setMapData, categorias, propios, llenos]);

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            fetchMainPanelData();
            fetchCategorias();
        }
    }, [fetchMainPanelData, fetchCategorias]);

    const handleDebtClick = () => {
        window.location.href = "/modulos/deudas?total=true";
    };

    const handleBranchClick = async (index) => {
        await fetchMapData();
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
                                    <div className="text-xs">DESPACHADOS<br />AL 31/ENE&apos;25</div>
                                </div>
                                <div className="text-blue-600">
                                    <div className="text-xl mt-1">
                                        <span className="orbitron">{branches[index].despachadosMesAnterior}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/DIC&apos;24</div>
                                </div>
                                <div className="ml-4 text-blue-600">
                                    <div className="text-xl mt-1">
                                        <span className="orbitron">{branches[index].despachadosMismoMesAnterior}</span>
                                        <span className="text-xs mt-3 ml-2">m<sup>3</sup></span>
                                    </div>
                                    <div className="text-xs">AL 31/ENE&apos;24</div>
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
                                    key={`chip_${category}_${i}`}
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

                {branchSelected !== null && (
                    <div className="absolute top-24 left-72 bg-white rounded-md p-4 border border-gray-300">
                        <span className="position relative -top-7 text-xs font-bold mb-2 bg-white px-2 text-gray-400">ACCIONES RÁPIDAS</span>
                        <Link href={`/modulos/pedidos/nuevo`} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                            <TbShoppingBagPlus size="1.5rem" className="mr-2" />
                            NUEVA VENTA
                        </Link>
                    </div>
                )}

                <div className={`absolute top-10 right-6 w-1/2 h-[calc(100vh-14rem)] bg-white rounded-md border border-gray-300 ${branchSelected != null ? '' : 'hidden'}`} ref={mapRef}>
                    <MapaCilindros googleMapsApiKey={googleMapsApiKey} data={mapData} />

                    <div className="relativebg-white rounded-md px-2 pt-2 pb-0 border border-gray-300 mt-4">
                        <span className="position absolute text-xs font-bold mb-2 -mt-4 bg-white px-2 text-gray-400">TIPOS DE GASES</span>
                        {categorias && categorias.map((categoria, i) =>
                            <button
                                key={`chip_${categoria}_${i}`}
                                className="bg-blue-500 hover:bg-gray-300 text-white font-bold py-0 mr-1 px-4 rounded-md mb-2"
                            >
                                {categoria.elemento}
                            </button>
                        )}
                    </div>
                    <div className="relativebg-white rounded-md px-2 pt-4 pb-2 border border-gray-300 mt-4">
                        <span className="position absolute text-xs font-bold mb-2 -mt-6 bg-white px-2 text-gray-400">DUEÑO / ESTADO</span>                        
                        <div className="flex">
                            <div className="flex items-center space-x-2 ml-6 mr-10">
                                <span className="text-lg font-semibold">Clientes</span>
                                <label className="relative inline-flex items-center cursor-pointer w-12">
                                    <input
                                        type="checkbox"
                                        checked={propios}
                                        onChange={() => {
                                            const newPropios = !propios;
                                            setPropios(newPropios);
                                            fetchMapData({
                                                subcategoriaIds: Object.keys(selectedCategories).filter(k => selectedCategories[k]),
                                                llenos,
                                                propios: newPropios
                                            });
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div
                                        className={`
                                        w-12 h-6 rounded-full transition-colors
                                        ${propios ? 'bg-blue-600' : 'bg-gray-200'}
                                    `}
                                    ></div>
                                    <span
                                        className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                                        ${propios ? 'translate-x-6 left-1' : 'translate-x-0 left-1'}
                                    `}
                                        style={{
                                            transition: 'transform 0.2s',
                                        }}
                                    ></span>
                                </label>
                                <span className="text-lg font-semibold">BIOX</span>
                            </div>
                            <div className="flex items-center space-x-2 ml-6">
                                <span className="text-lg font-semibold">Vacío</span>
                                <label className="relative inline-flex items-center cursor-pointer w-12">
                                    <input
                                        type="checkbox"
                                        checked={llenos}
                                        onChange={() => {
                                            const newLlenos = !llenos;
                                            setLlenos(newLlenos);
                                            fetchMapData({
                                                subcategoriaIds: Object.keys(selectedCategories).filter(k => selectedCategories[k]),
                                                propios: propios,
                                                llenos: newLlenos
                                            });
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div
                                        className={`
                                        w-12 h-6 rounded-full transition-colors 
                                        ${llenos ? 'bg-blue-600' : 'bg-gray-200'}
                                    `}
                                    ></div>
                                    <span
                                        className={`
                                        absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                                        ${llenos ? 'translate-x-6 left-1' : 'translate-x-0 left-1'}
                                    `}
                                        style={{
                                            transition: 'transform 0.2s',
                                        }}
                                    ></span>
                                </label>
                                <span className="text-lg font-semibold">Lleno</span>
                            </div>
                        </div>
                    </div>
                </div>

                {branchSelected !== null && graficoGases != null && (loadingMultilinea ? <Loader /> :
                    <div className="absolute top-24 left-72 w-[600px] h-[320px]">
                        <MultiLineChart
                            data={graficoGases}
                            width={600}
                            height={320}
                            colorIndexes={[1, 2, 3, 4, 5, 6, 7, 8]}
                        />
                    </div>
                )}

                {loadingAdmingPanel && (
                    <div className="absolute top-0 left-0 w-full h-full bg-white flex items-center justify-center">
                        <Loader texto="Cargando..." />
                    </div>
                )}
            </div>
            <NotificationsPanel visible={notificationVisible} onClick={() => setNotificationVisible(!notificationVisible)} />
            <MessagesPanel visible={messagerVisible} onClick={() => setMessagerVisible(!messagerVisible)} />
        </main>
    );
}







