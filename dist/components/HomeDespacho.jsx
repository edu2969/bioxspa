"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeDespacho;
const link_1 = __importDefault(require("next/link"));
const tb_1 = require("react-icons/tb");
const react_1 = require("react");
const socket_client_1 = require("@/lib/socket-client");
const Loader_1 = __importDefault(require("@/components/Loader"));
function HomeDespacho({ session }) {
    const [cantidadRutas, setCantidadRutas] = (0, react_1.useState)(0);
    const [routingIndex, setRoutingIndex] = (0, react_1.useState)(-2);
    const fetchRutas = async () => {
        try {
            const response = await fetch("/api/home/despacho", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            setCantidadRutas(data.cantidadRutas);
            setRoutingIndex(-1);
        }
        catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    };
    (0, react_1.useEffect)(() => {
        socket_client_1.socket.on("update-pedidos", () => {
            fetchRutas();
        });
        return () => {
            socket_client_1.socket.off("update-pedidos");
        };
    }, []);
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
        fetchRutas();
    }, []);
    return (<main className="w-full h-screen flex items-center justify-center">
            <div className={`absolute w-full max-w-lg grid grid-cols-1 md:grid-cols-2 gap-4 px-12 ${routingIndex === -2 ? "opacity-20" : ""}`}>
                <div className="relative">
                    <link_1.default href="/modulos/homeDespacho/pedidos" onClick={() => setRoutingIndex(0)} className="relative">
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex === 0 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <tb_1.TbTruckLoading className="mx-auto mb-1" size="6rem"/>
                            </div>
                            <span>PEDIDOS</span>
                            <div className="absolute top-12 right-24 bg-red-500 text-white text-md font-bold rounded-full pl-1 w-8 h-8 flex items-center justify-center">
                                <span className="text-sm mr-1">{cantidadRutas}</span>
                            </div>
                            {routingIndex === 0 && (<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <Loader_1.default texto=""/>
                                </div>)}
                        </div>
                    </link_1.default>
                </div>
                <div className="relative">
                    <link_1.default href="/modulos/comisiones" onClick={() => setRoutingIndex(1)} className="relative">
                        <div className={`w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative ${routingIndex === 1 ? "opacity-20" : ""}`}>
                            <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                                <tb_1.TbReportMoney className="mx-auto mb-1" size="6rem"/>
                            </div>
                            <span>MIS RENTAS</span>
                            {routingIndex === 1 && (<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <Loader_1.default texto=""/>
                                </div>)}
                        </div>
                    </link_1.default>
                </div>
            </div>
            {routingIndex === -2 && (<div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-white bg-opacity-60 z-10">
                    <Loader_1.default texto="Cargando panel"/>
                </div>)}
        </main>);
}
