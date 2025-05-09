"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Configuraciones;
const link_1 = __importDefault(require("next/link"));
const hi_1 = require("react-icons/hi");
const tb_1 = require("react-icons/tb");
const bi_1 = require("react-icons/bi");
const ri_1 = require("react-icons/ri");
const fa_1 = require("react-icons/fa");
const lu_1 = require("react-icons/lu");
const gr_1 = require("react-icons/gr");
function Configuraciones() {
    return (<main className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 p-2 md:p-6 max-w-2xl mx-auto mt-8">
            <link_1.default href="/modulos/configuraciones/sucursales">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <ri_1.RiHomeOfficeFill className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>SUCURSALES</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/precios">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center relative">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <tb_1.TbReportMoney className="mx-auto mb-1" size="6rem"/>
                        <span className="absolute top-4 right-12 bg-red-500 text-white rounded-full px-2 py-1 text-xs">9+</span>
                    </div>
                    <span>PRECIOS</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/comisiones">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <bi_1.BiSolidOffer className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>COMISIONES</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/flota">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <fa_1.FaTruck className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>FLOTA</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/catalogo">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <gr_1.GrCatalog className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>CATÁLOGO</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/clientes">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <hi_1.HiUserGroup className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>CLIENTES</span>
                </div>
            </link_1.default>            
            <link_1.default href="/modulos/configuraciones/accesos">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <tb_1.TbLockAccess className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>ACCESOS</span>
                </div>
            </link_1.default>
            <link_1.default href="/modulos/configuraciones/importacion">
                <div className="w-full shadow-lg rounded-lg py-4 hover:scale-105 border-2 hover:border-blue-100 mb-2 text-center">
                    <div className="w-full inline-flex text-center text-slate-500 p-4 relative">
                        <lu_1.LuFileJson2 className="mx-auto mb-1" size="6rem"/>
                    </div>
                    <span>IMPORTAR DATA</span>
                </div>
            </link_1.default>            
        </main>);
}
