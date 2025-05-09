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
function HomeConductor() {
    const [tienePedidos, setTienePedidos] = (0, react_1.useState)(false);
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
        }
        catch (error) {
            console.error("Error fetching pedidos:", error);
        }
    };
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
    return (<main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 px-16 md:px-6 max-w-lg mx-auto mt-7">
            <link_1.default href="/modulos/homeConductor/pedidos" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <fa_1.FaRoute className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>PEDIDOS</span>
                </div>
                {tienePedidos ? <div className="absolute top-8 right-20 bg-blue-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                    <span className="text-lg mr-1">1</span>
                </div> :
            <div className="absolute top-8 right-20 bg-green-500 text-white text-xs font-bold rounded-full pl-2 pr-1.5 h-8 w-8 flex items-center justify-center">
                        <span className="text-lg mr-1">0</span>
                    </div>}                
            </link_1.default>
            <link_1.default href="/modulos/comisiones" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <tb_1.TbReportMoney className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>MIS RENTAS</span>
                </div>
            </link_1.default>  
        </main>);
}
