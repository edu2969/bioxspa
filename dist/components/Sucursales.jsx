"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sucursales;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const ai_1 = require("react-icons/ai");
const io_1 = require("react-icons/io");
const Loader_1 = __importDefault(require("@/components/Loader"));
const fa_1 = require("react-icons/fa");
function Sucursales() {
    const [branches, setBranches] = (0, react_1.useState)([]);
    const [loadingList, setLoadingList] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        async function fetchBranches() {
            try {
                const response = await fetch('/api/sucursales');
                const data = await response.json();
                console.log("DATA", data);
                setBranches(data.sucursales);
            }
            catch (error) {
                console.error("Error fetching branches:", error);
            }
            finally {
                setLoadingList(false);
            }
        }
        fetchBranches();
    }, []);
    return (<main className="px-6 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-start space-x-4 text-ship-cove-800 pt-4">
                            <link_1.default href="/modulos">
                                <ai_1.AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2"/>
                            </link_1.default>
                            <io_1.IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300"/>
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">SUCURSALES</span>
                        </div>
                        <div className="pt-4">
                            <link_1.default href="/modulos/configuraciones/sucursales/edit">
                                <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                                    NUEVO
                                </button>
                            </link_1.default>
                        </div>
                    </div>
                    {branches.length > 0 && <div className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <div className="w-full text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <div className="flex">
                                <div className="w-1/2 py-2 pl-3">
                                    NOMBRE
                                </div>
                                <div className="w-1/2 py-2 pl-3">
                                    ACCIONES
                                </div>
                            </div>
                        </div>
                    </div>}
                    <div>
                        {branches.map((branch) => (<div key={branch._id} className="flex bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 py-2">
                                <div className="w-1/2 px-2 flex items-center">
                                    <div>
                                        <p className="uppercase font-extrabold text-xl">{branch.nombre}</p>
                                    </div>
                                </div>
                                <div className="w-1/2 px-2 flex items-center justify-end">
                                    <link_1.default href={`/modulos/configuraciones/sucursales/edicion?id=${branch._id}`}>
                                        <button className="bg-yellow-500 text-white px-4 py-0.5 rounded-md hover:bg-yellow-600 flex">
                                            <fa_1.FaPen size="0.8rem" className="mt-1 mr-2"/> EDITAR
                                        </button>
                                    </link_1.default>
                                </div>
                            </div>))}
                        {branches.length === 0 && !loadingList && (<div className="flex justify-center py-10">
                                <p className="text-xl mt-2 ml-4 uppercase">Sin sucursales</p>
                            </div>)}
                        {loadingList && <div className="my-4"><Loader_1.default /></div>}
                    </div>
                </div>
            </div>
        </main>);
}
