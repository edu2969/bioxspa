"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Despacho;
const react_1 = require("react");
const image_1 = __importDefault(require("next/image"));
const md_1 = require("react-icons/md");
const Loader_1 = __importDefault(require("./Loader"));
const fa_1 = require("react-icons/fa");
const socket_client_1 = require("@/lib/socket-client");
function Despacho({ session }) {
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = (0, react_1.useState)(null);
    const [certificaOk, setCertificaOk] = (0, react_1.useState)(false);
    const [rutaDespacho, setRutaDespacho] = (0, react_1.useState)(null);
    const [vehiculos, setVehiculos] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [linkedVehicle] = (0, react_1.useState)(false);
    const [resumenCarga, setResumenCarga] = (0, react_1.useState)([]);
    function calculateTubePosition(layerIndex, index) {
        const scaleFactor = 1.5; // Factor de escala basado en el tamaño triplicado del camión
        const baseTop = 18 * scaleFactor; // Escalar la posición inicial en el eje Y
        const baseLeft = 22 * scaleFactor; // Escalar la posición inicial en el eje X
        const verticalSpacing = -4.5 * scaleFactor; // Escalar el espaciado vertical entre tubos
        const horizontalSpacing = 3 * scaleFactor; // Escalar el espaciado horizontal entre columnas
        const perspectiveAngle = 55; // Ángulo de perspectiva en grados (sin cambios)
        const rowGroupSpacing = 9 * scaleFactor; // Escalar el espaciado adicional entre grupos de filas
        // Conversión del ángulo de perspectiva a radianes
        const angleInRadians = (perspectiveAngle * Math.PI) / 180;
        // Cálculo de desplazamiento en perspectiva
        const perspectiveOffset = layerIndex * Math.tan(angleInRadians) * scaleFactor;
        // Ajuste para separar los grupos de filas
        const groupOffset = layerIndex >= 3 ? rowGroupSpacing : 0;
        // Cálculo de las posiciones escaladas
        const top = baseTop + index * verticalSpacing + perspectiveOffset;
        const left = baseLeft + layerIndex * horizontalSpacing + perspectiveOffset + groupOffset;
        return { top, left, width: `${14 * scaleFactor}px`, height: `${78 * scaleFactor}px` }; // Escalar el tamaño de los tanques
    }
    const getResumenCarga = (rd) => {
        if (rd && rd.ventas) {
            const itemSummary = {};
            rd.ventas.forEach((venta) => {
                venta.items.forEach((item) => {
                    if (itemSummary[item.nombre]) {
                        itemSummary[item.nombre] += item.cantidad;
                    }
                    else {
                        itemSummary[item.nombre] = item.cantidad;
                    }
                });
            });
            return Object.entries(itemSummary).map(([nombre, cantidad]) => ({ nombre, cantidad }));
        }
        return [];
    };
    const vehiculoPorId = (id) => {
        if (id == null)
            return { patente: "", marca: "" };
        return vehiculos === null || vehiculos === void 0 ? void 0 : vehiculos.find((vehiculo) => vehiculo._id === id);
    };
    const fetchRutaAsignada = (0, react_1.useCallback)(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer");
            const data = await response.json();
            if (data.ok) {
                console.log("Data result:", data);
                setRutaDespacho(data.rutaDespacho);
                if (data.vehiculos.length == 1) {
                    setVehiculoSeleccionado(data.vehiculos[0]._id);
                    setCertificaOk(true);
                }
                setVehiculos(data.vehiculos);
                setResumenCarga(getResumenCarga(data.rutaDespacho));
            }
            else {
                console.error("Error fetching rutaDespacho:", data.error);
            }
            setLoading(false);
        }
        catch (error) {
            console.error("Error in fetchRutaAsignada:", error);
        }
    }, [setRutaDespacho, setVehiculoSeleccionado, setCertificaOk, setResumenCarga, setLoading, setVehiculos]);
    (0, react_1.useEffect)(() => {
        fetchRutaAsignada();
    }, [fetchRutaAsignada]);
    (0, react_1.useEffect)(() => {
        if (rutaDespacho && vehiculoSeleccionado && !linkedVehicle) {
            console.log("Asociando vehiculo", vehiculoSeleccionado);
            asociarVehiculo();
        }
        else {
            console.log("No hay rutas para asignar vehiculo");
        }
    }, [rutaDespacho, vehiculoSeleccionado, linkedVehicle, asociarVehiculo]);
    (0, react_1.useEffect)(() => {
        console.log("RUTA", rutaDespacho);
    }, [rutaDespacho]);
    (0, react_1.useEffect)(() => {
        socket_client_1.socket.on("update-pedidos", (data) => {
            console.log(">>>> Update pedidos", data, session);
            if (data.userId === session.user.id) {
                fetchRutaAsignada();
            }
        });
        return () => {
            socket_client_1.socket.off("update-pedidos");
        };
    }, [session, fetchRutaAsignada]);
    const asociarVehiculo = (0, react_1.useCallback)(async () => {
        try {
            console.log("Asociando vehiculo", vehiculoSeleccionado);
            const response = await fetch("/api/pedidos/asignacion/chofer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ vehiculoId: vehiculoSeleccionado }),
            });
            const data = await response.json();
            if (data.ok) {
                setCertificaOk(true);
            }
            else {
                console.log("Error assigning vehicle to route:", data.error);
            }
        }
        catch (error) {
            console.log("Error in POST request:", error);
        }
    }, [vehiculoSeleccionado]);
    return (<div className="w-full h-screen overflow-hidden">
            {!loading && vehiculos.length >= 2 && <div className="w-full text-center">
                <select className="text-2xl font-bold mb-4 p-2 border rounded-lg bg-white shadow-sm w-1/3 mt-10" onChange={(e) => setVehiculoSeleccionado(e.target.value)}>
                    <option>Selecciona un vehiculo</option>
                    {vehiculos.map((vehiculo) => (<option key={`vehiculo_${vehiculo._id}`} value={vehiculo._id}>
                            {vehiculo.patente} - {vehiculo.marca}
                        </option>))}
                </select>
            </div>}
            <div className={`${!vehiculoSeleccionado && "opacity-20"}`}>
                <image_1.default className="absolute top-12 left-0 ml-12" src="/ui/camion.png" alt="camion_atras" width={355} height={275} style={{ width: "355px", height: "275px" }} priority/>
                <div className="absolute top-10 left-0 ml-12 mt-2 w-full h-fit">
                    {Array.from({ length: 6 }).map((_, layerIndex) => (<div key={layerIndex} className="absolute flex" style={calculateTubePosition(layerIndex, 0)}>
                            {Array.from({ length: 6 }).map((_, index) => (<image_1.default key={index} src={`/ui/tanque_biox${(index + layerIndex * 6 > 40) ? '_verde' : (index + layerIndex * 6 > 20) ? '_azul' : ''}.png`} alt={`tank_${layerIndex * 6 + index}`} width={14 * 2} height={78 * 2} className="relative" style={calculateTubePosition(layerIndex, index)} priority={false}/>))}
                        </div>))}
                </div>
                <image_1.default className="absolute top-12 left-0 ml-12" src="/ui/camion_front.png" alt="camion" width={355} height={275} style={{ width: "355px", height: "275px" }}/>
                <div className="absolute top-28 left-48 ml-8 mt-10" style={{ transform: "translate(0px, 0px) skew(0deg, -20deg) scale(2)" }}>
                    <div className="ml-4 text-slate-800">
                        <p className="text-xs font-bold">{vehiculoPorId(vehiculoSeleccionado).patente || ""}</p>
                        <p className="text-xs">{vehiculoPorId(vehiculoSeleccionado).marca || ""}</p>
                    </div>
                </div>
            </div>
            <div className="w-full absolute bottom-0 right-0 flex items-center justify-center">
                {!loading && !certificaOk && rutaDespacho && <div>
                    <div className="text-center bg-yellow-200 py-2 px-2 rounded-xl shadow-lg">
                    <p className="text-xl font-bold text-gray-700 mb-4">INICIO DE DESPACHO</p>
                        <md_1.MdCleaningServices className="inline-block mr-2 mb-6" style={{ transform: "scaleX(4)" }}/>
                        <div className="flex">
                            <input onChange={() => linkVehiculo()} type="checkbox" className="h-8 w-8 text-green-500 mx-auto"/>
                            <p className="w-72 text-left text-xl ml-4">Certifico que el interior del vehiculo está limpio</p>
                        </div>
                    </div>
                </div>}
                {!loading && certificaOk && rutaDespacho && rutaDespacho.ventas && (<div className="w-full py-2 px-2 border rounded-t-xl shadow-lg bg-white mx-2 -mb-1">
                        <md_1.MdOutlineKeyboardDoubleArrowUp className="text-gray-400 mx-auto -mt-1 mb-1" style={{ transform: "scaleX(6)" }}/>
                        <p className="font-bold text-xl mb-2 text-center">CARGA DE CILINDROS</p>
                        <div className="rounded-lg shadow-md border border-gray-300">                            
                            <div className="flex flex-col md:flex-row px-4 py-2">
                                <div className="w-full md:w-1/3">
                                    <div className="flex flex-wrap text-gray-700 text-sm">
                                        {resumenCarga.length && resumenCarga.map((item, idx) => (<div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                                {item.cantidad}x {item.nombre}
                                            </div>))}
                                    </div>
                                </div>
                            </div>                            
                        </div>
                        {false && <button className="mt-4 px-6 py-3 bg-green-500 text-white font-bold rounded-lg">
                            CONFIRMAR CARGA COMPLETADA
                        </button>}
                        <div className="py-4">                            
                            <div className="py-4">
                            <Loader_1.default texto="ESPERANDO CARGA..."/>
                            </div>
                        </div>
                        <div>
                            <p className="mx-auto my-4 px-4">Una vez que MARIO SOLAR haya pistoleado y confirmado la carga, podrás confirmar tú también</p>
                        </div>
                    </div>)}
                {loading && <div className="fixed w-full top-72 mt-16"><Loader_1.default texto="CARGANDO TUS PEDIDOS..."/></div>}
                {!loading && !rutaDespacho && (<div className="w-full py-6 px-12 bg-white mx-auto mb-32">
                        <fa_1.FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto"/>
                        <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                        <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
                    </div>)}
            </div>
        </div>);
}
