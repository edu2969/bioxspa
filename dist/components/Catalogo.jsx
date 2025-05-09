"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Catalogo;
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = __importStar(require("react"));
const ai_1 = require("react-icons/ai");
const io_1 = require("react-icons/io");
const io5_1 = require("react-icons/io5");
const react_2 = require("react");
const Loader_1 = __importDefault(require("./Loader"));
function Catalogo() {
    const [selectedCategoria, setSelectedCategoria] = (0, react_1.useState)(null);
    const [selectedSubcategoria, setSelectedSubcategoria] = (0, react_1.useState)(null);
    const [subcategorias, setSubcategorias] = (0, react_1.useState)([]);
    const [items, setItems] = (0, react_1.useState)([]);
    const [loadingCategoria, setLoadingCategoria] = (0, react_1.useState)(false);
    const [loadingSubcategoria, setLoadingSubcategoria] = (0, react_1.useState)(false);
    const [loadingItems, setLoadingItems] = (0, react_1.useState)(false);
    const handleCategoriaClick = async (index) => {
        setLoadingSubcategoria(true);
        const categoria = categorias[index];
        setSelectedCategoria(categoria);
        setSelectedSubcategoria(null);
        setItems([]);
        const response = await fetch(`/api/catalogo/subcategoria?id=${categoria._id}`);
        const data = await response.json();
        setSubcategorias(data);
        setLoadingSubcategoria(false);
    };
    const handleSubcategoriaClick = async (subcategoria) => {
        setLoadingItems(true);
        setSelectedSubcategoria(subcategoria);
        const response = await fetch(`/api/catalogo/subcategoria/items?id=${subcategoria._id}`);
        const data = await response.json();
        setItems(data);
        setLoadingItems(false);
    };
    const handleBackClick = () => {
        if (selectedSubcategoria) {
            setSelectedSubcategoria(null);
            setItems([]);
        }
        else {
            setSelectedCategoria(null);
            setSubcategorias([]);
        }
    };
    const router = (0, navigation_1.useRouter)();
    const [categorias, setCategorias] = (0, react_1.useState)([]);
    (0, react_2.useEffect)(() => {
        setLoadingCategoria(true);
        const fetchCategorias = async () => {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            setCategorias(data);
            setLoadingCategoria(false);
        };
        fetchCategorias();
    }, []);
    return (<main className="w-full h-screen">
            <div className="py-10 w-full">
                <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 pt-4 mx-10 bg-white dark:bg-gray-900">
                    <div className="flex items-center space-x-4 text-ship-cove-800">
                        <link_1.default href="/modulos">
                            <ai_1.AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2"/>
                        </link_1.default>
                        <io_1.IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300"/>
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => router.back()}>CONFIGURACIONES</span>
                        <io_1.IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300"/>
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">CATALOGO</span>
                    </div>
                </div>
                <div className="w-full h-full pb-20">
                    {selectedCategoria === null ? (<div className="text-center">
                        <h1 className="text-4xl font-bold uppercase mb-4">CATEGORÍAS</h1>
                        <div className="h-[calc(100vh-160px)] flex flex-wrap justify-center overflow-y-auto px-6">
                            {!loadingCategoria ? categorias.map((categoria, index) => (<div key={index} className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer" onClick={() => handleCategoriaClick(index)}>
                                    <div className="relative w-full h-full bg-white hover:bg-gray-400 rounded-lg p-4 shadow-md">
                                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                            {categoria.cantidadSubcategorias || 0}
                                        </div>
                                        <div className="text-center mt-2">
                                            <p className="text-md font-bold">{categoria.nombre}</p>
                                        </div>
                                    </div>
                                </div>)) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                            <Loader_1.default />
                        </div>}
                        </div>
                    </div>) : selectedSubcategoria === null ? (<div className="flex flex-wrap justify-center overflow-y-auto">
                            <button className="absolute top-10 right-40 text-4xl" onClick={handleBackClick}>
                                <io5_1.IoCloseSharp />
                            </button>
                            <div className="w-full text-center">
                                <h1 className="text-4xl font-bold uppercase mb-4">{selectedCategoria.nombre}</h1>
                                <div className="h-[calc(100vh-160px)] flex flex-wrap justify-center overflow-y-auto px-6">
                                    {!loadingSubcategoria ? subcategorias.map((subcategoria, index) => (<div key={index} className="relative w-1/6 p-2 transition-all duration-500 transform hover:text-white cursor-pointer" onClick={() => handleSubcategoriaClick(subcategoria)}>
                                            <div className="relative w-full h-full bg-white hover:bg-gray-400 rounded-lg p-4 shadow-md">
                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                    {subcategoria.cantidadItemsCatalogo || 0}
                                                </div>
                                                <div className="text-center mt-2">
                                                    <p className="text-md font-bold">{subcategoria.nombre}</p>
                                                </div>
                                            </div>
                                        </div>)) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                                    <Loader_1.default />
                                </div>}
                                </div>
                            </div>
                        </div>) : (<div className="h-full flex flex-wrap justify-center overflow-y-auto">
                            <button className="absolute top-10 right-40 text-4xl" onClick={handleBackClick}>
                                <io5_1.IoCloseSharp />
                            </button>
                            <div className="w-full text-center">
                                <h1 className="text-4xl font-bold uppercase mb-4"><small>{selectedCategoria.nombre}</small> {selectedSubcategoria.nombre}</h1>
                                <div className="h-[calc(100vh-160px)] flex flex-wrap justify-center overflow-y-auto">
                                    <div className="w-full px-6">
                                        <div className="grid grid-cols-12 gap-4 bg-gray-200 p-4 rounded-t-lg">
                                            <div className="col-span-1 font-bold">Código</div>
                                            <div className="col-span-2 font-bold">Nombre</div>
                                            <div className="col-span-3 font-bold">Descripción</div>
                                            <div className="col-span-2 font-bold">Ficha Técnica</div>
                                            <div className="col-span-2 font-bold">Garantía Anual</div>
                                            <div className="col-span-2 font-bold">Stock Actual</div>
                                        </div>
                                        {!loadingItems ? items.map((item, index) => (<div key={index} className="grid grid-cols-12 gap-4 p-4 border-b">
                                                <div className="col-span-1">{item.codigo}</div>
                                                <div className="col-span-2">{item.nombre}</div>
                                                <div className="col-span-3">{item.descripcion}</div>
                                                <div className="col-span-2">{item.fichaTecnica}</div>
                                                <div className="col-span-2">{item.garantiaAnual}</div>
                                                <div className="col-span-2">{item.stockActual}</div>
                                            </div>)) : <div className="flex justify-center items-center h-[calc(100vh-160px)]">
                                        <Loader_1.default />
                                    </div>}
                                    </div>
                                </div>
                            </div>
                        </div>)}
                </div>
            </div>
        </main>);
}
