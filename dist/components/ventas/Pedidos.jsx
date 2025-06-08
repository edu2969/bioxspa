"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Pedidos;
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const navigation_1 = require("next/navigation");
const fa_1 = require("react-icons/fa");
const idetificationDocument_1 = __importDefault(require("@/app/utils/idetificationDocument"));
const constants_1 = require("@/app/utils/constants");
const react_toastify_1 = require("react-toastify");
require("react-toastify/dist/ReactToastify.css");
const bi_1 = require("react-icons/bi");
const TIPO_GUIA = [
    { value: 0, label: "Seleccione tipo de guia" },
    { value: 1, label: "Operacion constituye venta" },
    { value: 2, label: "Venta por efectuar" },
    { value: 3, label: "Consignaciones" },
    { value: 4, label: "Entrega gratuita" },
    { value: 5, label: "Traslados internos" },
    { value: 6, label: "Otros traslados no venta" },
    { value: 7, label: "Guia de devolución" }
];
const TIPO_REGISTRO = [
    { value: 1, label: "Venta" },
    { value: 2, label: "Cotizacion" },
    { value: 3, label: "OT" },
    { value: 4, label: "Venta Firmada" }
];
function Pedidos({ session }) {
    const router = (0, navigation_1.useRouter)();
    const { register, handleSubmit, setValue } = (0, react_hook_form_1.useForm)();
    const [usuarios, setUsuarios] = (0, react_1.useState)([]);
    const [precios, setPrecios] = (0, react_1.useState)([]);
    const [loadingForm, setLoadingForm] = (0, react_1.useState)(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = (0, react_1.useState)([]);
    const [clienteSelected, setClienteSelected] = (0, react_1.useState)(null);
    const [itemsVenta, setItemsVenta] = (0, react_1.useState)([]);
    const [documentosTributarios, setDocumentosTributarios] = (0, react_1.useState)([]);
    const [documentoTributarioSeleccionado, setDocumentoTributarioSeleccionado] = (0, react_1.useState)(null);
    const [registroSelected, setRegistroSelected] = (0, react_1.useState)(0);
    const [total, setTotal] = (0, react_1.useState)(0);
    const isCreateVentaDisabled = itemsVenta.some(item => !item.precio || parseInt(item.precio) <= 0);
    const fetchUsuarios = async () => {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsuarios(data.users);
        console.log("USERS", data.users);
    };
    const fetchDocumentosTributarios = async () => {
        const response = await fetch('/api/ventas/documentostributarios?venta=true');
        const data = await response.json();
        setDocumentosTributarios(data.documentosTributarios);
    };
    const onSubmit = async (data) => {
        console.log("DATA-SUBMIT", data);
        const payload = {
            clienteId: clienteSelected === null || clienteSelected === void 0 ? void 0 : clienteSelected._id,
            sucursalId: data.sucursalId,
            dependenciaId: data.dependenciaId,
            usuarioId: data.usuarioId,
            documentoTributarioId: data.documentoTributarioId,
            items: itemsVenta.map(item => ({
                cantidad: parseInt(item.cantidad),
                precio: parseInt(item.precio),
                subcategoriaId: item.subcategoriaId
            })),
        };
        console.log("PAYLOAD2", payload);
        setLoadingForm(true);
        try {
            await fetch('/api/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            router.back();
        }
        catch (error) {
            console.error(error);
            react_toastify_1.toast.error("Ocurrió un error al crear la venta. Por favor, inténtelo más tarde.", {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
        finally {
            setLoadingForm(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchUsuarios();
        fetchDocumentosTributarios();
    }, []);
    (0, react_1.useEffect)(() => {
        if (session && session.user && session.user.id) {
            setValue('usuarioId', session.user.id);
        }
    }, [usuarios, session, setValue]);
    (0, react_1.useEffect)(() => {
        const newTotal = itemsVenta.reduce((acc, item) => {
            const cantidad = parseInt(item.cantidad) || 0;
            const precio = parseInt(item.precio) || 0;
            return acc + (cantidad * precio);
        }, 0);
        setTotal(newTotal);
    }, [itemsVenta, total]);
    return (<main className="w-full h-screen pt-14 overflow-y-auto">            
            <div className="w-full pb-12 pt-0">
                <div className="mx-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="px-8 space-y-6">
                        <div className="w-full flex">
                            <div className="w-9/12">
                                <div className="w-full flex">
                                    <div className="w-4/12 pr-4">
                                        <label htmlFor="usuarioId" className="block text-sm font-medium text-gray-700">Usuario</label>
                                        <select id="usuarioId" {...register('usuarioId')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione un usuario</option>
                                            {usuarios.length && usuarios.map(usuario => (<option key={usuario._id} value={usuario._id}>{usuario.name}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex mt-3">
                                    <div className="w-4/12 relative pr-4">
                                        <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
                                            Cliente
                                            {clienteSelected != null && clienteSelected.enQuiebra && <span className="bg-orange-600 text-white rounded-md py-0 px-2 text-xs mx-1">EN QUIEBRA</span>}
                                        </label>
                                        <input id="cliente" {...register('cliente')} type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" onChange={(e) => {
            const value = e.target.value;
            if (value.length > 2) {
                fetch(`/api/clientes/search?q=${value}`)
                    .then(response => response.json())
                    .then(data => setAutocompleteClienteResults(data.clientes));
            }
        }}/>
                                        {autocompleteClienteResults.length > 0 && (<ul className="absolute z-10 w-full border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white">
                                                {autocompleteClienteResults.map(cliente => (<li key={cliente._id} className="px-3 py-2 cursor-pointer hover:bg-gray-200" onClick={() => {
                    var _a;
                    setValue('cliente', cliente.nombre);
                    setClienteSelected(cliente);
                    setAutocompleteClienteResults([]);
                    if (cliente.documentoTributarioId) {
                        setValue("documentoTributarioId", (_a = documentosTributarios.find(documento => documento._id == cliente.documentoTributarioId)) === null || _a === void 0 ? void 0 : _a._id);
                    }
                    if (cliente.ordenCompra == true) {
                        setValue("tipoRegistro", 3);
                        setRegistroSelected(3);
                    }
                    fetch(`/api/clientes/precios?clienteId=${cliente._id}`)
                        .then(response => response.json())
                        .then(data => {
                        console.log("PRECIOS", data);
                        if (data.ok) {
                            setPrecios(data.precios.precios);
                        }
                        else {
                            console.error("Error fetching precios:", data.error);
                            react_toastify_1.toast.error("Error al cargar los precios del cliente.", {
                                position: "top-right",
                                autoClose: 5000,
                                hideProgressBar: false,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                                progress: undefined,
                            });
                        }
                    })
                        .catch(error => {
                        console.error("Fetch error:", error);
                        react_toastify_1.toast.error("Error al cargar los precios del cliente.", {
                            position: "top-right",
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                        });
                    });
                }}>
                                                        <p>{cliente.nombre}</p>
                                                        <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                    </li>))}
                                            </ul>)}
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <label htmlFor="documentoTributarioId" className="block text-sm font-medium text-gray-700">Documento Tributario</label>
                                        <select id="documentoTributarioId" {...register('documentoTributarioId')} onChange={(e) => {
            setDocumentoTributarioSeleccionado(documentosTributarios.find(documento => documento._id == e.target.value));
        }} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione un documento</option>
                                            {documentosTributarios.length && documentosTributarios.map(documento => (<option key={documento._id} value={documento._id}>{documento.nombre}</option>))}
                                        </select>
                                    </div>
                                    {documentoTributarioSeleccionado != null && documentoTributarioSeleccionado.nombre.startsWith("Guia") && <div className="w-3/12 pr-4">
                                        <label htmlFor="tipoGuia" className="block text-sm font-medium text-gray-700">Motivo guía</label>
                                        <select name="detalleguiadespacho" {...register('tipoGuia', { valueAsNumber: true })} id="detalleguiadespacho" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            {TIPO_GUIA.map((guia) => (<option key={guia.value} value={guia.value}>{guia.label}</option>))}
                                        </select>
                                    </div>}
                                    <div className="w-3/12 pr-4">
                                        <label htmlFor="tipoRegistro" className="block text-sm font-medium text-gray-700">Registro</label>
                                        <select name="tipoRegistro" id="tipoRegistro" {...register('tipoRegistro', { valueAsNumber: true })} onChange={(e) => {
            setRegistroSelected(e.target.value);
        }} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            {TIPO_REGISTRO.map((registro) => (<option key={registro.value} value={registro.value}>{registro.label}</option>))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="w-3/12 text-center">
                                {clienteSelected != null && (<div className="mt-1">
                                    <p className="text-lg font-bold">{clienteSelected.nombre}</p>
                                    <p className="text-sm font-semibold">
                                        {clienteSelected.tipoPrecio == constants_1.TIPO_PRECIO.mayorista ? <span className="bg-green-600 text-white rounded-md py-1 px-2 text-xs mr-2">MAYORISTA</span>
                : <span className="bg-orange-600 text-white rounded-md py-1 px-2 text-xs mx-2">MINORISTA</span>}
                                        &nbsp;{(0, idetificationDocument_1.default)(clienteSelected.rut)}</p>
                                    <p className="text-gray-400 text-xs mt-2">{clienteSelected.credito ? "CON" : "SIN"}&nbsp;CREDITO / {clienteSelected.arriendo ? "CON" : "SIN"}&nbsp;ARRIENDO</p>
                                </div>)}
                            </div>
                        </div>


                        {registroSelected == 3 && <div className="w-full flex mt-3">
                            <div className="w-1/12 pr-4">
                                <label htmlFor="permanente" className="block text-sm font-medium text-gray-700">Permanente</label>
                                <input id="permanente" type="checkbox" {...register('permanente')} className="block w-6 h-6 m-2 mt-3"/>
                            </div>

                            <div className="w-3/12 pr-4">
                                <label htmlFor="patente" className="block text-sm font-medium text-gray-700">Patente</label>
                                <input id="patente" {...register('patente')} type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm uppercase"/>
                            </div>
                            <div className="w-3/12 pr-4">
                                <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo</label>
                                <select id="motivo" {...register('motivo')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                    <option value="">Seleccione motivo</option>
                                    <option value="1">Prueba hidrostática</option>
                                    <option value="2">Cambio de Válvula</option>
                                    <option value="3">Prueba hidrostática y cambio de válvula</option>
                                    <option value="4">Recarga cilindros</option>
                                </select>
                            </div>
                            <div className="w-6/12 pr-4">
                                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción</label>
                                <textarea id="descripcion" {...register('descripcion')} rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"></textarea>
                            </div>
                        </div>}

                        <div className={`w-full ${clienteSelected != null ? '' : 'opacity-20'}`}>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg">PRECIOS CARGADOS</p>                                
                            </div>
                            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase">
                                <div className="w-2/12 pr-4">
                                    <p className="font-bold text-sm">Cantidad</p>
                                </div>
                                <div className="w-4/12 pr-4">
                                    <p className="font-bold text-sm">ITEM</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold text-sm text-center">Precio</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold text-sm text-center">SubTotal</p>
                                </div>
                            </div>
                            {precios.map((precio, index) => (<div key={`precio_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-4 bg-gray-100 ${precios[index].seleccionado == true ? '' : 'opacity-50'}`}>
                                    <div className="w-2/12 pr-4">
                                        <div className="flex items-center">
                                            <input id={`checkbox-${index}`} type="checkbox" className="block w-8 h-8 mr-4" onClick={(e) => {
                const updatedPrecios = [...precios];
                updatedPrecios[index].seleccionado = e.target.checked;
                updatedPrecios[index].cantidad = e.target.checked ? 1 : 0;
                setValue(`precios[${index}].cantidad`, e.target.checked ? 1 : 0);
                console.log("PRECIOS", updatedPrecios);
                setPrecios(updatedPrecios);
            }} {...register(`precios[${index}].seleccionado`)}/>
                                            <input id={`precios-${index}`} {...register(`precios[${index}].cantidad`)} type="number" min={0} max={99} defaultValue={precio.cantidad || 0} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right" onChange={(e) => {
                const newCantidad = parseInt(e.target.value) || 0;
                const updatedPrecios = [...precios];
                updatedPrecios[index].cantidad = newCantidad;
                setPrecios(updatedPrecios);
            }}/>
                                        </div>                                        
                                    </div>
                                    <div className="w-4/12 pr-4">
                                        {precio.nombre}                                      
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <div className="flex">
                                            <span className="font-bold mt-2 px-4">$</span>
                                            <span className="w-full font-bold text-sm text-right mt-2">
                                                {(precios[index].valor || 0).toLocaleString('es-CL')}
                                            </span>                                           
                                        </div>
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <div className="flex">
                                            <span className="font-bold mt-2 px-4">$</span>
                                            <span className="w-full font-bold text-sm text-right mt-2">
                                                {(precios[index].cantidad * precios[index].valor || 0).toLocaleString('es-CL')}
                                            </span>
                                        </div>
                                    </div>
                                </div>))}
                            <div className="w-full flex justify-end mt-4">
                                <button type="button" disabled={!precios.some(precio => precio.seleccionado)} className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" onClick={() => {
            const selectedItems = precios.filter(precio => precio.seleccionado);
            console.log("ITEM", selectedItems);
            const updatedItemsVenta = selectedItems.map(item => ({
                cantidad: item.cantidad || 1,
                subcategoriaId: item.subcategoriaCatalogoId,
                subcategoria: item.nombre,
                precio: item.valor
            }));
            setItemsVenta(prev => [...prev, ...updatedItemsVenta]);
        }}>
                                    <div className="flex">
                                        <bi_1.BiCartDownload size="1.25rem" className="text-white mr-2"/> 
                                        <span className="text-sm font-semibold">CARGAR SELECCIONADOS</span>
                                    </div>                                    
                                </button>
                            </div>
                        </div>


                        <div className={`w-full ${clienteSelected != null ? '' : 'opacity-20'}`}>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg">DETALLE</p>                                
                            </div>
                            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase">
                                <div className="w-1/12 pr-4">
                                    <p className="font-bold text-sm">Cantidad</p>
                                </div>
                                <div className="w-5/12 pr-4">
                                    <p className="font-bold text-sm">ITEM</p>
                                </div>
                                <div className="w-2/12 pr-4">
                                    <p className="font-bold text-sm text-center">Precio</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold text-sm text-center">Subtotal</p>
                                </div>
                                <div className="w-1/12 flex justify-center items-right">
                                    <p className="font-bold text-sm">Acciones</p>
                                </div>
                            </div>
                            {itemsVenta.map((item, index) => (<div key={`itemVenta_${index}`} className="w-full flex items-center bg-green-200 mb-0.5 py-1 px-4">
                                    <div className="w-1/12 pr-4">
                                        <input id={`cantidad-${index}`} {...register(`itemsVenta[${index}].cantidad`)} type="number" min={1} max={99} defaultValue={item.cantidad} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm" onChange={(e) => {
                const newCantidad = parseInt(e.target.value) || 0;
                const updatedItems = [...itemsVenta];
                updatedItems[index].cantidad = newCantidad;
                setItemsVenta(updatedItems);
            }}/>
                                    </div>
                                    <div className="w-5/12 pr-4">
                                        {item.subcategoria}
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <div className="flex">
                                            <span className="font-bold mt-2 px-4">$</span>
                                            <input id={`precio-${index}`} {...register(`itemsVenta[${index}].precio`)} type="text" value={item.precio.toLocaleString('es-CL')} onChange={(e) => {
                const value = e.target.value.replace(/\./g, '');
                const numericValue = parseInt(value, 10) || 0;
                const updatedItems = [...itemsVenta];
                updatedItems[index].precio = numericValue;
                setItemsVenta(updatedItems);
            }} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right ${itemsVenta[index].precioError ? 'border-red-500' : 'border-gray-300'}`}/>
                                        </div>
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <div className="flex">
                                            <span className="font-bold mt-2 px-4">$</span>
                                            <span className="w-full font-bold text-sm text-right mt-2">
                                                {(itemsVenta[index].cantidad * itemsVenta[index].precio || 0).toLocaleString('es-CL')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-1/12 flex justify-center">
                                        <button type="button" className="bg-red-400 text-white hover:bg-red-200 hover:text-red-800 rounded-md px-2 py-2" onClick={() => setItemsVenta(itemsVenta.filter((_, i) => i !== index))}>
                                            <fa_1.FaTrashAlt />
                                        </button>
                                    </div>
                                </div>))}
                            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-0.5 rounded-b-md uppercase">
                                <div className="w-8/12 pr-4">
                                    <p className="font-bold text-sm">Total</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <div className="flex">
                                        <span className="text-xl font-bold px-4">$</span>
                                        <span className="w-full font-bold text-xl text-right">
                                            {itemsVenta.reduce((acc, item) => {
            const cantidad = parseInt(item.cantidad) || 0;
            const precio = parseInt(("" + item.precio).replace(/\./g, '')) || 0;
            return acc + (cantidad * precio);
        }, 0).toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-1/12"></div>
                            </div>
                            <div className="w-full flex mt-6 justify-end">
                                <button className="flex w-3/12 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1" onClick={(e) => {
            e.preventDefault();
            router.back();
        }}>VOLVER Y CANCELAR</button>
                                <button className={`flex w-3/12 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1 ${isCreateVentaDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} type="submit" disabled={isCreateVentaDisabled || loadingForm}>
                                    CREAR VENTA
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>            
            <react_toastify_1.ToastContainer />
        </main>);
}
