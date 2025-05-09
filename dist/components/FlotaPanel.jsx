"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FlotaPanel;
const image_1 = __importDefault(require("next/image"));
const react_1 = __importDefault(require("react"));
const bs_1 = require("react-icons/bs");
const fa6_1 = require("react-icons/fa6");
const trucks = [
    { patente: "LLSW-71", marca: "Hyundai Porter", revisionTec: "2024-04-07", diasFaltantes: 302, tubosLlenos: 10, tubosVacios: 5, enRuta: true, direccion: "Cliente 1, Talcahuano" },
    { patente: "RPYF-33", marca: "Volkswagen Delivery 9.160", revisionTec: "2024-09-04", diasFaltantes: 152, tubosLlenos: 8, tubosVacios: 7, enRuta: false },
    { patente: "PHBL-23", marca: "Hyundai Porter", revisionTec: "2025-06-01", diasFaltantes: 117, tubosLlenos: 12, tubosVacios: 3, enRuta: true, direccion: "Cliente 2, Concepción" },
    { patente: "JVHP-16", marca: "Ford Ranger XLT", revisionTec: "2025-01-01", diasFaltantes: 33, tubosLlenos: 15, tubosVacios: 0, enRuta: false },
    { patente: "JZYY-59", marca: "Ford Ranger LTD", revisionTec: "2025-01-01", diasFaltantes: 33, tubosLlenos: 7, tubosVacios: 8, enRuta: true, direccion: "Cliente 3, Los Ángeles" },
    { patente: "RPYF-32", marca: "Volkswagen Delivery 9.160", revisionTec: "2024-03-27", diasFaltantes: 313, tubosLlenos: 9, tubosVacios: 6, enRuta: false },
    { patente: "RZRF-18", marca: "Volkswagen Delivery 11.180", revisionTec: "2024-06-14", diasFaltantes: 234, tubosLlenos: 11, tubosVacios: 4, enRuta: true, direccion: "Cliente 4, Talcahuano" },
    { patente: "RPYD-85", marca: "Volkswagen Constellation 17.280", revisionTec: "2024-09-06", diasFaltantes: 150, tubosLlenos: 6, tubosVacios: 9, enRuta: false },
    { patente: "LPHF-83", marca: "Kia Frontier", revisionTec: "2024-06-02", diasFaltantes: 246, tubosLlenos: 13, tubosVacios: 2, enRuta: true, direccion: "Cliente 5, Concepción" },
    { patente: "SBDY-13", marca: "Mitsubishi Work L200", revisionTec: "2025-06-15", diasFaltantes: 131, tubosLlenos: 5, tubosVacios: 10, enRuta: false },
    { patente: "SBSK64", marca: "Mitsubishi", revisionTec: "2024-07-15", diasFaltantes: 203, tubosLlenos: 14, tubosVacios: 1, enRuta: true, direccion: "Cliente 6, Los Ángeles" },
    { patente: "SZFB24", marca: "Ford Transit", revisionTec: "2025-11-18", diasFaltantes: 287, tubosLlenos: 4, tubosVacios: 11, enRuta: false }
];
function FlotaPanel() {
    return (<main className="mt-4 h-screen overflow-y-auto">
            <div className="grid grid-cols-4 h-full gap-4 p-4">
                {trucks.map((truck, index) => (<div key={index} className="relative w-full h-48 border rounded-lg p-4 bg-white shadow-md">
                    <image_1.default className="absolute top-0 left-0 ml-12 mt-2" src="/ui/camion.png" alt="camion" width={250} height={194}/>
                    <image_1.default className="absolute top-0 left-0 ml-12 mt-2" src="/ui/camion_front.png" alt="camion" width={250} height={194}/>
                    <div className="absolute ml-10" style={{ transform: "translate(90px, 50px) skew(0deg, -20deg)" }}>
                        <div className="ml-4 text-slate-800">
                            <p className="text-2xl font-bold">{truck.patente}</p>

                            <p className="text-xs">{truck.marca}</p>
                        </div>
                    </div>
                    <div className="mt-52 ml-8">
                        <p className="font-bold text-2xl ml-8">{truck.patente}</p>
                        <div className="flex text-green-600">
                            <bs_1.BsFillClipboard2CheckFill className="text-2xl mt-0.5 mr-2"/>
                            <p className="orbitron text-2xl mr-2">{truck.diasFaltantes}</p>
                            <p className="text-xs mr-2 mt-3">días faltantes</p>
                        </div>
                        <div className="flex text-blue-600">
                            <fa6_1.FaB className="text-2xl mt-0.5 mr-2"/>
                            <p className="orbitron text-2xl mr-2">{truck.marca}</p>
                        </div>
                    </div>
                </div>))}
            </div>
        </main>);
}
