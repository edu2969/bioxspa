"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Debtors;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const react_circular_progressbar_1 = require("react-circular-progressbar");
require("react-circular-progressbar/dist/styles.css");
const ai_1 = require("react-icons/ai");
const io_1 = require("react-icons/io");
const md_1 = require("react-icons/md");
const debtors = [
    {
        name: "Hinrichsen y Vasey Operaciones Limitada",
        contact: "Carolina",
        lastSale: "2023-09-15",
        lastPayment: "2023-09-20",
        cylinders: 10,
        excel: "#",
        pdf: "#",
        totalDebt: 15000000,
        overdue30: 5000000,
        overdue60: 3000000,
        overdue90: 2000000,
        lastPaymentAmount: 2000000,
        risk: 45,
        assignedTo: "Alex Jara",
        id: "76703362-1"
    },
    {
        name: "Ingenieria y Montaje Jorge Salgado Espinoza EIRL",
        contact: "Jorge Salgado",
        lastSale: "2023-08-10",
        lastPayment: "2023-08-15",
        cylinders: 5,
        excel: "#",
        pdf: "#",
        totalDebt: 20000000,
        overdue30: 7000000,
        overdue60: 5000000,
        overdue90: 3000000,
        lastPaymentAmount: 3000000,
        risk: 60,
        assignedTo: "Alex Jara",
        id: "10678051-K"
    },
    {
        name: "Georgina Del Carmen Perez Valencia",
        contact: "Felipe Soto",
        lastSale: "2023-07-20",
        lastPayment: "2023-07-25",
        cylinders: 8,
        excel: "#",
        pdf: "#",
        totalDebt: 10000000,
        overdue30: 2000000,
        overdue60: 1000000,
        overdue90: 500000,
        lastPaymentAmount: 1000000,
        risk: 25,
        assignedTo: "Lilian Carrillo Diaz",
        id: "76303440-2"
    },
    {
        name: "Constructora Castillo Y Bono Limitada",
        contact: "Daniel Parra",
        lastSale: "2023-06-30",
        lastPayment: "2023-07-05",
        cylinders: 12,
        excel: "#",
        pdf: "#",
        totalDebt: 25000000,
        overdue30: 8000000,
        overdue60: 6000000,
        overdue90: 4000000,
        lastPaymentAmount: 4000000,
        risk: 75,
        assignedTo: "Alex Jara",
        id: "7951345-8"
    },
    {
        name: "Jose Luis Zamudio Aldea",
        contact: "Jose Zamudio",
        lastSale: "2023-05-15",
        lastPayment: "2023-05-20",
        cylinders: 6,
        excel: "#",
        pdf: "#",
        totalDebt: 5000000,
        overdue30: 1000000,
        overdue60: 500000,
        overdue90: 200000,
        lastPaymentAmount: 500000,
        risk: 50,
        assignedTo: "Cristian Rodriguez Z",
        id: "10820871-6"
    },
    {
        name: "Luis Ariel Medel Hermosilla",
        contact: "Luis Medel",
        lastSale: "2023-04-10",
        lastPayment: "2023-04-15",
        cylinders: 4,
        excel: "#",
        pdf: "#",
        totalDebt: 3000000,
        overdue30: 500000,
        overdue60: 200000,
        overdue90: 100000,
        lastPaymentAmount: 200000,
        risk: 20,
        assignedTo: "Lilian Carrillo Diaz",
        id: "76000322-0"
    },
    {
        name: "Maestranza SG Limitada",
        contact: "Carlos Perez",
        lastSale: "2023-03-05",
        lastPayment: "2023-03-10",
        cylinders: 15,
        excel: "#",
        pdf: "#",
        totalDebt: 30000000,
        overdue30: 10000000,
        overdue60: 8000000,
        overdue90: 6000000,
        lastPaymentAmount: 6000000,
        risk: 85,
        assignedTo: "Alex Jara",
        id: "76000322-1"
    }
];
function Debtors() {
    const [loadingList, setLoadingList] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setLoadingList(false);
    }, []);
    const riskText = (risk) => {
        if (risk <= 30)
            return "BIEN";
        if (risk <= 60)
            return "RIESGOSO";
        return "QUIEBRA";
    };
    return (<main className="px-6 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                            <div className="flex items-start space-x-4 text-ship-cove-800 pt-4">
                                <link_1.default href="/modulos">
                                    <ai_1.AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2"/>
                                </link_1.default>
                                <io_1.IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300"/>
                                <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">DEUDORES</span>
                            </div>
                        </div>
                    </div>
                    {debtors.length > 0 && <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <div className="w-full text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-4/12 py-2 pl-3">
                                    NOMBRE / CONTACTO
                                </div>
                                <div className="w-1/12 py-2 text-center">TOTAL DEUDA</div>
                                <div className="w-1/12 py-2 text-center">VENCIDO 30</div>
                                <div className="w-1/12 py-2 text-center">VENCIDO 60</div>
                                <div className="w-1/12 py-2 text-center">VENCIDO 90</div>
                                <div className="w-1/12 py-2 text-center">ULTIMO PAGO</div>
                                <div className="w-1/12 py-2 text-center">RIESGO</div>
                                <div className="w-2/12 py-2 text-center">ACCIONES</div>
                            </div>
                        </div>
                    </div>}
                    <div>
                        {debtors && debtors.map(debtor => (<div key={debtor.id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600">
                                <div className="w-4/12 px-2 flex items-center">
                                    <div>
                                        <p className="uppercase font-extrabold text-xl">{debtor.name}</p>
                                        <div className="flex items-center text-xs">
                                            <p>Contacto: {debtor.contact}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>${debtor.totalDebt.toLocaleString()}</b></p>
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>${debtor.overdue30.toLocaleString()}</b></p>
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>${debtor.overdue60.toLocaleString()}</b></p>
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>${debtor.overdue90.toLocaleString()}</b></p>
                                </div>
                                <div className="w-1/12 pt-4 text-center">
                                    <p className="orbiton text-xl mt-4"><b>${debtor.lastPaymentAmount.toLocaleString()}</b></p>
                                </div>
                                <div className="w-1/12 pt-4">
                                    <react_circular_progressbar_1.CircularProgressbar className="h-14" strokeWidth={16} value={debtor.risk} text={`${debtor.risk}%`}/>
                                    <p className="text-center text-xs mt-1">{riskText(debtor.risk)}</p>
                                </div>
                                <div className="w-2/12 px-2 py-7 flex text-center justify-center">
                                    <link_1.default href={`/modulos/deudas/${debtor.id}`} className="hover:text-blue-400 shadow-xl rounded-md w-20 h-14 mr-2 pt-2">
                                        <md_1.MdOutlineVisibility size="1.2rem" className="mx-auto"/><span className="text-xs">VER DEUDA</span>
                                    </link_1.default>
                                </div>
                            </div>))}
                        {debtors.length === 0 && !loadingList && (<div className="flex justify-center py-10">
                            <p className="text-xl mt-2 ml-4 uppercase">Sin deudores</p></div>)}
                        {loadingList && <div className="py-4">Cargando...</div>}
                    </div>
                </div>
            </div>
        </main>);
}
