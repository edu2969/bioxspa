"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeClient;
const link_1 = __importDefault(require("next/link"));
const si_1 = require("react-icons/si");
const fa_1 = require("react-icons/fa");
function HomeClient() {
    return (<main className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 md:p-6 max-w-lg mx-auto mt-14">
            <link_1.default href="/modulos/homeclient/proyectos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <si_1.SiTask className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>PROYECTOS</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/homeclient/contratos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-4 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <fa_1.FaFileContract className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>CONTRATOS</span>
                </div>
            </link_1.default>
        </main>);
}
