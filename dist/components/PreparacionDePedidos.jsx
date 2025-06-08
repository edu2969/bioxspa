"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreparacionDePedidos;
const react_1 = require("react");
const bs_1 = require("react-icons/bs");
const fa6_1 = require("react-icons/fa6");
const Loader_1 = __importDefault(require("./Loader"));
const socket_client_1 = require("@/lib/socket-client");
const fa_1 = require("react-icons/fa");
const react_toastify_1 = require("react-toastify");
require("react-toastify/dist/ReactToastify.css");
const react_2 = require("react");
const dayjs_1 = __importDefault(require("dayjs"));
require("dayjs/locale/es");
const image_1 = __importDefault(require("next/image"));
const nuConverter_1 = require("@/lib/nuConverter");
dayjs_1.default.locale('es');
var relative = require('dayjs/plugin/relativeTime');
dayjs_1.default.extend(relative);
function PreparacionDePedidos({ session }) {
    const [cargamentos, setCargamentos] = (0, react_1.useState)([]);
    const [animating, setAnimating] = (0, react_1.useState)(false);
    const [scanMode, setScanMode] = (0, react_1.useState)(false);
    const [showModalCilindroErroneo, setShowModalCilindroErroneo] = (0, react_1.useState)(false);
    const [itemCatalogoEscaneado, setItemCatalogoEscaneado] = (0, react_1.useState)(null);
    const hiddenInputRef = (0, react_2.useRef)(null);
    const postCargamento = async () => {
        console.log("Cargamento a guardar:", cargamentos[0]);
        if (!isCompleted()) {
            console.log("Eeeeepa!");
            return;
        }
        // Unir todos los ids de scanCodes de todos los items
        const scanCodes = cargamentos[0].items
            .flatMap(item => Array.isArray(item.scanCodes) ? item.scanCodes : [])
            .map(scan => scan.id);
        const response = await fetch("/api/pedidos/despacho", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: cargamentos[0].rutaId,
                scanCodes
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            react_toastify_1.toast.error(`Error al guardar el cargamento: ${errorData.error}`, {
                position: "bottom-right",
            });
        }
        else {
            handleRemoveFirst();
            react_toastify_1.toast.success(`Cargamento confirmado con éxito`, {
                position: "bottom-right",
            });
            socket_client_1.socket.emit("update-pedidos", {
                userId: session.user.id
            });
        }
    };
    const handleRemoveFirst = async () => {
        if (animating)
            return; // Evita múltiples clics durante la animación
        setAnimating(true);
        setTimeout(() => {
            setCargamentos((prev) => prev.slice(1)); // Elimina el primer pedido después de la animación
            setAnimating(false);
            setScanMode(false);
        }, 1000);
    };
    const handleShowNext = () => {
        if (animating)
            return; // Evita múltiples clics durante la animación
        setAnimating(true);
        setTimeout(() => {
            setCargamentos((prev) => {
                if (prev.length <= 1)
                    return prev;
                const [first, ...rest] = prev;
                return [...rest, first];
            });
            setAnimating(false);
            setScanMode(false);
        }, 1000); // Cambia el tiempo de la animación aquí
    };
    const handleScanMode = () => {
        react_toastify_1.toast.info(`Modo escaneo ${scanMode ? "desactivado" : "activado"}`, {
            position: "bottom-right",
        });
        setScanMode(!scanMode);
    };
    const isCompleted = () => {
        if (cargamentos.length === 0)
            return false;
        return cargamentos[0].items.every((item) => item.restantes <= 0);
    };
    const [loadingCargamentos, setLoadingCargamentos] = (0, react_1.useState)(true);
    const fetchCargamentos = async () => {
        const response = await fetch("/api/pedidos/despacho");
        const data = await response.json();
        console.log("DATA", data);
        setCargamentos(data.cargamentos);
        setLoadingCargamentos(false);
    };
    const cargarItem = (0, react_1.useCallback)(async (item, codigo) => {
        const cargamentoActual = cargamentos[0];
        console.log("CARGAMENTO ACTUAL", cargamentoActual);
        if (!cargamentoActual)
            return false;
        const itemIndex = cargamentoActual.items.map(i => i.subcategoriaId).indexOf(item.subcategoriaCatalogoId);
        if (itemIndex === -1) {
            setScanMode(false);
            setShowModalCilindroErroneo(true);
            react_toastify_1.toast.warn(`CODIGO ${codigo} ${item.categoria.nombre} ${item.subcategoria.nombre} no corresponde a este pedido`, {
                position: "bottom-right",
            });
            return;
        }
        if (cargamentoActual.items[itemIndex].scanCodes && cargamentoActual.items[itemIndex].scanCodes.map(sc => sc.codigo).includes(codigo)) {
            react_toastify_1.toast.warn(`CODIGO ${codigo} ya escaneado`, {
                position: "bottom-right",
            });
            return;
        }
        setCargamentos(prev => {
            // Solo actualiza si hay cargamentos
            if (!prev.length)
                return prev;
            const newCargamentos = [...prev];
            const currentCargamento = Object.assign({}, newCargamentos[0]);
            const items = [...currentCargamento.items];
            const itemToUpdate = Object.assign({}, items[itemIndex]);
            // Cambia el nombre del arreglo de items a scanCodes y agrega el nuevo código escaneado
            const scanCodes = Array.isArray(itemToUpdate.scanCodes) ? [...itemToUpdate.scanCodes] : [];
            scanCodes.push({ id: item._id, codigo: item.codigo });
            // Actualiza restantes y multiplicador si corresponde
            const updatedRestantes = itemToUpdate.multiplicador < itemToUpdate.restantes
                ? itemToUpdate.restantes
                : itemToUpdate.restantes - 1;
            const updatedMultiplicador = itemToUpdate.multiplicador < itemToUpdate.restantes
                ? itemToUpdate.multiplicador + 1
                : itemToUpdate.multiplicador;
            // Actualiza el item
            const newItem = Object.assign(Object.assign({}, itemToUpdate), { restantes: updatedRestantes, multiplicador: updatedMultiplicador, scanCodes });
            items[itemIndex] = newItem;
            currentCargamento.items = items;
            newCargamentos[0] = currentCargamento;
            return newCargamentos;
        });
        react_toastify_1.toast.success(`Cilindro ${item.codigo} ${item.categoria.nombre} ${item.subcategoria.nombre.toLowerCase()} cargado`, {
            position: "bottom-right",
        });
    }, [setCargamentos, cargamentos]);
    (0, react_1.useEffect)(() => {
        fetchCargamentos();
    }, []);
    (0, react_1.useEffect)(() => {
        const handleTextInput = (e) => {
            if (scanMode) {
                const codigo = e.data;
                const scanItem = async () => {
                    try {
                        const response = await fetch(`/api/pedidos/despacho/scanItemCatalogo?codigo=${codigo}`);
                        console.log("RESPONSE", response);
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || "Error al escanear el código");
                        }
                        const data = await response.json();
                        console.log("Scan exitoso:", data);
                        const item = Object.assign(Object.assign({}, data.item), { categoria: data.categoria, subcategoria: data.subcategoria });
                        setItemCatalogoEscaneado(item);
                        cargarItem(item, codigo);
                    }
                    catch (_a) {
                        react_toastify_1.toast.error(`Cilindro ${codigo} no existe`, {
                            position: "bottom-right",
                        });
                        return;
                    }
                };
                scanItem();
            }
        };
        const inputElement = hiddenInputRef.current;
        if (inputElement) {
            // textInput event (supported by some mobile browsers)
            inputElement.addEventListener('textInput', handleTextInput);
            inputElement.focus();
        }
        return () => {
            if (inputElement) {
                inputElement.removeEventListener('textInput', handleTextInput);
            }
        };
    }, [scanMode, cargarItem]);
    // Mantener el foco en el input oculto para capturar eventos
    (0, react_1.useEffect)(() => {
        if (!scanMode)
            return;
        const keepFocus = setInterval(() => {
            if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
                hiddenInputRef.current.focus();
            }
        }, 300);
        return () => clearInterval(keepFocus);
    }, [scanMode]);
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
    }, [session]); // Dependencia de session para que se ejecute cuando cambie
    // Mantén tu efecto existente para escuchar "update-pedidos"
    (0, react_1.useEffect)(() => {
        socket_client_1.socket.on("update-pedidos", () => {
            fetchCargamentos();
        });
        return () => {
            socket_client_1.socket.off("update-pedidos");
        };
    }, []);
    return (<div className="w-full h-screen overflow-hidden">
            <div className="w-full">
                {!loadingCargamentos && cargamentos && cargamentos.map((cargamento, index) => (<div key={`cargamento_${index}`} className="flex flex-col h-full overflow-y-hidden">
                        <div className={`absolute w-11/12 md:w-9/12 h-5/6 bg-gray-100 shadow-lg rounded-lg p-4 ${animating ? "transition-all duration-500" : ""}`} style={{
                top: `${index * 10 + 52}px`,
                left: `${index * 10 + 16}px`,
                zIndex: cargamentos.length - index,
                scale: 1 - index * 0.009,
                transform: `translateX(${animating && index == 0 ? "-100%" : "0"})`,
                opacity: animating && index == 0 ? 0 : 1,
            }}>
                            <div className="flex flex-row text-xl font-bold">
                                <div>
                                    <p className="text-xs">CHOFER</p>
                                    <p className="font-bold text-lg uppercase -mt-2">{cargamento.nombreChofer}</p>
                                </div>
                                <div className="ml-2 mt-3 text-gray-500">
                                    <div className="flex justify-start md:justify-start">
                                        <fa_1.FaTruck className="text-xl mr-2"/>
                                        <p className="font-bold text-sm">{cargamento.patenteVehiculo}</p>
                                    </div>
                                </div>
                            </div>
                            <ul className="flex-1 flex flex-wrap items-center justify-center mt-2">
                                {cargamento.items.map((item, idx) => (<li key={`item_${idx}`} className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${idx === 0 ? 'rounded-t-lg' : idx === cargamento.items.length - 1 ? 'rounded-b-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}>
                                        <div className="w-full flex items-left">
                                            <div className="flex">
                                                <div>
                                                    <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{item.nuCode}</div>
                                                    {item.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                    {item.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                                </div>
                                                <div className="font-bold text-xl ml-2">
                                                    <span>
                                                        {(() => {
                    var _a, _b, _c;
                    let match = (_a = item.elemento) === null || _a === void 0 ? void 0 : _a.match(/^([a-zA-Z]*)(\d*)$/);
                    if (!match) {
                        match = [null, ((_c = (_b = item.elemento) !== null && _b !== void 0 ? _b : item.gas) !== null && _c !== void 0 ? _c : item.nombre.split(" ")[0]), ''];
                    }
                    const [, p1, p2] = match;
                    return (<>
                                                                    {p1 ? p1.toUpperCase() : ''}
                                                                    {p2 ? <small>{p2}</small> : ''}
                                                                </>);
                })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-2xl orbitron ml-2"><b>{item.cantidad}</b> <small>{item.unidad}</small></p>
                                        </div>
                                        <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{item.multiplicador - item.restantes} <small>/</small> {item.multiplicador}</div>
                                    </li>))}
                            </ul>

                            <div className="absolute bottom-3 flex w-full pr-8" onClick={index === 0 ? postCargamento : undefined}>
                                <button className={`absolute h-12 w-12 mr-3 flex text-sm border border-gray-300 rounded-lg p-1 mb-4 ${(scanMode && !isCompleted()) ? 'bg-green-500 cursor-pointer' : isCompleted() ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 cursor-pointer'} text-white hover:${(scanMode && !isCompleted()) ? 'bg-green-300 cursor-pointer' : isCompleted() ? 'bg-gray-400' : 'bg-sky-700 cursor-pointer'} transition duration-300 ease-in-out`} onClick={() => {
                handleScanMode();
            }}>
                                    <bs_1.BsQrCodeScan className="text-4xl"/>
                                    {scanMode && !isCompleted() && <div className="absolute top-2 left-2">
                                        <Loader_1.default texto=""/>
                                    </div>}
                                </button>
                                <button className={`ml-14 h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${isCompleted() ? 'bg-green-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}>
                                    <fa6_1.FaRoadCircleCheck className="text-4xl pb-0"/>
                                    <p className="ml-2 mt-1 text-lg">CONFIRMAR CARGA</p>
                                </button>
                            </div>
                        </div>
                    </div>))}
                {loadingCargamentos && (<div className="absolute w-full h-screen flex items-center justify-center">
                        <Loader_1.default texto="CARGANDO PEDIDOS"/>
                    </div>)}
                {(cargamentos === null || cargamentos === void 0 ? void 0 : cargamentos.length) === 0 && !loadingCargamentos && (<div className="absolute w-full h-screen flex items-center justify-center">
                        <div className="text-center">
                            <fa_1.FaClipboardCheck className="text-8xl mx-auto mb-4 text-green-500"/>
                            <div className="text-2xl font-bold text-gray-500">TODO EN ORDEN</div>
                        </div>
                    </div>)}
            </div>

            {(cargamentos === null || cargamentos === void 0 ? void 0 : cargamentos.length) > 1 && <div className="fixed bottom-4 right-4 z-40">
                <button className="flex items-center px-6 py-3 bg-white text-gray-500 border border-gray-300 rounded-xl shadow-lg font-bold text-lg hover:bg-gray-100 transition duration-200" style={{ minWidth: 220 }} onClick={handleShowNext} disabled={animating || cargamentos.length === 0}>
                    PASAR SIGUIENTE &gt;&gt;
                </button>
            </div>}

            {showModalCilindroErroneo && itemCatalogoEscaneado != null && <div className="fixed flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 items-center">
                <div className="relative mx-auto p-5 border w-10/12 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>
                        <div className="mt-2">
                            <div className="flex items-center justify-center">
                                <image_1.default width={20} height={64} src="/ui/tanque_biox.png" style={{ width: "43px", height: "236px" }} alt="tanque_biox"/>
                                <div className="text-left ml-6">
                                    <div>
                                        <div className="flex">
                                            {itemCatalogoEscaneado.categoria.esIndustrial && <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 mt-0 font-bold">INDUSTRIAL</span>}
                                            <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs ml-1 h-5 mt-0 font-bold tracking-widest">{(0, nuConverter_1.getNUCode)(itemCatalogoEscaneado.categoria.elemento)}</div>
                                            {itemCatalogoEscaneado.subcategoria.sinSifon && <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-2 h-5 mt-0 font-bold tracking-widest">sin SIFÓN</div>}
                                        </div>
                                        <div className="font-bold text-4xl">
                                            <span>
                                                {(() => {
                var _a, _b, _c;
                let match = (_a = itemCatalogoEscaneado.categoria.elemento) === null || _a === void 0 ? void 0 : _a.match(/^([a-zA-Z]*)(\d*)$/);
                if (!match) {
                    match = [null, ((_c = (_b = itemCatalogoEscaneado.categoria.elemento) !== null && _b !== void 0 ? _b : itemCatalogoEscaneado.categoria.gas) !== null && _c !== void 0 ? _c : itemCatalogoEscaneado.categoria.nombre.split(" ")[0]), ''];
                }
                ;
                const [, p1, p2] = match;
                return (<>
                                                            {p1 ? p1.toUpperCase() : ''}
                                                            {p2 ? <small>{p2}</small> : ''}
                                                        </>);
            })()}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-4xl font-bold orbitron">{itemCatalogoEscaneado.subcategoria.cantidad} <small>{itemCatalogoEscaneado.subcategoria.unidad}</small> </p>
                                    <p className="text-sm text-gray-600"><small>Código:</small> <b>{itemCatalogoEscaneado.codigo}</b></p>
                                    <p className="text-sm text-gray-600"><small>Mantención:</small> <b>{(0, dayjs_1.default)(itemCatalogoEscaneado.updatedAt).add(2, 'year').format("DD/MM/YYYY")}</b></p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 mx-4">
                            <button onClick={() => {
                setShowModalCilindroErroneo(false);
                const newCargamentos = [...cargamentos];
                const currentCargamento = newCargamentos[0];
                // Verificar si el item ya existe en el cargamento
                const existingItemIndex = currentCargamento.items.findIndex((item) => item.subcategoriaId === itemCatalogoEscaneado.subcategoria._id);
                if (existingItemIndex === -1) {
                    // Agregar el nuevo item si no existe                
                    const newItem = {
                        subcategoriaId: itemCatalogoEscaneado.subcategoria._id,
                        nombre: `${itemCatalogoEscaneado.categoria.nombre} ${itemCatalogoEscaneado.subcategoria.nombre}`,
                        restantes: -1,
                        cantidad: itemCatalogoEscaneado.subcategoria.cantidad,
                        elemento: itemCatalogoEscaneado.categoria.elemento,
                        nuCode: (0, nuConverter_1.getNUCode)(itemCatalogoEscaneado.categoria.elemento),
                        esIndustrial: itemCatalogoEscaneado.categoria.esIndustrial,
                        sinSifon: itemCatalogoEscaneado.subcategoria.sinSifon,
                        unidad: itemCatalogoEscaneado.subcategoria.unidad,
                        multiplicador: 0,
                        scanCodes: [
                            {
                                id: itemCatalogoEscaneado._id,
                                codigo: itemCatalogoEscaneado.codigo,
                            },
                        ],
                    };
                    currentCargamento.items.push(newItem);
                }
                newCargamentos[0] = currentCargamento;
                setCargamentos(newCargamentos);
                setScanMode(true);
            }} className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                                CONTINUAR
                            </button>
                            <button onClick={() => {
                setShowModalCilindroErroneo(false);
                setScanMode(true);
            }} className="mt-2 px-4 py-2 bg-yellow-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500">CORREGIR</button>
                            <button onClick={() => {
                setShowModalCilindroErroneo(false);
                setScanMode(true);
            }} className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">CANCELAR</button>
                        </div>
                    </div>
                </div>

            </div>}
            <react_toastify_1.ToastContainer />
            <input ref={hiddenInputRef} type="text" className="opacity-0 h-0 w-0 absolute" inputMode="none"/>
        </div>);
}
