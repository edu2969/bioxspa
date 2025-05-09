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
const react_1 = __importStar(require("react"));
const link_1 = __importDefault(require("next/link"));
const ai_1 = require("react-icons/ai");
const io_1 = require("react-icons/io");
const md_1 = require("react-icons/md");
const fa_1 = require("react-icons/fa");
const Loader_1 = __importDefault(require("@/components/Loader"));
const currency_1 = __importDefault(require("@/app/utils/currency"));
const Precios = () => {
    const [precios, setPrecios] = (0, react_1.useState)([]);
    const [precioData, setPrecioData] = (0, react_1.useState)({});
    const [clientes] = (0, react_1.useState)([]);
    const [sucursales, setSucursales] = (0, react_1.useState)([]);
    const [dependencias, setDependencias] = (0, react_1.useState)([]);
    const [editingIndex, setEditingIndex] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        fetchPrecios();
        fetchSucursales();
    }, []);
    const fetchPrecios = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/precios');
            const data = await response.json();
            setPrecios(data);
            console.log("PRECIOS", data);
        }
        catch (error) {
            console.error('Error fetching usuarios:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchSucursales = async () => {
        try {
            const response = await fetch('/api/sucursales');
            const data = await response.json();
            setSucursales(data);
        }
        catch (error) {
            console.error('Error fetching sucursales:', error);
        }
    };
    const fetchDependencias = async (sucursalId) => {
        try {
            const response = await fetch(`/api/sucursales/dependencias?id=${sucursalId}`);
            const data = await response.json();
            setDependencias(data);
        }
        catch (error) {
            console.error('Error fetching dependencias:', error);
        }
    };
    const handleEdit = (index, precio) => {
        setEditingIndex(index);
        setPrecioData(precio);
        if (precio.sucursalId) {
            fetchDependencias(precio.sucursalId);
        }
    };
    const handleCancel = () => {
        setEditingIndex(null);
        setPrecioData({});
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setPrecioData((prev) => (Object.assign(Object.assign({}, prev), { [name]: value })));
        if (name === 'sucursalId') {
            fetchDependencias(value);
        }
    };
    const handleSave = async (userId) => {
        try {
            const response = await fetch('/api/precios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(Object.assign({}, precioData), { userId })),
            });
            const data = await response.json();
            console.log('data:', data);
            if (data.error) {
                console.error(data.error);
            }
            else {
                fetchUsuarios();
                handleCancel();
            }
        }
        catch (error) {
            console.error('Error saving precio:', error);
        }
    };
    return (<main className="px-6 h-screen overflow-y-scroll">
            <div className="w-full p-6">
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg p-2">
                    <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4 bg-white dark:bg-gray-900">
                        <div className="flex items-center space-x-4 text-ship-cove-800 pt-4">
                            <link_1.default href="/modulos">
                                <ai_1.AiFillHome size="1.4rem" className="text-gray-700 dark:text-gray-300 ml-2"/>
                            </link_1.default>
                            <io_1.IoIosArrowForward size="1.5rem" className="text-gray-700 dark:text-gray-300"/>
                            <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">PRECIOS</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <input type="text" placeholder="Buscar usuarios..." className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                <md_1.MdSearch className="absolute left-3 top-2.5 text-gray-500" size="1.2rem"/>
                            </div>
                        </div>
                    </div>
                    <div>
                        {loading ? (<Loader_1.default />) : (<>
                                {precios.length > 0 ? (precios.map((cliente, index) => (<div key={`cliente_${index}`} className="flex flex-col bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div>
                                                        <p className="text-lg font-semibold">{cliente.cliente.nombre}</p>
                                                        <p className="text-sm text-gray-500">{cliente.cliente.rut}</p>
                                                    </div>
                                                </div>
                                                <button type="button" className="flex text-white bg-blue-500 hover:bg-blue-600 rounded-md px-4 py-2" onClick={() => handleEdit(index, Object.assign({}, cliente))}>
                                                    <fa_1.FaPlus className="mt-1"/><span className="ml-2">NUEVO PRECIO</span>
                                                </button>
                                            </div>
                                            {cliente.precios && cliente.precios.length > 0 ? (<div className="flex flex-wrap">
                                                    {cliente.precios.map((precio, precioIndex) => {
                        var _a;
                        return (<div key={`precio_${precioIndex}`} className="relative flex flex-col justify-between items-start mt-4 p-2 border rounded-md w-full md:w-1/2 lg:w-1/3">
                                                            {editingIndex === `${index}_${precioIndex}` ? (<div className="flex flex-col space-y-2">
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="fechaDesde">Fecha Desde</label>
                                                                        <input type="date" name="fechaDesde" value={precioData.fechaDesde || new Date().toISOString().split('T')[0]} onChange={handleChange} className="border rounded-md px-3 py-1"/>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="fechaHasta">Fecha Hasta</label>
                                                                        <input type="date" name="fechaHasta" value={precioData.fechaHasta} onChange={handleChange} className="border rounded-md px-3 py-1"/>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="clienteId">Cliente</label>
                                                                        <select name="clienteId" value={precioData.clienteId} onChange={handleChange} className="border rounded-md px-3 py-1">
                                                                            <option value="">Seleccione un cliente</option>
                                                                            {clientes.length && clientes.map((cliente) => (<option key={cliente._id} value={cliente._id}>{cliente.nombre}</option>))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="sucursalId">Sucursal</label>
                                                                        <select name="sucursalId" value={precioData.sucursalId} onChange={handleChange} className="border rounded-md px-3 py-1">
                                                                            <option value="">Seleccione una sucursal</option>
                                                                            {sucursales.length && sucursales.map((sucursal) => (<option key={sucursal._id} value={sucursal._id}>{sucursal.nombre}</option>))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="dependenciaId">Dependencia</label>
                                                                        <select name="dependenciaId" value={precioData.dependenciaId} onChange={handleChange} className="border rounded-md px-3 py-1">
                                                                            <option value="">Seleccione una dependencia</option>
                                                                            {dependencias.length && dependencias.map((dependencia) => (<option key={dependencia._id} value={dependencia._id}>{dependencia.nombre}</option>))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="unidad">Unidad</label>
                                                                        <select name="unidad" value={precioData.unidad} onChange={handleChange} className="border rounded-md px-3 py-1">
                                                                            <option value="">Seleccione una unidad</option>
                                                                            <option value="porcentaje">Porcentaje</option>
                                                                            <option value="monto">Monto</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <label htmlFor="valor">Valor</label>
                                                                        <input type="number" step="0.1" name="valor" value={precioData.valor} onChange={handleChange} className="border rounded-md px-3 py-1"/>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2 mt-4">
                                                                        <button type="button" className="ml-4 text-green-600 text-xl hover:bg-green-500 hover:text-white rounded-md p-2" onClick={() => handleSave(usuario._id)}>
                                                                            <fa_1.FaCheck />
                                                                        </button>
                                                                        <button type="button" className="ml-4 text-red-600 text-xl hover:bg-red-100 rounded-md p-2" onClick={handleCancel}>
                                                                            <fa_1.FaTimes />
                                                                        </button>
                                                                    </div>
                                                                </div>) : (<div className="flex flex-col items-start space-y-2">
                                                                    <button className="absolute top-3 right-3 text-blue-500 hover:text-blue-600" onClick={() => handleEdit(`${index}_${precioIndex}`, precio)}>
                                                                        <fa_1.FaPencilAlt />
                                                                    </button>
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-sm bg-slate-700 text-white rounded-md py-1 pl-2 pr-1">
                                                                            {precio.unidad === 'porcentaje' ? `${precio.valor || 0}%` : `$${(0, currency_1.default)(precio.valor || 0)}`}
                                                                        </span>
                                                                        <span> {precio.categoriaItemNombre} {precio.subcategoriaItemNombre}</span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500">{(_a = precio.cliente) === null || _a === void 0 ? void 0 : _a.nombre}</p>
                                                                    {precio.fechaDesde && <span className="text-xs text-gray-500">De {new Date(precio.fechaDesde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })} a {new Date(precio.fechaHasta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}</span>}
                                                                </div>)}
                                                        </div>);
                    })}
                                                </div>) : (<div className="flex justify-center py-0">
                                                    <p className="text-xl -mt-8 ml-4 uppercase">Sin precios</p>
                                                </div>)}
                                        </div>))) : (<div className="flex justify-center py-10">
                                        <p className="text-xl mt-2 ml-4 uppercase">Sin resultados</p>
                                    </div>)}
                            </>)}
                    </div>
                </div>
            </div>
        </main>);
};
exports.default = Precios;
