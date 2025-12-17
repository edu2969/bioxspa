"use client";

import VehicleView from "../prefabs/VehicleView";
import GestorDeCargaView from "../prefabs/GestorDeCargaView";
import { useQuery } from "@tanstack/react-query";
import SoundPlayerProvider from "../context/SoundPlayerContext";
import { ChecklistProvider } from "../context/ChecklistContext";
import type { IRutasConductorResponse, IVehicleView } from "../prefabs/types";
import { SessionProvider } from "next-auth/react";
import Nav from "../Nav";
import { Suspense } from "react";
import Loader from "../Loader";

export default function ConductorPanel() {
    const { data: ruta } = useQuery<IRutasConductorResponse | undefined>({
        queryKey: ['rutaDespacho'],
        queryFn: async () => {
            const response = await fetch('/api/pedidos/asignacion/conductor');
            const data = await response.json();
            console.log("DATA", data);
            return data;
        }
    });

    const vehicleViewMap = (ruta: IRutasConductorResponse | undefined): IVehicleView => {
        const vehiculo = ruta?.vehiculos[0];
        return {
            vehicleId: vehiculo?._id ?? "",
            patente: vehiculo?.patente || "...",
            marca: vehiculo?.marca || "desconocida",
            modelo: vehiculo?.modelo || "desconocido",
            estado: 0,
            cargados: [],
            descargados: []
        };
    }

    return (<SessionProvider>
        <Suspense fallback={<Loader texto="Cargando panel" />}>
        <ChecklistProvider tipo="vehiculo">
            <SoundPlayerProvider>
                <VehicleView vehicle={vehicleViewMap(ruta)} />
                <GestorDeCargaView vehiculoId={ruta?.vehiculos[0]?._id}></GestorDeCargaView>
            </SoundPlayerProvider>
        </ChecklistProvider>
        <Nav/>
        </Suspense>
    </SessionProvider>);
}

