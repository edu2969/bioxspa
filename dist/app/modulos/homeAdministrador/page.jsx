"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeAdministrador;
const link_1 = __importDefault(require("next/link"));
const fa_1 = require("react-icons/fa");
const fa_2 = require("react-icons/fa");
const tb_1 = require("react-icons/tb");
const react_1 = require("react");
function HomeAdministrador() {
    const [borradorCount, setBorradorCount] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        async function fetchCounters() {
            try {
                const response = await fetch('/api/home/administrador');
                const data = await response.json();
                if (data.ok && data.resultado) {
                    setBorradorCount(data.resultado[0].flota || 0);
                }
            }
            catch (error) {
                console.error('Error fetching counters:', error);
            }
        }
        fetchCounters();
    }, []);
    return (<main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-7">
            <link_1.default href="/modulos/pedidos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <fa_2.FaFileContract className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>PEDIDOS</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/asignacion" className="relative">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <fa_1.FaSignInAlt className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>ASIGNACION</span>
                </div>
                {borradorCount > 0 && (<div className="absolute top-6 -right-10 bg-red-500 text-white text-xs font-bold rounded-full px-2 h-6 flex items-center justify-center">
                        <span className="text-sm mr-1">{borradorCount > 999999 ? '999999+' : borradorCount}</span> 
                        <span className="text-xs mt-0.5">x ASIGNAR</span>
                    </div>)}
            </link_1.default>            
            <link_1.default href="/modulos/deudas">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <tb_1.TbReportMoney className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>DEUDAS</span>
                </div>
            </link_1.default>
        </main>);
}
