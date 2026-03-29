"use client"

import Gaugue from "./charts/Gaugue";
import MultiLineChart from "./charts/MultiLineChart";
import { useCallback, useEffect, useRef, useState } from "react";
import NotificationsPanel from "./NotificationsPanel";
import MessagesPanel from "./MessagesPanel";
import Loader from "./Loader";
import HouseHealthIndicator from "@/components/_prefabs/gerencia/HouseHealthIndicator";
import MainActionsPanel from "@/components/_prefabs/gerencia/MainActionsPanel";
import MapCilinderMasterView from "@/components/_prefabs/gerencia/MapCilinderMasterView";
import RentabilityIndicator from "./_prefabs/gerencia/RentabilityIndicator";

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

const CATEGORIAS_STORAGE_KEY = "categorias_gerente";

export default function HomeGenerencia() {
    const [loadingAdmingPanel, setLoadingAdminPanel] = useState(true);
    const [branches, setBranches] = useState(null);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [messagerVisible, setMessagerVisible] = useState(false);
    const [branchSelected, setBranchSelected] = useState(null);
    const [graficoGases] = useState(null);
    const initData = useRef(false);
    const [loadingMultilinea, setLoadingMultilinear] = useState(false);
    const [mapData, setMapData] = useState([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [propios, setPropios] = useState(true);
    const [llenos, setLlenos] = useState(true);
    const [categorias, setCategorias] = useState([]);

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
            const categoriasData = data.categorias || [];
            setCategorias(categoriasData);

            const validIds = categoriasData
                .map((cat) => String(cat.id || cat._id || ""))
                .filter(Boolean);

            const storedIds = (localStorage.getItem(CATEGORIAS_STORAGE_KEY) || "")
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean);

            const initialSelectedIds = storedIds.filter((id) => validIds.includes(id));
            setSelectedCategoryIds(initialSelectedIds);
        } catch (error) {
            console.error("Error fetching categorias:", error);
        }
    }, [setCategorias, setSelectedCategoryIds]);

    const fetchMapData = useCallback(async () => {
        try {
            const params = new URLSearchParams();

            if (selectedCategoryIds.length > 0) {
                params.set("categorias", selectedCategoryIds.join(","));
            }

            params.set("propios", String(propios));

            if (llenos !== null) {
                params.set("llenos", String(llenos));
            }

            const queryString = params.toString();
            const qry = queryString ? `?${queryString}` : "";
            console.log("QUERY", qry);
            const response = await fetch(`/api/bi/cilindros${qry}`);
            const mapData = await response.json();
            console.log("MAP DATA", mapData);
            setMapData(mapData.cilindros);
        } catch (error) {
            console.error("Error fetching map data:", error);
        }
    }, [setMapData, selectedCategoryIds, propios, llenos]);

    useEffect(() => {
        if (!initData.current) {
            initData.current = true;
            fetchMainPanelData();
            fetchCategorias();
        }
    }, [fetchMainPanelData, fetchCategorias]);

    useEffect(() => {
        if (selectedCategoryIds.length > 0) {
            localStorage.setItem(CATEGORIAS_STORAGE_KEY, selectedCategoryIds.join(","));
        } else {
            localStorage.removeItem(CATEGORIAS_STORAGE_KEY);
        }
    }, [selectedCategoryIds]);

    useEffect(() => {
        if (branchSelected !== null) {
            fetchMapData();
        }
    }, [branchSelected, fetchMapData]);

    const handleDebtClick = () => {
        window.location.href = "/modulos/deudas?total=true";
    };

    const handleBranchClick = useCallback((index) => {
        setBranchSelected(branchSelected != null && branchSelected === index ? null : index);
        setLoadingMultilinear(true);
    }, [branchSelected]);

    const handleToggleNotifications = useCallback(() => {
        setNotificationVisible((prev) => !prev);
        setMessagerVisible(false);
    }, []);

    const handleToggleMessages = useCallback(() => {
        setMessagerVisible((prev) => !prev);
        setNotificationVisible(false);
    }, []);

    const handleToggleCategory = useCallback((categoriaId) => {
        setSelectedCategoryIds((prev) => {
            if (prev.includes(categoriaId)) {
                return prev.filter((id) => id !== categoriaId);
            }

            return [...prev, categoriaId];
        });
    }, []);

    const handleTogglePropios = useCallback(() => {
        setPropios((prev) => !prev);
    }, []);

    const handleToggleLlenos = useCallback(() => {
        setLlenos((prev) => !prev);
    }, []);

    const getBoxStyles = (index) => {
        if (branchSelected === index) {
            return 'transform-none w-1/2 h-1/2 md:w-full md:h-full';
        } else if (branchSelected !== null) {
            const translateMap = [
                'translate-x-0 translate-y-0',
                'translate-y-1/2 translate-x-0',
                'translate-x-0 translate-y-full',
                'translate-x-full translate-y-full',
            ];
            return 'w-1/2 h-1/2 ' + translateMap[index];
        } else {
            const translateMap = [
                'translate-x-0 translate-y-0',
                'translate-y-1/2 translate-x-0',
                'translate-x-0 translate-y-full',
                'translate-x-full translate-y-full',
            ];
            return 'w-1/2 h-1/2 ' + translateMap[index];
        }
    };

    return (
        <main className="w-full h-screen overflow-y-auto">
            <div className={`absolute w-full h-full`}>

                <div className="w-full md:w-1/2 flex flex-col md:flex-row h-full mt-6">
                    
                        {branches && branches.map((branch, index) => (
                            (branchSelected == null || branchSelected === index) && (                                
                                <HouseHealthIndicator
                                    key={index}
                                    branch={branch}
                                    index={index}
                                    branchSelected={branchSelected}
                                    stateColors={stateColors}
                                    getBoxStyles={getBoxStyles}
                                    onDebtClick={handleDebtClick}
                                    onBranchClick={handleBranchClick}
                                    onToggleNotifications={handleToggleNotifications}
                                    onToggleMessages={handleToggleMessages}
                                />
                            )))}
                </div>

                {branchSelected !== null && (
                    <div className="absolute bottom-20 md:bottom-16 left-0 md:left-4 scale-75 md:scale-100 -translate-x-10">
                        <div className="w-full ml-10">
                            {["VENTA", "PRODUCIDO", "ARRIENDO", "O2", "At", "Ar", "Al", "Ac"].map((category, i) => (
                                <button
                                    key={`chip_${category}_${i}`}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-0 mr-1 px-4 rounded-md mb-1.5 text-sm"
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap w-full">
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

                {branchSelected != null && (<RentabilityIndicator rentabilidad={branchSelected.rentabilidad} />)}

                <div className="absolute top-56 md:top-0 right-0 mt-16 w-3/5 md:w-1/2 md:mr-8">
                    <MapCilinderMasterView
                        visible={branchSelected !== null}
                        mapData={mapData}
                        categorias={categorias}
                        selectedCategoryIds={selectedCategoryIds}
                        onToggleCategory={handleToggleCategory}
                        propios={propios}
                        onTogglePropios={handleTogglePropios}
                        llenos={llenos}
                        onToggleLlenos={handleToggleLlenos}
                    />
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







