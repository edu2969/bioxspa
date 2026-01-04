import { IRutasConductorView } from "./types";

export default function GestorDeRutaView({
    ruta
}: {
    ruta: IRutasConductorView | null;
}) {
    return (
        <div className="w-full">
            <h2 className="text-lg font-bold mb-4">Gestor de Ruta</h2>
        </div>
    );
}

/*



    const onFinish = (checklist) => {
        console.log("DESPACHO ---> onFinish called with checklist:", checklist);
        setEndingChecklist(true);
        checklist.tipo = TIPO_CHECKLIST.vehiculo;
        if (vehiculos.length === 1) {
            checklist.vehiculoId = vehiculos[0]._id;
        }
        fetch('/api/users/checklist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(checklist),
        })
            .then(async (res) => {
                setCheckListPassed(res.passed);
                setLoadingChecklist(false);
                if (res.ok) {
                    socket.emit("update-pedidos", {
                        userId: session.user.id
                    });
                }
                if (!res.passed) {
                    setCheckListPassed(true);
                }
            })
            .catch((err) => {
                console.error('Error al guardar el checklist:', err);
                toast.error("Error al guardar el checklist. Por favor, inténtelo más tarde.", {
                    position: "top-center"
                });
            })
            .finally(() => {
                setEndingChecklist(false);
            })
    };

    const offsetByModel = () => {
        const marca = (rutaDespacho?.vehiculoId?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (rutaDespacho?.vehiculoId?.modelo.split(" ")[0] || "").toLowerCase();
        if (!marca || !modelo) {
            return {
                baseTop: 28,
                baseLeft: 76,
                scaleFactor: 1.5,
                verticalIncrement: 4
            };
        }
        const offsets = {
            "hyundai_porter": [-8, 96, 1.5, 4],
            "ford_ranger": [-16, 198, 1.5, 4],
            "mitsubishi_l200": [28, 76, 1.5, 4],
            "volkswagen_constellation": [28, 76, 1.5, 4],
            "volkswagen_delivery": [28, 76, 1.5, 4],
            "kia_frontier": [28, 76, 1.5, 4],
            "ford_transit": [-8, 186, 1.5, 4],
            "desconocido_desconocido": [28, 76, 1.5, 4],
        }
        const data = offsets[marca + "_" + modelo] || offsets["desconocido_desconocido"];
        return {
            baseTop: data[0],
            baseLeft: data[1],
            scaleFactor: data[2],
            verticalIncrement: data[3]
        };
    }

    function calculateTubePosition(index) {
        const offsets = offsetByModel();
        const baseTop = offsets.baseTop;
        const baseLeft = offsets.baseLeft;
        const scaleFactor = offsets.scaleFactor;
        const verticalIncrement = 5;

        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
    }

    function calculateUploadTubePosition(index) {
        const baseTop = 146;
        const baseLeft = 176;
        const scaleFactor = 1.5;
        const verticalIncrement = 4;

        const top = baseTop + !(index % 2) * verticalIncrement - Math.floor(index / 2) * verticalIncrement - Math.floor(index / 4) * verticalIncrement; // Ajuste vertical con perspectiva y separación de grupos
        const left = baseLeft + !(index % 2) * 14 + Math.floor(index / 2) * 12 + Math.floor(index / 4) * 8; // Ajuste horizontal con perspectiva

        return { top, left, width: (14 * scaleFactor) + 'px', height: (78 * scaleFactor) + 'px' };
    }

    // items corresponde a cargaItemIds del backend (ver route.js)
    // Retorna [{ subcategoriaCatalogoId, cantidad, sinSifon, esIndustrial, esMedicinal, elemento, multiplicador }]
    const getResumenCarga = (items = []) => {
        const resumen = {};
        if (!Array.isArray(items)) return [];

        items.forEach((item) => {
            // item.subcategoriaCatalogoId es un objeto poblado
            const sub = item.subcategoriaCatalogoId;
            if (!sub || !sub._id) return;

            const key = sub._id;
            if (!resumen[key]) {
                resumen[key] = {
                    subcategoriaCatalogoId: key,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sinSifon,
                    esIndustrial: sub.categoriaCatalogoId?.esIndustrial || false,
                    esMedicinal: sub.categoriaCatalogoId?.esMedicinal || false,
                    elemento: sub.categoriaCatalogoId?.elemento || "",
                    multiplicador: 1,
                    restantes: 0
                };
            } else {
                resumen[key].multiplicador += 1;
            }
        });

        return Object.values(resumen);
    };

    const getCilindrosDescarga = (ruta) => {
        if (!ruta || !Array.isArray(ruta.ventaIds) || !Array.isArray(ruta.ruta) || ruta.ruta.length === 0) return [];
        const ultimaDireccionId = ruta.ruta[ruta.ruta.length - 1].direccionDestinoId?._id || ruta.ruta[ruta.ruta.length - 1].direccionDestinoId;
        const venta = ruta.ventaIds.find(v => String(v.direccionDespachoId) === String(ultimaDireccionId));
        if (!venta || !Array.isArray(venta.detalles)) return [];
        const elementos = [];
        venta.detalles.forEach(detalle => {
            const cantidad = Number(detalle.cantidad) || 0;
            // Buscar el elemento en la cargaItemIds si existe, si no, usar el subcategoriaCatalogoId directamente
            let elemento = null;
            const carga = Array.isArray(ruta.cargaItemIds)
                ? ruta.cargaItemIds.find(
                    item =>
                        String(item.subcategoriaCatalogoId?._id || item.subcategoriaCatalogoId) === String(detalle.subcategoriaCatalogoId?._id || detalle.subcategoriaCatalogoId)
                )
                : null;
            if (carga && carga.subcategoriaCatalogoId && carga.subcategoriaCatalogoId.categoriaCatalogoId) {
                elemento = carga.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
            } else if (detalle.subcategoriaCatalogoId && detalle.subcategoriaCatalogoId.categoriaCatalogoId) {
                elemento = detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
            } else {
                elemento = detalle.elemento || "?";
            }
            for (let i = 0; i < cantidad; i++) {
                elementos.push(elemento);
            }
        });
        return elementos;
    }

    const getResumenDescarga = (rd) => {
        // Validaciones básicas
        if (!rd || !Array.isArray(rd.cargaItemIds) || !rd.ruta || rd.ruta.length === 0 || !rd.ventaIds || rd.ventaIds.length === 0) return [];

        // Dirección destino actual
        const currentRoute = rd.ruta[rd.ruta.length - 1];
        const currentDireccionId = currentRoute.direccionDestinoId?._id || currentRoute.direccionDestinoId;

        // Filtra la venta que corresponde a la dirección actual
        const currentVenta = rd.ventaIds.find(venta =>
            venta.direccionDespachoId?.toString() === currentDireccionId?.toString()
        );
        if (!currentVenta || !Array.isArray(currentVenta.detalles)) return [];

        // Agrupa por subcategoria los detalles de la venta actual
        const resumen = {};

        currentVenta.detalles.forEach(detalle => {
            const sub = detalle.subcategoriaCatalogoId;
            if (!sub || !sub._id) return;
            const key = sub._id;

            if (!resumen[key]) {
                resumen[key] = {
                    subcategoriaCatalogoId: sub,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sinSifon,
                    esIndustrial: sub.categoriaCatalogoId?.esIndustrial || false,
                    esMedicinal: sub.categoriaCatalogoId?.esMedicinal || false,
                    elemento: sub.categoriaCatalogoId?.elemento || "",
                    multiplicador: 0,
                    restantes: 0,
                    clienteId: currentVenta.clienteId._id,
                    clienteNombre: currentVenta.clienteId.nombre
                };
            }
            resumen[key].multiplicador += detalle.cantidad;
        });

        // Calcula los restantes por subcategoria, solo para los items físicos que coinciden con la dirección y subcategoria
        // Encuentra el último registro de descarga en el historialCarga
        let descargadosUltimaDescarga = [];
        if (Array.isArray(rd.historialCarga) && rd.historialCarga.length > 0) {
            // Busca el último historial donde esCarga es false
            const lastDescarga = [...rd.historialCarga].reverse().find(h => h.esCarga === false);
            if (lastDescarga && Array.isArray(lastDescarga.itemMovidoIds)) {
                descargadosUltimaDescarga = lastDescarga.itemMovidoIds.map(id => String(id));
            }
        }

        Object.keys(resumen).forEach(key => {
            // Filtra solo los items que corresponden a la venta actual (por dirección de despacho)
            const itemsDeVentaActual = rd.cargaItemIds.filter(item => {
                // El item debe ser de la subcategoria actual
                return String(item.subcategoriaCatalogoId?._id) === String(key);
            });

            // Busca el multiplicador (cantidad) de la venta actual para esta subcategoria
            const detalleVenta = currentVenta.detalles.find(det => String(det.subcategoriaCatalogoId?._id) === String(key));
            const multiplicadorVenta = detalleVenta ? detalleVenta.cantidad : 0;

            // Cuenta cuántos de estos items han sido descargados en la última descarga
            const descargados = itemsDeVentaActual.filter(item =>
                descargadosUltimaDescarga.includes(String(item._id))
            ).length;

            // Restantes son los que faltan por descargar
            resumen[key].restantes = Math.max(0, multiplicadorVenta - descargados);
        });
        return Object.values(resumen);
    };



    const getVentaActual = (rd) => {
        if (!rd || !Array.isArray(rd.ruta) || rd.ruta.length === 0 || !Array.isArray(rd.ventaIds)) return null;
        const index = rd.ruta.findIndex(r => r.fechaArribo === null)
        const lastDireccionId = rd.ruta[index != -1 ? index : rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
        const venta = rd.ventaIds.find(v => v.direccionDespachoId === lastDireccionId);
        return venta;
    }

    const getAlmenosUnRetiro = (rd) => {
        if (!rd || !Array.isArray(rd.ventaIds) || rd.ventaIds.length === 0) return false;
        return Array.isArray(rd.historialCarga) && rd.historialCarga.some(hist => Array.isArray(hist.itemMovidoIds) && hist.itemMovidoIds.length > 0);
    }

    const isCompleted = (rd) => {
        const tipoOrden = getVentaActual(rd)?.tipo ?? null;
        if (tipoOrden === TIPO_ORDEN.traslado) {
            return getAlmenosUnRetiro(rd); // TODO implementar la lógica de capacidad de vehiculo
        }
        const descarga = getResumenDescarga(rd);
        if (descarga.length === 0) return false;
        if (!rd || !Array.isArray(rd.historialCarga) || rd.historialCarga.length === 0) return false;

        // Encuentra el último historial de descarga (esCarga === false)
        const lastDescarga = [...rd.historialCarga].reverse().find(h => h.esCarga === false);
        if (!lastDescarga || !Array.isArray(lastDescarga.itemMovidoIds)) return false;

        // Encuentra la venta actual por dirección
        const currentRoute = rd.ruta[rd.ruta.length - 1];
        const currentDireccionId = currentRoute.direccionDestinoId?._id || currentRoute.direccionDestinoId;
        const currentVenta = rd.ventaIds.find(venta =>
            venta.direccionDespachoId?.toString() === currentDireccionId?.toString()
        );
        if (!currentVenta || !Array.isArray(currentVenta.detalles)) return false;

        // Suma el total de itemCatalogoIds de los detalles de la venta actual
        const totalItemCatalogoIds = currentVenta.detalles.reduce((acc, det) => {
            if (Array.isArray(det.itemCatalogoIds)) {
                return acc + det.itemCatalogoIds.length;
            }
            return acc;
        }, 0);

        // El largo de itemMovidoIds debe ser igual al total de itemCatalogoIds
        return lastDescarga.itemMovidoIds.length === totalItemCatalogoIds;
    }

    

    const handleGoingBackToBase = async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.regreso);

        const response = await fetch("/api/pedidos/volverABase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al marcar el regreso: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Regreso informado con éxito`, {
                position: "top-center",
            });
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            setRutaDespacho({
                ...rutaDespacho,
                estado: TIPO_ESTADO_RUTA_DESPACHO.regreso,
            });
            setLoadingState(-1);
        }
    }

    const handleFinish = async () => {
        const traslados = rutaDespacho.ventaIds.filter(v => v.tipo === TIPO_ORDEN.traslado);
        setLoadingState(traslados.length > 0 ? TIPO_ORDEN.descarga : TIPO_ESTADO_RUTA_DESPACHO.terminado);
        const response = await fetch("/api/pedidos/terminarRuta", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rutaId: rutaDespacho._id
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            toast.error(`Error al terminar la ruta: ${errorData.error}`, {
                position: "top-center",
            });
        } else {
            toast.success(`Ruta terminada con éxito`, {
                position: "top-center",
            });
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            if(traslados.length > 0) {
                setRutaDespacho({
                    ...rutaDespacho,
                    estado: TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado,
                });
            } else setRutaDespacho(null);
            setLoadingState(-1);
        }
    }

    

    const getDireccionById = (direccionDespachoId) => {
        if (!rutaDespacho || !rutaDespacho.ventaIds) return null;
        for (const venta of rutaDespacho.ventaIds) {
            const cliente = venta.clienteId;
            if (!cliente?.direccionesDespacho) continue;
            for (const dir of cliente.direccionesDespacho) {
                if (dir.direccionId && dir.direccionId._id === direccionDespachoId) {
                    return dir.direccionId;
                }
            }
        }
        return null;
    }

    // Devuelve el estado visual de cada cilindro en el camión según historial de carga y estado actual
    const cargaActual = (rutaDespacho) => {
        if (!rutaDespacho || !Array.isArray(rutaDespacho.cargaItemIds)) return [];

        let venta = getVentaActual(rutaDespacho);
        
        // Obtén los IDs de los items descargados según historialCarga
        const descargados = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1]?.itemMovidoIds || [];
        const estadoRuta = rutaDespacho.estado;
        return rutaDespacho.cargaItemIds.map(item => {            
            let estado = {}

            // Si el item está en el historial de descarga, está entregado
            if (descargados.some(id => id === item._id)) {
                if(venta && venta.tipo === TIPO_ORDEN.traslado) {
                    estado.cargado = estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada;
                } else {
                    estado.entregado = estadoRuta === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
                }
            } else if (
                (rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga) &&
                venta &&
                venta.detalles.some(
                    det => String(det.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId._id)
                )
            ) {
                // Solo los items que pertenecen a la venta de la última dirección están "descargando"
                estado.descargando = true;
            } else {
                estado.cargado = true;
            }

            return {
                elemento: item.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
                ...estado
            };
        });
    }

    useEffect(() => {
        console.log("Ruta despacho actualizada:", rutaDespacho);
    }, [rutaDespacho]);

    const imagenVehiculo = (vehiculo) => {
        if (!vehiculo) return "desconocido_desconocido";
        const marca = (vehiculo?.marca.split(" ")[0] || "").toLowerCase();
        const modelo = (vehiculo?.modelo.split(" ")[0] || "").toLowerCase();
        const imagen = `${marca}_${modelo}`.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase();
        return imagen || "desconocido_desconocido";
    }

    return (
        <div className="w-full h-dvh overflow-hidden">

            {rutaDespacho && <div className={`w-full ${loadingState == -2 || !rutaDespacho
                || loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga || loadingState == TIPO_ESTADO_RUTA_DESPACHO.carga
                || !rutaDespacho.vehiculoId ? "opacity-20" : ""}`}>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <Image
                        className="absolute top-10 left-4"
                        src={`/ui/${imagenVehiculo(rutaDespacho.vehiculoId)}.png`}
                        alt="camion_atras"
                        width={355}
                        height={275}
                        style={{ width: "90%", height: "auto" }}
                        priority
                    />
                    <div className="absolute top-6 mt-2 w-full">
                        {cargaActual(rutaDespacho).reverse().map((item, index) => {
                            // Deducción de descargado usando historialCarga                                                        
                            const elem = item.elemento;
                            return (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${getColorEstanque(elem)}.png`}
                                    alt={`tank_${index}`}
                                    width={14 * 4}
                                    height={78 * 4}
                                    className={`absolute ${item.descargando ? "opacity-40" : item.entregado ? "opacity-0" : "opacity-100"}`}
                                    style={calculateTubePosition(rutaDespacho?.cargaItemIds.length - index - 1)}
                                    priority={false}
                                />
                            );
                        })}
                    </div>
                    <Image
                        className="absolute top-10 left-4"
                        src={`/ui/${imagenVehiculo(rutaDespacho.vehiculoId)}_front.png`}
                        alt="camion"
                        width={328}
                        height={254}
                        style={{ width: "90%", height: "auto" }}
                    />
                    {rutaDespacho.vehiculoId && <div className="absolute right-8 top-52 bg-white rounded p-0.5">
                        <div className="flex text-slate-800 border-black border-2 px-1 py-0 rounded">
                            <p className="text-lg font-bold">{rutaDespacho?.vehiculoId?.patente.substring(0, 2)}</p>
                            <Image className="inline-block mx-0.5 py-2" src="/ui/escudo.png" alt="escudo chile" width={12} height={9} />
                            <p className="text-lg font-bold">{rutaDespacho?.vehiculoId?.patente.substring(2)}</p>
                        </div>
                    </div>}

                    {rutaDespacho && (rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada) && <div className="absolute top-6 left-0 mt-2 w-full">
                        {getCilindrosDescarga(rutaDespacho).reverse().map((elemento, index) => {
                            return (
                                <Image
                                    key={index}
                                    src={`/ui/tanque_biox${getColorEstanque(elemento)}.png`}
                                    alt={`tank_${index}`}
                                    width={14 * 3}
                                    height={78 * 3}
                                    className={`absolute ${rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada ? "" : "opacity-40"}`}
                                    style={calculateUploadTubePosition(getCilindrosDescarga(rutaDespacho).length - index - 1)}
                                    priority={false}
                                />
                            )
                        })}
                    </div>}
                </div>
            </div>}

            {loadingState != -2 && rutaDespacho && <div className="w-full absolute bottom-0 right-0 flex items-center justify-center">

                {(rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion
                    || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada) && (
                        <div className="w-full py-2 px-2 border rounded-t-xl shadow-lg bg-white mx-2 -mb-1">
                            <MdOutlineKeyboardDoubleArrowUp className="text-gray-400 mx-auto -mt-1 mb-1" style={{ transform: "scaleX(6)" }} />

                            
                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.preparacion && <div className="py-4 text-center">
                                <div className="py-4">
                                    <Loader texto="EN PROCESO DE CARGA" />
                                </div>
                                <p className="mx-auto my-4 px-4">{rutaDespacho.encargado} esta cargando. Pronto podrás iniciar tu viaje.</p>
                            </div>}

                            
                            {rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_cargada && <div className="w-full">
                                <p className="text-center text-xl font-bold">CONFIRMA{`${loadingState == TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada ? 'NDO' : ''}`} LA CARGA</p>
                                <div className="flex flex-col md:flex-row px-4 py-2">
                                    <div className="w-full md:w-1/3">
                                        <div className="flex flex-wrap text-gray-700 text-md">
                                            {resumenCarga.map((item, idx) => (
                                                <div key={idx} className="mb-1 border rounded border-gray-400 mr-2 orbitron px-1">
                                                    <b>{item.multiplicador}</b>x {item.elemento.toUpperCase()} {item.cantidad}{item.unidad}
                                                    {item.sinSifon && <span className="bg-gray-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">S/S</span>}
                                                    {item.esIndustrial && <span className="bg-blue-500 rounded px-1 mx-1 text-xs text-white relative -top-0.5">IND</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button className={`w-full text-center h-10 px-4 bg-green-400 text-white rounded-lg shadow-md cursor-pointer mb-4 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada ? "opacity-50 cursor-not-allowed" : ""}`}
                                    onClick={handleCargaConfirmada}>
                                    {loadingState == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                                        ? <div className="mt-0"><Loader texto="CONFIRMANDO" /></div>
                                        : <div className="flex justify-center"><FaFlagCheckered className="mt-1 mr-3" /><span className="mt-0">CONFIRMAR CARGA</span></div>}
                                </button>
                            </div>}
                        </div>
                    )}

                
                {rutaDespacho.estado >= TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                    && rutaDespacho.estado <= TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada
                    && (<div className="w-full text-center mt-4 mx-6">

                        
                        {loadingState === -1 && rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta && <>
                            <h1 className="text-xl">Conduce con precaución.</h1>
                            <span className="text-md">Al llegar, avisas de tu arribo.</span>
                            <button
                                className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md mb-4 h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'opacity-50' : ''}`}
                                onClick={() => handleHeLlegado()}>
                                <FaFlagCheckered className="mt-1 mr-2" /><span>HE LLEGADO</span>
                                {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga &&
                                    <div className="absolute -mt-1">
                                        <Loader texto="REPORTANDO" />
                                    </div>
                                }
                            </button></>}

                        
                        

                        
                        

                        
                        {(rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada
                            || rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
                            && rutaDespacho.ruta.filter(r => r.fechaArribo != null).length === rutaDespacho.ventaIds.length
                            && <div className="w-full mb-4 bg-white mx-auto">                                
                                <div className="w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mb-4 flex">
                                    <div className="w-40 overflow-hidden">
                                        <MdInfo className="mr-2 text-5xl"/>
                                    </div>
                                    <div className="text-md text-left font-bold ml-2">
                                        Espera instrucciones, regresar a base o retira cilindros cercanos creando la órden tú mismo.
                                    </div>
                                </div>
                                <button
                                    className={`w-full flex justify-center mt-4 py-3 bg-green-400 text-white font-bold rounded-lg shadow-md h-12`}
                                    onClick={handleGoingBackToBase}>
                                    <TbHomeShare className="text-2xl mt-0 mr-2" /><span>REGRESO A BASE</span>
                                </button>
                            </div>}

                    </div>)}

                {loadingState == -1 && rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.carga && <div className="absolute text-center bottom-4 w-full px-4">
                    <p className="text-xl">Excelente ruta</p>
                    <p>Retira los cilindros y confirma la carga.</p>
                </div>}

                {loadingState == -1 && rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado && <div className="absolute text-center bottom-4 w-full px-4">
                    <GiBullseye className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-2xl font-bold text-green-600">¡OBJETIVO CUMPLIDO!</p>
                    <p className="text-lg">Excelente trabajo. <br/>Despacho recibirá tu entrega.</p>
                </div>}

                
                {loadingState == -1 && rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.regreso && <div className="absolute text-center bottom-4 w-full px-4">
                    <p className="text-xl">Excelente ruta</p>
                    <p>Regresa seguro y atento. Avisa al llegar.</p>
                    <button
                        className={`w-full flex justify-center mt-4 py-3 px-8 bg-blue-400 text-white font-bold rounded-lg shadow-md h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga ? 'opacity-50' : ''}`}
                        onClick={() => handleFinish()}>
                        <FaHouseFlag className="mt-1 mr-2" /><span>HE REGRESADO</span>
                        {loadingState == TIPO_ESTADO_RUTA_DESPACHO.terminado &&
                            <div className="absolute -mt-1">
                                <Loader texto="" />
                            </div>
                        }
                    </button>
                </div>}

            </div>}
    );
}


*/