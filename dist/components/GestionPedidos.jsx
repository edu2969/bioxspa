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
exports.default = GestionPedidos;
const react_1 = __importStar(require("react"));
const lia_1 = require("react-icons/lia");
const react_toastify_1 = require("react-toastify");
require("react-toastify/dist/ReactToastify.css");
const socket_client_1 = require("@/lib/socket-client");
const Loader_1 = __importDefault(require("./Loader"));
const io_1 = require("react-icons/io");
const fa_1 = require("react-icons/fa");
function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function amountFormat(num) {
    if (!num && num !== 0)
        return "";
    return num.toLocaleString("es-CL");
}
function GestionPedidos({ session }) {
    var _a, _b, _c, _d;
    const [pedidoEdit, setPedidoEdit] = (0, react_1.useState)(null);
    const [pedido, setPedido] = (0, react_1.useState)({});
    const [items, setItems] = (0, react_1.useState)([]);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [pedidos, setPedidos] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const fetchPedidos = (0, react_1.useCallback)(async () => {
        const res = await fetch("/api/pedidos/borradores");
        if (res.ok) {
            const data = await res.json();
            setPedidos(data.pedidos);
            setLoading(false);
        }
        else {
            console.error("Error al obtener pedidos");
        }
    }, []);
    const handleOpenPedido = (pedidoData) => {
        setPedidoEdit(pedidoData._id);
        setPedido(pedidoData);
        // Deep copy de items, asegurando que los precios vacíos sean string vacío
        setItems(pedidoData.items.map(item => (Object.assign(Object.assign({}, item), { precio: item.precio !== undefined && item.precio !== null ? Number(item.precio) : "" }))));
    };
    const handlePrecioChange = (idx, value) => {
        const clean = value.replace(/\D/g, "");
        const newItems = [...items];
        // Si el input está vacío, deja string vacío, si no, número
        newItems[idx].precio = clean === "" ? "" : Number(clean);
        setItems(newItems);
    };
    const allPreciosOk = items.length > 0 && items.every((item) => item.precio !== "" && Number(item.precio) > 0);
    const handleSave = async () => {
        console.log("Guardando pedido con items:", items);
        setSaving(true);
        try {
            // MODIFICACIÓN: Asegura que cada item tenga el identificador correcto
            const precios = items
                .map(item => {
                // Busca el identificador de subcategoría en el item
                const subcategoriaId = item.subcategoriaId ||
                    item.subcategoriaCatalogoId ||
                    item.subcategoria_id ||
                    item.subcatId ||
                    null;
                return {
                    subcategoriaId,
                    precio: Number(item.precio)
                };
            });
            console.log("Precios a enviar:", precios);
            if (!precios.length) {
                react_toastify_1.toast.error("Debe ingresar todos los precios antes de aprobar.");
                setSaving(false);
                return;
            }
            const res = await fetch("/api/pedidos/borradores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ventaId: pedidoEdit,
                    precios
                })
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                react_toastify_1.toast.success("Pedido aprobado correctamente");
                setPedidoEdit(null);
                setItems([]);
                fetchPedidos();
            }
            else {
                react_toastify_1.toast.error(data.error || "Error al aprobar pedido");
            }
        }
        catch (_a) {
            react_toastify_1.toast.error("Error de red al aprobar pedido");
        }
        finally {
            setSaving(false);
        }
    };
    const onClose = () => {
        setPedidoEdit(null);
        setItems([]);
    };
    (0, react_1.useEffect)(() => {
        fetchPedidos();
    }, [fetchPedidos]);
    (0, react_1.useEffect)(() => {
        socket_client_1.socket.on("update-pedidos", fetchPedidos);
        return () => {
            socket_client_1.socket.off("update-pedidos", fetchPedidos);
        };
    }, [fetchPedidos]);
    // Efecto para unirse a la sala al cargar el componente
    (0, react_1.useEffect)(() => {
        var _a;
        // Verifica si hay sesión y el socket está conectado
        if (((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id) && socket_client_1.socket.connected) {
            console.log("Re-uniendo a room-pedidos después de posible recarga");
            socket_client_1.socket.emit("join-room", {
                room: "room-pedidos",
                userId: session.user.id
            });
        }
        // Evento para manejar reconexiones del socket
        const handleReconnect = () => {
            var _a;
            if ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id) {
                console.log("Socket reconectado, uniendo a sala nuevamente");
                socket_client_1.socket.emit("join-room", {
                    room: "room-pedidos",
                    userId: session.user.id
                });
            }
        };
        // Escucha el evento de reconexión
        socket_client_1.socket.on("connect", handleReconnect);
        return () => {
            socket_client_1.socket.off("connect", handleReconnect);
        };
    }, [session]);
    return (<main className="px-4 py-8 h-screen bg-gray-50">
            <h1 className="text-2xl font-bold mb-8 text-center">Gestión de Pedidos</h1>
            {!loading && <div className="flex flex-wrap gap-6">
                {pedidos.map((pedido) => (<div key={pedido._id} className="w-full sm:w-1/3 max-w-[420px] flex-1 min-w-[300px] space-y-6 cursor-pointer" onClick={() => handleOpenPedido(pedido)}>
                        <div data-edit-pedido data-id={pedido._id} className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-lg hover:scale-105 transition">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <p className="font-semibold text-lg">{pedido.cliente.nombre}</p>
                                    <p className="text-xs text-gray-500">{pedido.cliente.rut}</p>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                                    {formatFecha(pedido.fecha)}
                                </span>
                            </div>
                            <div className="mb-2">
                                <p className="text-sm font-medium text-gray-700 mb-1">Solicitante:</p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="font-semibold">{pedido.solicitante.nombre}</span>
                                    <span>|</span>
                                    <span>{pedido.solicitante.telefono}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Pedido:</p>
                                <ul className="space-y-1">
                                    {pedido.items.map((item, idx2) => (<li key={idx2} className="flex justify-between items-center text-sm">
                                            <span>
                                                {item.cantidad} x {item.producto} {item.capacidad}
                                            </span>
                                            <span className="ml-2 flex items-center">
                                                {idx2 === 1 && item.precio !== undefined && (<span className="mr-1 text-red-600 text-lg">
                                                        <io_1.IoMdAlert />
                                                    </span>)}
                                                {item.precio !== undefined ? (<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                        ${amountFormat(item.precio)}
                                                    </span>) : (<span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                        Sin precio
                                                    </span>)}
                                            </span>
                                        </li>))}
                                </ul>
                            </div>
                        </div>
                    </div>))}
            </div>}

            {pedidoEdit && (<div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={onClose} aria-label="Cerrar" type="button">
                            <lia_1.LiaTimesSolid />
                        </button>
                        <h2 className="text-xl font-bold mb-2 text-center">Editar Pedido</h2>
                        <div className="mb-4">
                            <div className="mb-1 text-sm text-gray-700 font-semibold">{(_a = pedido.cliente) === null || _a === void 0 ? void 0 : _a.nombre}</div>
                            <div className="text-xs text-gray-500">{(_b = pedido.cliente) === null || _b === void 0 ? void 0 : _b.rut}</div>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm font-medium text-gray-700 mb-1">Solicitante:</div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="font-semibold">{(_c = pedido.solicitante) === null || _c === void 0 ? void 0 : _c.nombre}</span>
                                <span>|</span>
                                <span>{(_d = pedido.solicitante) === null || _d === void 0 ? void 0 : _d.telefono}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Productos:</div>
                            <div className="overflow-x-auto rounded border border-gray-200 bg-gray-50">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700">
                                            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                                            <th className="px-3 py-2 text-left font-semibold">Producto</th>
                                            <th className="px-3 py-2 text-right font-semibold">Precio unitario</th>
                                            <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                const isMissing = item.precio === "" || Number(item.precio) <= 0;
                const precioNum = item.precio === "" ? 0 : Number(item.precio);
                const subtotal = precioNum * Number(item.cantidad);
                return (<tr key={idx} className="border-t border-gray-200">
                                                    <td className="px-3 py-2 text-right">{item.cantidad}</td>
                                                    <td className="px-3 py-2">
                                                        <span>{item.producto} {item.capacidad}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex items-center justify-end">
                                                            <span className="text-gray-500 mr-1">$</span>
                                                            <input type="text" className={`border rounded px-2 py-1 w-24 text-right transition ` +
                        (isMissing
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-green-400 bg-green-50 text-green-700")} placeholder="Precio" value={item.precio === "" ? "" : Number(item.precio).toLocaleString("es-CL")} onChange={e => handlePrecioChange(idx, e.target.value)} inputMode="numeric"/>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="font-semibold text-gray-700">
                                                            ${subtotal > 0 ? subtotal.toLocaleString("es-CL") : "-"}
                                                        </span>
                                                    </td>
                                                </tr>);
            })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100 border-t border-gray-300">
                                            <td className="px-3 py-2 font-bold text-right" colSpan={3}>Total</td>
                                            <td className="px-3 py-2 text-right font-bold text-blue-700">
                                                ${items.reduce((acc, item) => {
                const precioNum = item.precio === "" ? 0 : Number(item.precio);
                return acc + precioNum * Number(item.cantidad);
            }, 0).toLocaleString("es-CL")}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <button className={`w-full h-12 rounded font-semibold text-white ${allPreciosOk && !saving ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`} disabled={!allPreciosOk || saving} onClick={handleSave}>
                                {saving ? <div className="relative"><Loader_1.default texto="Guardando"/></div> : "Aprobar venta"}
                            </button>
                            <button className="w-full h-12 rounded font-semibold bg-gray-600 text-white hover:bg-gray-700" onClick={onClose} disabled={saving}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>)}

            {loading && (<div className="flex items-center justify-center h-full -mt-10">
                    <Loader_1.default texto="Cargando borradores"/>
                </div>)}

            {!loading && pedidos.length == 0 && (<div className="flex items-center justify-center h-full -mt-16">
                    <div className="w-full mx-auto">
                        <fa_1.FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto"/>
                        <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                        <p className="text-center uppercase font-xl">No pedido pendientes</p>
                    </div>
                </div>)}
            <react_toastify_1.ToastContainer />
        </main>);
}
