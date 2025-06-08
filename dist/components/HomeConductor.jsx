"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeConductor;
const link_1 = __importDefault(require("next/link"));
const fa_1 = require("react-icons/fa");
const tb_1 = require("react-icons/tb");
const react_1 = require("react");
const socket_client_1 = require("@/lib/socket-client");
const Loader_1 = __importDefault(require("./Loader"));
function HomeConductor({ session }) {
    const [tienePedidos, setTienePedidos] = (0, react_1.useState)(false);
    const [routingIndex, setRoutingIndex] = (0, react_1.useState)(-2);
    const fetchTienePedidos = async () => {
        try {
            const response = await fetch("/api/home/chofer", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            setTienePedidos(data.tienePedidos);
            setRoutingIndex(-1);
        }
        catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    };
    (0, react_1.useEffect)(() => {
        var _a;
        // Verifica si hay sesión y el socket está conectado
        if (((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id) && socket_client_1.socket.connected) {
            console.log("Re-uniendo a room-pedidos después de posible recarga");
            socket_client_1.socket.emit("join-room", {
                room: "room-pedidos",
                userId: session.user.id
            });
        }
        // Evento para manejar reconexiones del socket
        const handleReconnect = () => {
            var _a;
            if ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id) {
                console.log("Socket reconectado, uniendo a sala nuevamente");
                socket_client_1.socket.emit("join-room", {
                    room: "room-pedidos",
                    userId: session.user.id
                });
            }
        };
        // Escucha el evento de reconexión
        socket_client_1.socket.on("connect", handleReconnect);
        return () => {
            socket_client_1.socket.off("connect", handleReconnect);
        };
    }, [session]);
    (0, react_1.useEffect)(() => {
        socket_client_1.socket.on("update-pedidos", () => {
            fetchTienePedidos();
        });
        return () => {
            socket_client_1.socket.off("update-pedidos");
        };
    }, []);
    (0, react_1.useEffect)(() => {
        fetchTienePedidos();
    }, []);
    return (<main className="w-full h-screen flex items-center justify-center">
            <div className={`absolute w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-4 px-12 ${routingIndex == -2 ? "opacity-20" : ""}`}>
                <div className="relative">
                    <link_1.default href="/modulos/homeConductor/pedidos" onClick={() => setRoutingIndex(0)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 0 ? "opacity-20" : ""}`}>  
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <fa_1.FaRoute className="mx-auto mb-1" size="6rem"/>
                            </div>
                            <span>PEDIDOS</span>
                        </div>
                        {tienePedidos ? (<div className="absolute top-8 right-24 bg-blue-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                                <span className="text-lg mr-1">1</span>
                            </div>) : (<div className="absolute top-8 right-24 bg-green-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                                <span className="text-lg mr-1">0</span>
                            </div>)}
                    </link_1.default>
                    {routingIndex == 0 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader_1.default texto="Texto1"/>
                        </div>
                    </div>}
                </div>
                <div className="relative">
                    <link_1.default href="/modulos/comisiones" className="relative" onClick={() => setRoutingIndex(1)}>
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex == 1 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <tb_1.TbReportMoney className="mx-auto mb-1" size="6rem"/>
                            </div>
                            <span>MIS RENTAS</span>
                        </div>
                    </link_1.default>
                    {routingIndex == 1 && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader_1.default texto="Cargador 2..."/>
                        </div>
                    </div>}
                </div>
            </div>
            {routingIndex == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                <Loader_1.default texto="Cargando panel"/>
            </div>}
        </main>);
}