/*const [vehiculos, setVehiculos] = useState([]);
    const [resumenCarga, setResumenCarga] = useState([]);
    const [loadingState, setLoadingState] = useState(-2);
    const [scanMode, setScanMode] = useState(false);
    const hiddenInputRef = useRef(null);
    const temporalRef = useRef(null);
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);
    const [loadingChecklist, setLoadingChecklist] = useState(false);
    const [checkListPassed, setCheckListPassed] = useState(true);
    const [endingChecklist, setEndingChecklist] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    
    

    useEffect(() => {
        if (
            session &&
            session.user &&
            (session.user?.role === USER_ROLE.conductor ||
                session.user?.role === USER_ROLE.encargado ||
                session.user?.role === USER_ROLE.responsable)
        ) {
            fetchEstadoChecklist();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const onFinish = (checklist: IChecklist) => {
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
                const data = await res.json();
                setCheckListPassed(data.passed);
                setLoadingChecklist(false);
                if (res.ok) {
                    socket.emit("update-pedidos");
                } else if (!data.passed) {
                    setCheckListPassed(true);
                }                
            })
            .catch((err) => {
                console.error('Error al guardar el checklist:', err);
                toast("Error al guardar el checklist. Por favor, inténtelo más tarde.", {
                    position: "top-center"
                });
            })
            .finally(() => {
                setEndingChecklist(false);
            })
    };    

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

    const handleScanMode = () => {
        setScanMode(!scanMode);
    };


    const getResumenDescarga = (rd: IRutaDespacho) => {
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

        Object.keys(resumen).forEach(key => {

            // Busca el multiplicador (cantidad) de la venta actual para esta subcategoria
            const detalleVenta = currentVenta.detalles.find(det => String(det.subcategoriaCatalogoId?._id) === String(key));

            const multiplicadorVenta = detalleVenta ? detalleVenta.cantidad : 0;
            // Cuenta cuántos de estos items han sido descargados en la última descarga
            const descargados = rutaDespacho.historialCarga
                .filter(h => !h.esCarga)
                .flatMap(h => h.itemMovidoIds || [])
                .filter(itemId => 
                    currentVenta.detalles.some(detalle =>
                        Array.isArray(detalle.itemCatalogoIds) &&
                        detalle.itemCatalogoIds.some(catalogoId => String(catalogoId) === String(itemId)) &&
                        String(detalle.subcategoriaCatalogoId._id) === String(key)
                    )
                ).length;

            // Restantes son los que faltan por descargar
            resumen[key].restantes = Math.max(0, multiplicadorVenta - descargados);
        });
        return Object.values(resumen);
    };

    const getClienteDescarga = (rd) => {
        if (!rd || !Array.isArray(rd.ruta) || rd.ruta.length === 0 || !Array.isArray(rd.ventaIds)) return null;
        const lastDireccionId = rd.ruta[rd.ruta.length - 1].direccionDestinoId?._id || rd.ruta[rd.ruta.length - 1].direccionDestinoId;
        const venta = rd.ventaIds.find(v => String(v.direccionDespachoId) === String(lastDireccionId));
        if (!venta || !venta.clienteId) return null;
        return venta.clienteId;
    }

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

    const fetchRutaAsignada = useCallback(async () => {
        try {
            const response = await fetch("/api/pedidos/asignacion/chofer");
            const data = await response.json();
            if (data.ok) {
                console.log("data -->", data);
                setRutaDespacho(data.rutaDespacho);
                if (data.rutaDespacho && data.rutaDespacho.cargaItemIds && data.rutaDespacho.cargaItemIds.length > 0) {
                    setResumenCarga(getResumenCarga(data.rutaDespacho.cargaItemIds));
                }
                setVehiculos(data.vehiculos);
            } else {
                console.error("Error fetching rutaDespacho:", data.error);
            }
            setLoadingState(-1);
        } catch (error) {
            console.error("Error in fetchRutaAsignada:", error);
        }
    }, [setRutaDespacho, setLoadingState, setVehiculos]);

    const handleCargaConfirmada = useCallback(async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada);
        try {
            const response = await fetch("/api/pedidos/despacho/confirmarOrden", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            const data = await response.json();
            if (data.ok) {
                toast("Carga confirmada correctamente");
                if (rutaDespacho.ventaIds.length === 1 && rutaDespacho.ventaIds[0].clienteId.direccionesDespacho.length == 1) {
                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
                        ruta: [{
                            direccionDestinoId: rutaDespacho.ventaIds[0].clienteId.direccionesDespacho[0].direccionId,
                            fechaArribo: null,
                        }]
                    });
                } else {
                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: rutaDespacho.ruta?.filter(r => !r.fechaArribo).length < rutaDespacho.ventaIds.length
                            ? TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                            : TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                    });
                    setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino);
                }
                socket.emit("update-pedidos", {
                    userId: session.user.id
                });
            } else {
                toast(data.error || "Error al confirmar la carga");
            }
        } catch (error) {
            console.error("Error al confirmar la carga:", error);
            toast("Error de conexión al confirmar la carga");
        } finally {
            setLoadingState(-1);
        }
    }, [rutaDespacho, setRutaDespacho, setLoadingState, session]);

    const handleIniciarViaje = useCallback(async () => {
        setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.en_ruta);
        try {
            const response = await fetch("/api/pedidos/iniciarViaje", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rutaId: rutaDespacho._id,
                    direccionId: rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId._id
                }),
            });

            const data = await response.json();
            if (data.ok) {
                toast("Viaje iniciado correctamente");
                setRutaDespacho({
                    ...rutaDespacho,
                    estado: TIPO_ESTADO_RUTA_DESPACHO.en_ruta
                });
                socket.emit("update-pedidos", {
                    userId: session.user.id
                });
            } else {
                toast(data.error || "Error al iniciar el viaje");
            }
        } catch (error) {
            console.error("Error al iniciar el viaje:", error);
            toast("Error de conexión al iniciar el viaje");
        } finally {
            setLoadingState(-1);
        }
    }, [setRutaDespacho, setLoadingState, rutaDespacho, session]);

    const handleHeLlegado = async () => {
        const venta = getVentaActual(rutaDespacho);
        setLoadingState(venta.tipo === TIPO_ORDEN.traslado ? TIPO_ESTADO_RUTA_DESPACHO.carga : TIPO_ESTADO_RUTA_DESPACHO.descarga);
        setRutaDespacho({
            ...rutaDespacho,
            historialCarga: [
                ...(rutaDespacho.historialCarga || []),
                {
                    itemMovidoIds: [],
                    esCarga: venta.tipo === TIPO_ORDEN.traslado
                }
            ]
        });
    };

    const handleConfirmarDestino = () => {
        const postConfirmarDestino = async () => {
            try {
                setLoadingState(TIPO_ESTADO_RUTA_DESPACHO.descarga);
                const response = await fetch("/api/pedidos/confirmarArribo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rutaId: rutaDespacho._id
                    }),
                });

                const data = await response.json();
                if (data.ok) {
                    // Update the rutaDespacho state
                    const now = new Date();
                    const updatedRuta = [...rutaDespacho.ruta];
                    const rutaIndex = rutaDespacho.ruta.length - 1;
                    updatedRuta[rutaIndex].fechaArribo = now;
                    setRutaDespacho({
                        ...rutaDespacho,
                        estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
                        ruta: updatedRuta
                    });
                    toast.success("Arribo confirmado correctamente");
                    socket.emit("update-pedidos", {
                        userId: session.user.id
                    });
                } else {
                    toast.error(data.error || "Error al confirmar el arribo");
                }
            } catch (error) {
                console.error("Error al confirmar el arribo:", error);
                toast.error("Error de conexión al confirmar el arribo");
            } finally {
                setLoadingState(-1);
            }
        }
        postConfirmarDestino();
    }

    const handleCorregirDestino = () => {
        setRutaDespacho({
            ...rutaDespacho,
            estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
            ruta: rutaDespacho.ruta.map((r, idx) => idx === rutaDespacho.ruta.length ? { ...r, fechaArribo: null } : r)
        });
    }

    const postMovimientoCarga = async () => {        
        // Encuentra la última dirección de la ruta
        const lastRoute = rutaDespacho.ruta[rutaDespacho.ruta.length - 1];
        const lastDireccionId = lastRoute.direccionDestinoId?._id || lastRoute.direccionDestinoId;

        // Busca la venta correspondiente a esa dirección
        const venta = rutaDespacho.ventaIds.find(
            v => String(v.direccionDespachoId) === String(lastDireccionId)
        );

        if (!venta) {
            toast.error("No se encontró la venta para la dirección actual.");
            setLoadingState(-1);
            return;
        }

        setLoadingState(venta.tipo === TIPO_ORDEN.traslado 
            ? TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada : TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada);

        console.log("ITEMMOVIDOS --->", rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1].itemMovidoIds);

        const response = await fetch("/api/pedidos/confirmarMovimientoCarga", {
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
            toast.error(`Error al guardar el cargamento: ${errorData.error}`);
        } else {
            toast.success(`Descarga confirmada con éxito`);
            socket.emit("update-pedidos", {
                userId: session.user.id
            });
            setRutaDespacho({
                ...rutaDespacho,
                ruta: rutaDespacho.ruta.map((r, idx) => {
                    if (idx === rutaDespacho.ruta.length - 1) {
                        return {
                            ...r,
                            fechaArribo: new Date(),
                        }
                    }
                    return r;
                }),
                estado: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
            });
        }
        setLoadingState(-1);
    }

    const moverItem = useCallback(
        async (codigo: string) => {
            const tipoOrden = getVentaActual(rutaDespacho)?.tipo ?? null;
            if (tipoOrden === TIPO_ORDEN.venta) {
                // Busca el item por código en la carga actual
                const item = rutaDespacho?.cargaItemIds?.find(item => item.codigo === codigo);
                if (!item) {
                    reproducirSonido('/sounds/error_01.mp3');
                    toast.error(`${codigo} no encontrado! WoW...`);
                    return;
                }

                const currentDireccionId = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId?._id;
                const ventaActual = rutaDespacho.ventaIds.find(v => v.direccionDespachoId === currentDireccionId);
                // Verifica que el item esté en el arreglo de itemCatalogoIds de algún detalle de la venta actual
                const perteneceAlCliente = ventaActual?.detalles?.some(detalle =>
                    detalle.subcategoriaCatalogoId._id === item.subcategoriaCatalogoId._id
                );

                if (!perteneceAlCliente) {
                    reproducirSonido('/sounds/error_02.mp3');
                    toast.error(`${codigo} no pertenece a éste cliente!`);
                    return;
                }

                // Busca el historial de descarga actual (último registro con esCarga === false)
                const lastDescargaIdx = rutaDespacho.historialCarga
                    ? rutaDespacho.historialCarga.length - 1
                    : -1;

                if (lastDescargaIdx < 0 || !rutaDespacho.historialCarga[lastDescargaIdx].itemMovidoIds) {
                    toast.error("No hay historial de descarga disponible.");
                    return;
                }

                // Verifica si el item ya fue descargado en el último registro
                const yaDescargado = rutaDespacho.historialCarga.filter(h => h.esCarga === false).map(h => h.itemMovidoIds).flat().includes(item._id);

                if (yaDescargado) {
                    toast.error(`${codigo} ya descargado!.`);
                    return;
                }

                const response = await fetch("/api/cilindros/descargar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rutaDespachoId: rutaDespacho._id,
                        codigo
                    }),
                });

                if (response.ok) {
                    const nuevoItem = await response.json();
                                        
                    // Calcular el nuevo array de cargaItemIds
                    const nuevaCarga = [...rutaDespacho.cargaItemIds, nuevoItem];                    
                    setRutaDespacho(prev => {
                        const lastCargaIdx = prev.historialCarga.length - 1;
                        if (lastCargaIdx < 0) return prev;

                        const updatedHistorial = [...prev.historialCarga];
                        updatedHistorial[lastCargaIdx] = {
                            ...updatedHistorial[lastCargaIdx],
                            itemMovidoIds: [...updatedHistorial[lastCargaIdx].itemMovidoIds, nuevoItem._id]
                        };
                        return {
                            ...prev,
                            cargaItemIds: nuevaCarga,
                            historialCarga: updatedHistorial
                        };
                    });
                    
                    reproducirSonido('/sounds/accept_02.mp3');
                    // Usar el nuevo array calculado en lugar del estado anterior
                    setTimeout(() => setResumenCarga(getResumenCarga(nuevaCarga)), 250);
                    toast.success(`${codigo} cargado correctamente`);
                } else {
                    const errorData = await response.json();
                    toast.error(`Error al descargar ${codigo}: ${errorData.error}`);
                    reproducirSonido('/sounds/error_01.mp3');
                }
            } else {
                const yaCargado = rutaDespacho.historialCarga.filter(h => h.esCarga).map(h => h.itemMovidoIds).flat().includes(codigo);
                if (yaCargado) {
                    reproducirSonido('/sounds/error_01.mp3');
                    toast.error(`${codigo} ya cargado!.`);
                }

                await fetch("/api/cilindros/cargar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rutaDespachoId: rutaDespacho._id,
                        codigo
                    }),
                })
                    .then(async (resp) => {
                        const data = await resp.json();
                        if (data.ok) {
                            const nuevoItem = data.item._id;
                            setRutaDespacho(prev => {
                                const lastCargaIdx = prev.historialCarga.length - 1;
                                if (lastCargaIdx < 0) return prev;

                                const updatedHistorial = [...prev.historialCarga];
                                updatedHistorial[lastCargaIdx] = {
                                    ...updatedHistorial[lastCargaIdx],
                                    itemMovidoIds: [...updatedHistorial[lastCargaIdx].itemMovidoIds, nuevoItem]
                                };
                                return {
                                    ...prev,
                                    cargaItemIds: [...prev.cargaItemIds, nuevoItem],
                                    historialCarga: updatedHistorial
                                };
                            });
                            reproducirSonido('/sounds/accept_02.mp3');
                            setResumenCarga(getResumenCarga([...rutaDespacho.cargaItemIds, nuevoItem]));
                            toast.success(`${codigo} cargado correctamente`);
                        } else {
                            const errorData = await resp.json();
                            console.error("Error al cargar el cilindro:", errorData);
                            reproducirSonido('/sounds/error_01.mp3');
                            toast.error(errorData.error || `Error al cargar ${codigo}`);
                        }
                    })
                    .catch(err => {
                        console.error("Error al actualizar estado tras cargar:", err);
                        reproducirSonido('/sounds/error_02.mp3');
                    });
            }
            setInputTemporalVisible(false);
            setTimeout(() => {
                if (hiddenInputRef.current)
                    hiddenInputRef.current.focus();
            }, 0);
        },
        [rutaDespacho, setRutaDespacho]
    );

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
            toast.error(`Error al marcar el regreso: ${errorData.error}`);
        } else {
            toast.success(`Regreso informado con éxito`);
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
            toast.error(`Error al terminar la ruta: ${errorData.error}`);                
        } else {
            toast.success(`Ruta terminada con éxito`);
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

    useEffect(() => {
        const handleTextInput = (e) => {
            if (scanMode) {
                const codigo = e.data;
                if (codigo === "x") {
                    setScanMode(false);
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (temporalRef.current)
                            temporalRef.current.focus();
                    }, 0);
                    return;
                }
                moverItem(codigo);
            }
        }

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
    }, [scanMode, moverItem, temporalRef]);

    // Mantener el foco en el input oculto para capturar eventos
    useEffect(() => {
        if (!scanMode) return;
        const keepFocus = setInterval(() => {
            if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
                hiddenInputRef.current.focus();
            }
        }, 300);

        return () => clearInterval(keepFocus);
    }, [scanMode]);

    useEffect(() => {
        fetchRutaAsignada();
    }, [fetchRutaAsignada]);

    useEffect(() => {
        // Verifica si hay sesión y el socket está conectado
        if (session?.user?.id && socket.connected) {
            console.log("Re-uniendo a room-pedidos después de posible recarga");
            socket.emit("join-room", {
                room: "room-pedidos",
                userId: session.user.id
            });
        }

        // Evento para manejar reconexiones del socket
        const handleReconnect = () => {
            if (session?.user?.id) {
                console.log("Socket reconectado, uniendo a sala nuevamente");
                socket.emit("join-room", {
                    room: "room-pedidos",
                    userId: session.user.id
                });
            }
        };

        // Escucha el evento de reconexión
        socket.on("connect", handleReconnect);

        return () => {
            socket.off("connect", handleReconnect);
        };
    }, [session]);

    useEffect(() => {
        socket.on("update-pedidos", (data) => {
            console.log(">>>> Update pedidos", data, session);
            fetchRutaAsignada();
        });

        return () => {
            socket.off("update-pedidos");
        };
    }, [session, fetchRutaAsignada]);

    useOnVisibilityChange(() => {
        const fetch = async () => {
            setLoadingState(-2);
            fetchRutaAsignada();
        }
        fetch('/api/ventas/lastUpdate')
            .then(res => res.json())
            .then(data => {
                if (data.ok && data.updatedAt) {
                    const updatedAt = new Date(data.updatedAt);
                    if (updatedAt > lastUpdate) {
                        setLastUpdate(updatedAt);
                        fetch();
                    }
                }
            })
            .catch(() => { });
    });

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


<div className="w-full h-dvh overflow-hidden">
            <Toaster/>            
            {rutaDespacho && <div className={`w-full ${loadingState == -2 || !rutaDespacho
                || loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga || loadingState == TIPO_ESTADO_RUTA_DESPACHO.carga
                || !rutaDespacho.vehiculoId ? "opacity-20" : ""}`}>
                <VehicleView
                    vehicle={vehicleData(rutaDespacho)}
                />
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

                        
                        {(loadingState === TIPO_ESTADO_RUTA_DESPACHO.descarga
                            || loadingState === TIPO_ESTADO_RUTA_DESPACHO.carga) && rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.en_ruta && <div className="w-full mb-4">
                                <FaBuildingFlag size="9rem" className="text-green-500 mb-4 mx-auto" />
                                <div>
                                    <p className="text-center text-xl font-bold mb-4">Confirma que has llegado a</p>
                                    <BsFillGeoAltFill size="1.75rem" className="inline-block mr-2" />
                                    <span className="text-xl">{rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId.nombre || "un destino"}</span>

                                    <div className="w-full px-6 py-4 bg-white mx-auto">
                                        <h2 className="text-xl font-bold mb-4">Datos de quién {getVentaActual(rutaDespacho).tipo === TIPO_ORDEN.traslado ? 'entrega' : 'recibe'}</h2>
                                        <div className="flex flex-col md:flex-row text-left">
                                            <label htmlFor="rut" className="text-xs">RUT</label>
                                            <input
                                                type="text"
                                                className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                                                placeholder="RUT (opcional)*"
                                            />
                                            <label htmlFor="nombre" className="text-xs mt-4">Nombre</label>
                                            <input
                                                type="text"
                                                className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-1/2"
                                                placeholder="Nombre quien recibe"
                                            />
                                        </div>
                                    </div>

                                </div>
                                <button
                                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-green-400 text-white font-bold rounded-lg shadow-md h-12 ${loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada ? 'opacity-50' : ''}`}
                                    onClick={handleConfirmarDestino}>
                                    <FaBuildingFlag className="mt-1 mr-2" /><span>CONFIRMO</span>
                                    {!(loadingState === TIPO_ESTADO_RUTA_DESPACHO.descarga || loadingState === TIPO_ESTADO_RUTA_DESPACHO.carga) &&
                                        <div className="absolute -mt-1">
                                            <Loader texto="" />
                                        </div>
                                    }
                                </button>
                                <button
                                    className={`w-full flex justify-center mt-4 py-3 px-8 bg-gray-400 text-white font-bold rounded-lg shadow-md h-12`}
                                    onClick={handleCorregirDestino}>
                                    <LuFlagOff className="mt-1 mr-2" /><span>ES OTRO DESTINO</span>
                                </button>
                            </div>}

                        
                        {loadingState === -1
                            && getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado
                            && rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga
                            && (<div className="flex flex-col w-full">

                                <div className="w-full mb-2">
                                    {(() => {
                                        const cliente = getClienteDescarga(rutaDespacho);
                                        // Busca la venta actual por dirección
                                        const currentDireccionId = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId?._id || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId;
                                        const ventaActual = rutaDespacho.ventaIds.find(v => String(v.direccionDespachoId) === String(currentDireccionId));
                                        return (
                                            <div className="w-full flex items-center justify-between px-2 py-1 border border-gray-300 rounded-lg bg-white">
                                                <div className="w-full">
                                                    <p className="text-md text-blue-700 font-bold truncate">{cliente?.nombre || "Sin cliente"}</p>
                                                    {ventaActual.tipo === TIPO_ORDEN.traslado
                                                        ? <div className="text-sm font-bold text-gray-700">
                                                            <p>RETIRO DE CILINDROS</p>
                                                            <span className="text-xs">Escanee cilindros a retirar</span>
                                                        </div>
                                                        : <p className="text-sm font-bold text-gray-700">{cliente?.giro || "Sin giro"}</p>}
                                                </div>
                                                {getAlmenosUnRetiro(rutaDespacho) && <div className={`relative flex justify-end ${ventaActual?.comentario ? 'text-gray-500' : 'text-gray-400 '}`}>
                                                    <div className="mr-2 cursor-pointer mt-0" onClick={(e) => {
                                                        e.stopPropagation();
                                                        toast(`${ventaActual?.comentario || "Sin comentarios"}`, { icon: '💬' });
                                                    }}>
                                                        {!ventaActual?.comentario
                                                            ? <VscCommentDraft size="1.75rem" />
                                                            : <VscCommentUnresolved size="1.75rem" />}
                                                    </div>
                                                    {ventaActual?.comentario && <div className="absolute top-[16px] right-[11px] w-[10px] h-[10px] rounded-full bg-red-600"></div>}
                                                </div>}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <ul className="flex-1 flex flex-wrap items-center justify-center mt-2 mb-20">
                                    {resumenCarga.map((item, idx) => (
                                        <li
                                            key={`item_${idx}`}
                                            className={`w-full flex text-sm border border-gray-300 px-0 py-2 ${(idx === 0 && resumenCarga.length != 1) ? 'rounded-t-lg' : (idx === resumenCarga.length - 1 && resumenCarga.length != 1) ? 'rounded-b-lg' : resumenCarga.length === 1 ? 'rounded-lg' : ''} ${item.restantes === 0 ? 'bg-green-300 opacity-50 cursor-not-allowed' : item.restantes < 0 ? 'bg-yellow-100' : 'bg-white hover:bg-gray-100 cursor-pointer'} transition duration-300 ease-in-out`}
                                        >
                                            <div className="w-full flex items-left">
                                                <div className="flex">
                                                    <div>
                                                        <div className="text-white bg-orange-400 px-2 py-0 rounded text-xs ml-0.5 -my-1 h-4 mb-1.5 font-bold">{getNUCode(item.elemento)}</div>
                                                        {item.esIndustrial && <div className="text-white bg-blue-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4 mb-1.5">Industrial</div>}
                                                        {item.sinSifon && <div className="text-white bg-gray-400 px-2 py-0 rounded text-xs -ml-2 -my-1 h-4">Sin Sifón</div>}
                                                    </div>
                                                    <div className="font-bold text-xl ml-2">
                                                        {item.elemento && <span>
                                                            {(() => {
                                                                const elem = item.elemento;
                                                                let match = elem.match(/^([a-zA-Z]*)(\d*)$/);
                                                                if (!match) {
                                                                    match = [null, (elem ?? item.nombre.split(" ")[0]), ''];
                                                                }
                                                                const [, p1, p2] = match;
                                                                return (
                                                                    <>
                                                                        {p1 ? p1.toUpperCase() : ''}
                                                                        {p2 ? <small>{p2}</small> : ''}
                                                                    </>
                                                                );
                                                            })()}
                                                        </span>}
                                                    </div>
                                                </div>
                                                <p className="text-2xl orbitron ml-2"><b>{item.subcategoriaCatalogoId.cantidad}</b> <small>{item.subcategoriaCatalogoId.unidad}</small></p>
                                            </div>
                                            <div className="w-24 text-xl font-bold orbitron border-l-gray-300 text-right mr-3 border-l-2">{item.multiplicador - item.restantes} <small>/</small> {item.multiplicador}</div>
                                        </li>
                                    ))}
                                </ul>
                            </div>)}

                        
                        {loadingState === -1
                            && getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.venta
                            && rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga
                            && (<GestorDeCargaView cargamento={cargamento} />)}

                        
                        {loadingState === -1
                            && rutaDespacho.ruta?.filter(r => r.fechaArribo != null).length < rutaDespacho.ventaIds.length
                            && (rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                                || rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                                || rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada)
                            && <div>
                                {getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado && 
                                <div className="w-full bg-neutral-100 rounded p-2 mb-4">
                                    <p className="text-xs">Misión:</p>
                                    <p className="text-xl">RETIRO DE CILINDROS</p>
                                </div>}
                                <div className="flex flex-row items-start justify-center gap-3 mb-6">
                                    <div className="flex flex-col items-center mt-1 ml-2">
                                        <TbFlagCheck className="text-xl mb-4 w-6" />
                                        
                                        {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="h-12" key={`ruta_${indexRuta}`}>
                                            <div className="h-4" />
                                            {ruta.fechaArribo ? <TbFlagCheck className="text-xl mt-1" /> : <FaTruckFast className="text-xl mt-1 w-6" />}
                                        </div>))}
                                    </div>
                                    <div className="flex flex-col items-center justify-start h-full">
                                        
                                        <div className="flex flex-col items-center mt-1">
                                            
                                            <div className="w-6 h-6 rounded-full bg-blue-300 border-4 border-blue-400" />
                                            
                                            {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div className="w-6" key={`ruta_${indexRuta}`}>
                                                <div className="w-2 h-10 bg-blue-400 -mt-1 -mb-2 mx-auto" />
                                                
                                                <div className="w-6 h-6 rounded-full bg-white border-4 border-blue-400" /></div>))}
                                        </div>
                                    </div>
                                    <div className="w-full text-left -mt-3">
                                        <div className="w-full flex mt-1 h-12 items-center">
                                            <BsFillGeoAltFill size="1.1rem" className="w-4" /><span className="text-sm ml-2">Barros Arana</span>
                                        </div>
                                        {rutaDespacho.ruta.length > 0 && rutaDespacho.ruta.map((ruta, indexRuta) => (<div key={`ruta_${indexRuta}`} className="flex mt-1 h-12 items-center overflow-hidden">
                                            <BsFillGeoAltFill size="1.1rem" className="w-4" />
                                            <span className="text-xs ml-2 w-36">{ruta.direccionDestinoId.nombre.split(",").slice(0, 3).join(",")}</span>
                                            {indexRuta == rutaDespacho.ruta.length - 1 && <button
                                                className="bg-blue-400 text-white font-bold rounded-md shadow-md w-10 h-10 pl-2"
                                                onClick={() => {
                                                    const destino = `${ruta.direccionDestinoId.latitud},${ruta.direccionDestinoId.longitud}`;
                                                    // Google Maps Directions: https://www.google.com/maps/dir/?api=1&destination=lat,lng
                                                    window.open(
                                                        `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
                                                        "_blank"
                                                    );
                                                }}
                                            >
                                                <FaMapLocationDot className="w-7 -ml-0.5" size="1.5rem" />
                                            </button>}
                                        </div>))}
                                    </div>
                                </div>
                            </div>}

                        
                        {loadingState === -1
                            && (rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                                || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                                || rutaDespacho.estado == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada)
                            && rutaDespacho.ruta.length < rutaDespacho.ventaIds.length && (
                                <div className="flex mt-1">
                                    <select
                                        className="border rounded-md shadow-sm w-full py-2 px-1 mb-2"
                                        onChange={(e) => {
                                            const direccionId = e.target.value;
                                            if (!direccionId) {
                                                setRutaDespacho({
                                                    ...rutaDespacho,
                                                    ruta: rutaDespacho.ruta.slice(0, -1)
                                                });
                                            } else {
                                                const rutaSinArriboIdx = rutaDespacho.ruta.findIndex(r => r.fechaArribo === null);
                                                if (rutaSinArriboIdx !== -1) {
                                                    // Si existe una ruta con fechaArribo null, actualiza su direccionDestinoId
                                                    setRutaDespacho({
                                                        ...rutaDespacho,
                                                        ruta: rutaDespacho.ruta.map((r, idx) =>
                                                            idx === rutaSinArriboIdx
                                                                ? { ...r, direccionDestinoId: getDireccionById(direccionId) }
                                                                : r
                                                        )
                                                    });
                                                } else {
                                                    // Si no existe, agrega una nueva
                                                    setRutaDespacho({
                                                        ...rutaDespacho,
                                                        ruta: [
                                                            ...rutaDespacho.ruta,
                                                            { direccionDestinoId: getDireccionById(direccionId), fechaArribo: null }
                                                        ]
                                                    });
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">{rutaDespacho.ruta.some(r => r.fechaArribo === null) ? "Cambiar tu selección" : "Selecciona un destino"}</option>
                                        {rutaDespacho.ventaIds
                                            .flatMap(venta =>
                                                venta.clienteId.direccionesDespacho
                                                    .filter(dir => {
                                                        // Excluir direcciones ya entregadas (fechaArribo != null en la ruta)
                                                        const entregada = rutaDespacho.ruta.some(
                                                            r => r.direccionDestinoId._id === dir.direccionId._id && r.fechaArribo != null
                                                        );
                                                        // Excluir si ya está en la ruta pendiente de entrega
                                                        const yaEnRutaPendiente = rutaDespacho.ruta.some(
                                                            r => r.direccionDestinoId._id === dir.direccionId._id && r.fechaArribo == null
                                                        );
                                                        return !entregada && !yaEnRutaPendiente;
                                                    })
                                                    .map(dir => ({
                                                        ventaId: venta._id,
                                                        clienteNombre: venta.clienteId.nombre,
                                                        direccion: dir
                                                    }))
                                            )
                                            .map(({ ventaId, clienteNombre, direccion }) => (
                                                <option key={`venta_${ventaId}_dir_${direccion.direccionId._id}`} value={direccion.direccionId._id}>
                                                    {clienteNombre}|{direccion.direccionId.nombre}
                                                </option>
                                            ))}
                                    </select>
                                </div>)}

                        
                        {loadingState === -1
                            && (rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino
                                || rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
                                || rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada)
                            && rutaDespacho.ruta?.filter(r => r.fechaArribo != null).length < rutaDespacho.ventaIds.length && <div className="flex flex-row items-center justify-center">
                                <button className={`flex w-full justify-center h-10 px-4 bg-green-400 text-white font-bold rounded-lg shadow-md cursor-pointer mb-4 ${loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta || rutaDespacho.ruta.length == 0 || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].fechaArribo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={handleIniciarViaje}
                                    disabled={rutaDespacho.ruta.length == 0 || rutaDespacho.ruta[rutaDespacho.ruta.length - 1].fechaArribo}>
                                    {loadingState === TIPO_ESTADO_RUTA_DESPACHO.en_ruta ? <div className="mt-1"><Loader texto="INICIANDO" /></div> : <div className="flex"><FaFlagCheckered className="mt-3 mr-3" />
                                        <span className="mt-2">INICIAR VIAJE</span>
                                    </div>}
                                </button>
                            </div>}

                        
                        {loadingState === -1 && rutaDespacho.estado === TIPO_ESTADO_RUTA_DESPACHO.descarga && (!inputTemporalVisible ? <div className="absolute bottom-3 flex w-full pr-8">
                            <button className={`absolute h-12 w-12 mr-3 flex text-sm border border-gray-300 rounded-lg p-1 mb-4 ${scanMode ? 'bg-green-500 cursor-pointer' : (isCompleted(rutaDespacho) && getVentaActual(rutaDespacho).tipo != TIPO_ORDEN.traslado) ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 cursor-pointer'} text-white hover:${scanMode ? 'bg-green-300 cursor-pointer' : isCompleted() ? 'bg-gray-400' : 'bg-sky-700 cursor-pointer'} transition duration-300 ease-in-out`}
                                onClick={() => {
                                    handleScanMode();
                                }}>
                                <BsQrCodeScan className="text-4xl" />
                            </button>
                            <button className={`w-full ml-16 mr-4 h-12 flex justify-center text-white border border-gray-300 rounded-lg py-1 px-4 ${isCompleted(rutaDespacho) ? 'bg-green-500 cursor-pointer' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                                disabled={!isCompleted(rutaDespacho)}
                                onClick={postMovimientoCarga}>
                                <FaRoadCircleCheck className="text-4xl pb-0" />
                                <p className="ml-2 mt-1 text-lg">FIN {getVentaActual(rutaDespacho)?.tipo === TIPO_ORDEN.traslado
                                    ? 'RETIRO' : 'DESCARGA'}</p>
                                {loadingState == TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada &&
                                    <div className="absolute mt-1"><Loader texto="" /></div>}
                            </button>
                        </div> :
                            <div className="w-full pb-4">
                                <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
                                <input
                                    ref={temporalRef}
                                    type="text"
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            console.log("Código temporal ingresado:", e.target.value);
                                            setInputTemporalVisible(false);
                                            moverItem(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>)}

                        
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


            
            {loadingState == -1 && rutaDespacho == null && (
                <div className="w-full py-6 px-12 mt-64 bg-white mx-auto">
                    <FaClipboardCheck className="text-8xl text-green-500 mb-4 mx-auto" />
                    <p className="text-center text-2xl font-bold mb-4">¡TODO EN ORDEN!</p>
                    <p className="text-center uppercase font-xl">No tienes pedidos asignados</p>
                </div>
            )}

            {loadingState == -2 && <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center z-10">
                <div className="absolute w-full h-screen bg-white/80"></div>
                <div className="flex items-center justify-center bg-white roounded-lg shadow-lg p-4 z-20 text-xl">
                    <Loader texto="CARGANDO PEDIDOS" />
                </div>
            </div>}

            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
            />

            {vehiculos?.length > 0 && !loadingChecklist && !checkListPassed && <CheckList session={session} onFinish={onFinish} vehiculos={vehiculos} tipo={TIPO_CHECKLIST.vehiculo} loading={endingChecklist} />}

            {scanMode && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 px-4">
                    <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
                        <BsQrCodeScan className="text-8xl text-green-500 mb-4" />
                        <div className="flex">
                            <Loader texto="Escaneando código..." />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">Por favor, escanee un código QR</p>
                    </div>
                </div>
            )}
        </div>

</withChecklist>
        )
        
    );
}
*/