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
const currency_1 = __importDefault(require("@/app/utils/currency"));
const md_1 = require("react-icons/md");
const fa_1 = require("react-icons/fa");
const lia_1 = require("react-icons/lia");
const Loader_1 = __importDefault(require("@/components/Loader"));
const react_hook_form_1 = require("react-hook-form");
const Precios = () => {
    const [precios, setPrecios] = (0, react_1.useState)([]);
    const [precioData, setPrecioData] = (0, react_1.useState)({});
    const [editingIndex, setEditingIndex] = (0, react_1.useState)(null);
    const [settingUp, setSettingUp] = (0, react_1.useState)(true);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [categorias, setCategorias] = (0, react_1.useState)([]);
    const [subcategorias, setSubcategorias] = (0, react_1.useState)([]);
    const [categoriaIdSeleccionada, setCategoriaIdSeleccionada] = (0, react_1.useState)(null);
    const { register, setValue } = (0, react_hook_form_1.useForm)();
    const [saving, setSaving] = (0, react_1.useState)(false);
    const fetchCategorias = async () => {
        try {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            console.log("CATEGORIAS", data);
            setCategorias(data);
            setLoading(false);
        }
        catch (error) {
            console.error('Error fetching categorias:', error);
        }
    };
    const fetchSubcategorias = async () => {
        try {
            const response = await fetch('/api/catalogo/subcategoria');
            const data = await response.json();
            console.log("SUBCATEGORIAS", data);
            setSubcategorias(data);
        }
        catch (error) {
            console.error('Error fetching subcategorias:', error);
        }
    };
    const handleValorChange = (e) => {
        // Elimina todo lo que no sea dígito
        const raw = e.target.value.replace(/\D/g, "");
        // Formatea usando tu función utilitaria
        const formatted = (0, currency_1.default)(raw);
        setPrecioData((prev) => (Object.assign(Object.assign({}, prev), { valor: formatted })));
        setValue("valor", formatted);
    };
    (0, react_1.useEffect)(() => {
        const loadInitialData = async () => {
            try {
                await fetchCategorias();
                await fetchSubcategorias();
            }
            catch (error) {
                console.error('Error loading initial data:', error);
            }
            finally {
                setSettingUp(false);
            }
        };
        loadInitialData();
    }, []);
    const handleEdit = async (index, precio) => {
        setEditingIndex(index);
        const precioDataCopy = Object.assign({}, precio);
        if (precio.subcategoriaCatalogoId) {
            let subcategoria = subcategorias.find(s => s._id === precio.subcategoriaCatalogoId);
            let categoriaId = subcategoria.categoriaCatalogoId;
            setCategoriaIdSeleccionada(categoriaId);
            precioDataCopy.categoriaId = categoriaId;
            console.log("Categoria ID:", categoriaId);
            setValue("categoriaId", categoriaId);
            setValue("subcategoriaCatalogoId", precio.subcategoriaCatalogoId);
            setValue("valor", (0, currency_1.default)(precio.valor));
        }
        setPrecioData(precioDataCopy);
    };
    const handleCancel = () => {
        setEditingIndex(null);
        setPrecioData({});
        setCategoriaIdSeleccionada("");
        setValue("categoriaId", "");
        setValue("subcategoriaCatalogoId", "");
        setValue("valor", "");
    };
    const handleSave = async () => {
        setSaving(true);
        const payload = {
            precioId: precioData._id || null,
            categoriaId: precioData.categoriaId,
            subcategoriaCatalogoId: precioData.subcategoriaCatalogoId,
            valor: Number((precioData.valor || "0").replace(/\./g, "")),
            clienteId: precioData.clienteId
        };
        console.log("PAYLOAD", payload);
        return;
        try {
            const response = await fetch('/api/precios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            console.log('data:', data);
            if (data.error) {
                console.error(data.error);
                toast.error(data.error);
            }
        }
        catch (error) {
            console.error('Error saving precio:', error);
        }
        finally {
            setSaving(false);
            handleCancel();
            handleSearch();
        }
    };
    const [searchText, setSearchText] = (0, react_1.useState)('');
    const handleSearch = async () => {
        if (!searchText.trim())
            return;
        setLoading(true);
        try {
            const response = await fetch(`/api/clientes/precios?search=${encodeURIComponent(searchText)}`);
            const data = await response.json();
            if (data.ok && data.clientes) {
                setPrecios(data.clientes);
            }
            else {
                setPrecios([]);
                console.error("Error fetching precios:", data.error);
            }
        }
        catch (error) {
            console.error('Error searching precios:', error);
            setPrecios([]);
        }
        finally {
            setLoading(false);
        }
    };
    // Update the input field's onChange and add keypress event handler
    const handleInputChange = (e) => {
        setSearchText(e.target.value);
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    return (<main className="px-4 h-screen">
            <div className="w-full p-6">
                <div className="flex justify-center w-full mb-8">
                    <div className="w-full max-w-xl">
                        <div className="relative">
                            <input type="text" placeholder="Nombre/RUT/Catalogo" className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" value={searchText} onChange={handleInputChange} onKeyDown={handleKeyPress} disabled={settingUp || loading}/>
                            <md_1.MdSearch className="absolute left-4 top-3.5 text-gray-500" size="1.5rem"/>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto h-[calc(100vh-116px)]">
                    <div>
                        {settingUp ? (<div className="w-full text-center py-10"><Loader_1.default texto="Cargando catálogo"/></div>) : (<>
                                {precios.length > 0 ? (precios.map((cliente, index) => (<div key={`precio_${index}`} className="flex flex-col bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div>
                                                        <p className="text-xl font-semibold">{cliente.nombre} {cliente._id}</p>
                                                        <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                    </div>
                                                </div>
                                                <button type="button" className="flex text-white bg-blue-500 hover:bg-blue-600 rounded-md px-5 py-2.5 text-base" onClick={() => {
                    setEditingIndex(index);
                    setPrecioData({
                        clienteId: cliente.clienteId,
                    });
                    setValue("categoriaId", "");
                    setValue("subcategoriaCatalogoId", "");
                    setValue("precio", "");
                }}>
                                                    <fa_1.FaPlus className="mt-1"/><span className="ml-2">NUEVO PRECIO</span>
                                                </button>
                                            </div>
                                            {cliente.precios && cliente.precios.length > 0 ? (<div className="flex flex-wrap">
                                                    {cliente.precios.map((precio, precioIndex) => {
                        // Buscar nombres reales de categoría y subcategoría
                        const subcategoriaObj = subcategorias.find(s => s._id === precio.subcategoriaCatalogoId);
                        const categoriaObj = categorias.find(c => c._id === subcategoriaObj.categoriaCatalogoId);
                        const categoriaNombre = categoriaObj ? categoriaObj.nombre : '';
                        const subcategoriaNombre = subcategoriaObj ? subcategoriaObj.nombre : '';
                        return (<div key={`precio_${precioIndex}`} className="relative flex justify-between items-start mt-4 py-1 px-4 border rounded-md w-full md:w-1/2 lg:w-1/3">
                                                                <div className="flex flex-col items-start w-full">
                                                                    <button className="absolute top-3 right-3 text-blue-500 hover:text-blue-600 text-lg" onClick={() => handleEdit(`${index}_${precioIndex}`, precio)}>
                                                                        <fa_1.FaPencilAlt />
                                                                    </button>
                                                                    <div className="flex justify-between w-full">
                                                                        <div className="mr-12 border rounded px-2">
                                                                            <span className="text-2xl font-bold">{categoriaNombre}&nbsp;</span>
                                                                            <span className="text-lg text-gray-600">{subcategoriaNombre}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                </div>
                                                                <div className="flex flex-col mr-12">
                                                                    <span className="text-base bg-slate-700 text-white rounded-md py-1.5 pl-2 pr-1">
                                                                        {precio.unidad === 'porcentaje' ? `${precio.valor || 0}%` : `$${(0, currency_1.default)(precio.valor || 0)}`}
                                                                    </span>
                                                                    <p className="text-right text-sm text-gray-500">{new Date(precio.fechaDesde).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                                                                </div>
                                                            </div>);
                    })}
                                                </div>) : (<div className="flex justify-center py-0">
                                                    <p className="text-xl -mt-8 ml-4 uppercase">Sin precios</p>
                                                </div>)}
                                        </div>))) : (<div className="flex justify-center py-10">
                                        {loading ? <Loader_1.default texto="Cargando listado de precios"/> : <p className="text-2xl mt-2 ml-4 uppercase">Sin resultados</p>}
                                    </div>)}
                            </>)}
                    </div>
                </div>
            </div>

            {editingIndex !== null && (<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-1/4 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="absolute top-2 right-2">
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none" aria-label="Cerrar" type="button">
                        <lia_1.LiaTimesSolid />
                        </button>
                    </div>
                        <div className="text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {typeof editingIndex === 'number' ? 'Nuevo Precio' : 'Editar Precio'}
                            </h3>
                            <div className="mt-2">
                                <div className="mt-4 space-y-3 text-left">
                                    <div className="flex flex-col">
                                        <label htmlFor="categoriaId" className="text-sm text-gray-500">Categoría</label>
                                        <select {...register("categoriaId")} value={categoriaIdSeleccionada || ""} onChange={async (e) => {
                const categoriaId = e.target.value;
                setPrecioData((prev) => (Object.assign(Object.assign({}, prev), { categoriaId, subcategoriaCatalogoId: "" })));
                setCategoriaIdSeleccionada(categoriaId);
                setValue("categoriaId", categoriaId);
                setValue("subcategoriaCatalogoId", "");
                if (categoriaId) {
                    await fetchSubcategorias(categoriaId);
                }
                else {
                    setSubcategorias([]);
                }
            }} className="border rounded-md px-3 py-2 text-base">
                                            <option value="">Seleccione una categoría</option>
                                            {categorias && categorias.map((categoria) => (<option key={categoria._id} value={categoria._id}>
                                                    {categoria.nombre}
                                                </option>))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label htmlFor="subcategoriaId" className="text-sm text-gray-500">Subcategoría</label>
                                        <select {...register("subcategoriaCatalogoId")} value={precioData.subcategoriaCatalogoId || ""} onChange={(e) => {
                setPrecioData((prev) => (Object.assign(Object.assign({}, prev), { subcategoriaCatalogoId: e.target.value })));
                setValue("subcategoriaCatalogoId", e.target.value);
            }} className="border rounded-md px-3 py-2 text-base">
                                            <option value="">Seleccione una subcategoría</option>
                                            {subcategorias &&
                subcategorias.map((subcategoria) => (<option key={subcategoria._id} value={subcategoria._id}>
                                                        {subcategoria.nombre}
                                                    </option>))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label htmlFor="valor" className="text-sm text-gray-500">Valor (CLP)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                                            <input {...register("valor", { required: true })} type="text" name="valor" value={precioData.valor ? (0, currency_1.default)(precioData.valor) : ''} onChange={handleValorChange} className="border rounded-md px-8 py-2 text-base w-full" placeholder="999.999.999" inputMode="numeric" autoComplete="off"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <button onClick={() => {
                handleSave();
            }} disabled={loading} className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {saving && <div className="absolute -mt-1"><Loader_1.default texto=""/></div>}
                                    GUARDAR
                                </button>
                                <button onClick={handleCancel} disabled={loading} className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>)}
        </main>);
};
exports.default = Precios;
