"use client"

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import formatRUT from '@/app/utils/idetificationDocument';
import { TIPO_PRECIO, USER_ROLE } from '@/app/utils/constants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LiaPencilAltSolid, LiaTimesSolid } from 'react-icons/lia';
import Loader from '@/components/Loader';
import { socket } from "@/lib/socket-client";
import { MdAddLocationAlt } from 'react-icons/md';
import Autocomplete from "react-google-autocomplete";
import { FaCheck, FaTimes } from 'react-icons/fa';

const TIPO_REGISTRO = [
    { value: 1, label: "Venta" },
    { value: 2, label: "Cotizacion" },
    { value: 3, label: "OT" },
    { value: 4, label: "Venta Firmada" }
]

export default function Pedidos({ session, googleMapsApiKey }) {
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues } = useForm();
    const [usuarios, setUsuarios] = useState([]);
    const [precios, setPrecios] = useState([]);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);
    const [clienteSelected, setClienteSelected] = useState(null);
    const [itemsVenta] = useState([]);
    const [documentosTributarios, setDocumentosTributarios] = useState([]);
    const [ setDocumentoTributarioSeleccionado] = useState(null);
    const [setRegistroSelected] = useState(0);
    const [total, setTotal] = useState(0);
    const [modalSolicitudPrecio, setModalSolicitudPrecio] = useState(false);
    const [precioData, setPrecioData] = useState({});
    const [saving, setSaving] = useState(false);
    const [categoriaIdSeleccionada, setCategoriaIdSeleccionada] = useState("");
    const [loading, setLoading] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [creandoOrden, setCreandoOrden] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingCliente, setLoadingCliente] = useState(false);
    const [role, setRole] = useState(-1);
    const [editDireccionDespacho, setEditDireccionDespacho] = useState(false);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const autocompleteRef = useRef(null);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [savingPlace, setSavingPlace] = useState(false);
    const formScrollRef = useRef(null);
    const [sucursalesACargo, setSucursalesACargo] = useState([]);
    const [loadingSucursales, setLoadingSucursales] = useState(true);
    const [tipoOrden, setTipoOrden] = useState(0);
    const [empresaOrigen] = useState(null);
    const [indexFocused, setIndexFocused] = useState(-1);
    const [items, setItems] = useState([]);
    const [loadingCatalogo, setLoadingCatalogo] = useState(false);

    const [busquedaCategoria, setBusquedaCategoria] = useState("");
    const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
    const [mostrarResultadosCategoria, setMostrarResultadosCategoria] = useState(false);
    const [categoriaNombreSeleccionada, setCategoriaNombreSeleccionada] = useState("");

    const buscarCategorias = (termino) => {
        if (!termino || termino.length < 2) {
            setCategoriasFiltradas([]);
            setMostrarResultadosCategoria(false);
            return;
        }
        
        const resultados = categorias.filter(categoria => 
            categoria.nombre.toLowerCase().includes(termino.toLowerCase())
        );
        
        setCategoriasFiltradas(resultados);
        setMostrarResultadosCategoria(true);
    };

    const seleccionarCategoria = async (categoria) => {
        setCategoriaIdSeleccionada(categoria._id);
        setCategoriaNombreSeleccionada(categoria.nombre);
        setBusquedaCategoria(categoria.nombre);
        setMostrarResultadosCategoria(false);
        setCategoriasFiltradas([]);
        
        // Actualizar el form y precioData
        setValue("categoriaId", categoria._id);
        setValue("subcategoriaCatalogoId", "");
        setPrecioData((prev) => ({
            ...prev,
            categoriaId: categoria._id,
            subcategoriaCatalogoId: "",
            valor: getValues('precio'),
        }));
        
        // Fetch subcategorías
        await fetchSubcategorias(categoria._id);
    };

    const isVentaDisabled = () => {
        return redirecting || !precios.length
            || !precios.some(precio => precio.seleccionado)
            || precios.some(precio => precio.cantidad <= 0 && precio.seleccionado)
            || !clienteSelected
            || !getValues("usuarioId") 
            || ((session.user.role == USER_ROLE.encargado || session.user.role == USER_ROLE.gerente || session.user.role == USER_ROLE.cobranza) && !getValues("documentoTributarioId"));    }

    const handlePlaceChanged = (autocomplete) => {
        const place = autocomplete;
        console.log("Selected Place:", place);
        setSelectedPlace(place);
        if (!place || !place.geometry) {
            return;
        }
        setAutocompleteResults([]);
    };

    const handleSelectPlace = (place) => {
        const address = {
            nombre: place.formatted_address,
            apiId: place.place_id,
            latitud: place.geometry.location.lat(),
            longitud: place.geometry.location.lng(),
            categoria: place.types[0]
        };
        console.log("Selected Place:", address);
        setSelectedPlace(address);
        setAutocompleteResults([]);
    };

    const fetchUsuarios = async () => {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsuarios(data.users);
    };

    const fetchDocumentosTributarios = async () => {
        const response = await fetch('/api/ventas/documentostributarios?venta=true');
        const data = await response.json();
        setDocumentosTributarios(data.documentosTributarios);
    };

    const fetchCategorias = async () => {
        try {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            setCategorias(data.sort((a, b) => a.nombre < b.nombre ? -1 : 1));            
        } catch (error) {
            console.error('Error fetching categorias:', error);
        }
    }

    const fetchSubcategorias = async () => {
        try {
            const response = await fetch('/api/catalogo/subcategoria');
            const data = await response.json();
            setSubcategorias(data);
        } catch (error) {
            console.error('Error fetching subcategorias:', error);
        }
    }

    const fetchSucursales = async () => {
        try {
            const response = await fetch('/api/sucursales/aCargo');
            const data = await response.json();
            setSucursalesACargo(data.sucursales);
        } catch (error) {
            console.error('Error fetching sucursales:', error);
        } finally {
            setLoadingSucursales(false);
        }
    }

    const handlePrecioInputChange = (e) => {
        const value = e.target.value;
        const clean = value.replace(/\D/g, "");
        setValue('precio', clean === "" ? "" : Number(clean).toLocaleString("es-CL"));
        setPrecioData(prev => ({
            ...prev,
            valor: clean === "" ? "" : parseInt(clean)
        }));
    };

    const onSubmit = async (data) => {
        setCreandoOrden(true);
        // Solo incluir los precios seleccionados como items de la venta
        const payload = {
            tipo: data.tipo,
            usuarioId: data.usuarioId,
            comentario: data.comentario || ""            
        }
        // Ventas y cotizaciones
        if(data.tipo == 1 || data.tipo == 4) {
            payload.clienteId = clienteSelected?._id;
            payload.documentoTributarioId = data.documentoTributarioId;
            payload.direccionDespachoId = data.direccionDespachoId;
            payload.sucursalId = data.sucursalId;
            payload.items = precios
                .filter(item => item.seleccionado && item.cantidad > 0)
                .map(item => ({
                    cantidad: parseInt(item.cantidad),
                    precio: parseInt(item.valor),
                    subcategoriaId: item.subcategoriaCatalogoId
                }));
        } else if(data.tipo == 2) {
            // TODO OT: ID de Empresa de servicio, tipo de servicio, listado de items            
        } else if(data.tipo == 3) {
            // TODO Orden de traslado - empresaOrigenId, direccionOrigenId, empresaDestinoId, direccionDespacho, razón traslado, items
        }
        console.log("PAYLOAD2", payload);
        try {
            const resp = await fetch('/api/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await resp.json();
            console.log("RESULT", result);
            if (resp.ok && result.ok) {
                toast.success("Venta creada exitosamente.", {
                    position: "top-center"
                });
                socket.emit("update-pedidos", { userId: session.user.id });
                setRedirecting(true);
                router.back();
            } else {
                toast.error(result.error || "Error al crear la venta. Por favor, inténtelo más tarde.", {
                    position: "top-center"
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error al crear la venta. Por favor, inténtelo más tarde.", {
                position: "top-center"
            });
        } finally {
            setCreandoOrden(false);
        }
    };

    const handleCancel = () => {
        setModalSolicitudPrecio(false);
        setPrecioData({});
        setCategoriaIdSeleccionada("");
        setCategoriaNombreSeleccionada("");
        setBusquedaCategoria("");
        setCategoriasFiltradas([]);
        setMostrarResultadosCategoria(false);
        setValue("categoriaId", "");
        setValue("subcategoriaCatalogoId", "");
        setValue("valor", "");
    };

    const handleSave = async () => {
        setSaving(true);
        const sc = precioData.subcategoriaCatalogoId;
        const exists = precios.some((p) => p.subcategoriaCatalogoId === sc);
        if (exists) {
            toast.error("Ya existe un precio para esta categoría y subcategoría.");
            setSaving(false);
            return;
        }
        setPrecios(prev => [
            ...prev,
            {
                ...precioData,
                valor: parseInt(precioData.valor) || 0,
                cantidad: 0,
                seleccionado: false,
                nombre: (
                    (() => {
                        const subcat = subcategorias.find(sc => sc._id === precioData.subcategoriaCatalogoId);
                        const categoria = categorias.find(cat => cat._id === subcat?.categoriaCatalogoId);
                        return `${categoria?.nombre || ""}-${subcat?.nombre || ""}`;
                    })()
                ),
            }
        ]);
        setSaving(false);
        handleCancel();
        setTimeout(() => {
            if (formScrollRef.current) {
                formScrollRef.current.scrollTo({
                    top: formScrollRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }
        }, 500);
    }

    useEffect(() => {
        if (getValues('sucursalId') == undefined) {
            let sucursalInicial = clienteSelected?.sucursalId ?? false;            
            if (!sucursalInicial) {
                sucursalInicial = localStorage.getItem('sucursalId');            
            }
            setValue('sucursalId', sucursalInicial || "");            
        }
    }, [clienteSelected, setValue, getValues]);

    useEffect(() => {
        setRole(session?.user?.role || -1);
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
        const fetchAll = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchUsuarios(),
                    fetchDocumentosTributarios(),
                ]);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoading(false);
                fetchSucursales();
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    useEffect(() => {
        if (session && session.user && session.user.id) {
            setValue('usuarioId', session.user.id);
        }
    }, [usuarios, session, setValue]);

    useEffect(() => {
        const newTotal = itemsVenta.reduce((acc, item) => {
            const cantidad = parseInt(item.cantidad) || 0;
            const precio = parseInt(item.precio) || 0;
            return acc + (cantidad * precio);
        }, 0);
        setTotal(newTotal);
    }, [itemsVenta, total]);

    const formInvalid = () => {
        if (!session) return true;
        const role = session.user?.role || -1;
        return !getValues('subcategoriaCatalogoId') || !getValues('categoriaId')
            || ([USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado].includes(role) && !getValues('precio'));
    };

    return (
        <main className="w-full min-h-screen pt-0 overflow-y-auto bg-white sm:px-1 md:px-4">
            <div className="w-full pb-2 mt-14 h-[calc(100vh-116px)] overflow-y-auto" ref={formScrollRef}>
                <div className="mx-auto">
                    {!loadingSucursales ? <form onSubmit={handleSubmit(onSubmit)} className="w-full px-2 sm:px-4 md:px-8 space-y-4 md:space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 w-full">
                            {/* Datos generales */}
                            <fieldset className="border rounded-md px-4 pb-4 space-y-4">
                                <legend className="font-bold text-gray-700 px-2">Datos Generales</legend>
                                {/* USUARIO */}
                                {session.role == USER_ROLE.gerente && <div className="w-full flex">
                                    <div className="w-full pr-0">
                                        <label htmlFor="usuarioId" className="block text-sm font-medium text-gray-700">Usuario</label>
                                        <select id="usuarioId" {...register('usuarioId')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione un usuario</option>
                                            {usuarios.length && usuarios.map(usuario => (
                                                <option key={usuario._id} value={usuario._id}>{usuario.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>}

                                {/* SUCURSAL */}
                                {sucursalesACargo.length > 1 && <div className="w-full flex">
                                    <div className="w-full pr-0">
                                        <label htmlFor="sucursalId" className="block text-sm font-medium text-gray-700">Sucursal</label>
                                        <select id="sucursalId" {...register('sucursalId')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        onChange={(e) => {
                                            localStorage.setItem('sucursalId', e.target.value);
                                        }}>
                                            <option value="">Seleccione una sucursal</option>
                                            {sucursalesACargo.map(sucursal => (
                                                <option key={sucursal._id} value={sucursal._id}>{sucursal.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>}

                                {/* TIPO */}
                                <div className="w-full">
                                    <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
                                    <select
                                        id="tipo"
                                        {...register('tipo', { required: true, valueAsNumber: true })}
                                        onChange={(e) => {
                                            setClienteSelected(null);
                                            setPrecios([]);
                                            setTipoOrden(e.target.value);                                            
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                    >
                                        <option value={0}>Seleccione tipo</option>
                                        <option value={1}>Venta</option>
                                        <option value={2}>Traslado</option>
                                        <option value={3}>OT</option>
                                        <option value={4}>Cotización</option>
                                    </select>
                                </div>                                

                                {/*COMENTARIO */}
                                <div className="w-full">
                                    <label htmlFor="comentario" className="w-full text-sm font-medium text-gray-700">Comentario</label>
                                    <textarea
                                        id="comentario"
                                        {...register('comentario')}
                                        rows={3}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        placeholder="Comentario para la venta"
                                    ></textarea>
                                </div>
                            </fieldset>

                            {/* Venta/Cotización -Datos del cliente */}
                            {(tipoOrden == 1 || tipoOrden == 4) && <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
                                <legend className="font-bold text-gray-700 px-2">Datos del Cliente</legend>
                                {/* SELECCION DE CLIENTE */}
                                {(tipoOrden == 1 || tipoOrden == 4) && <div className="w-full">
                                    <div className="w-full pr-0 md:pr-4">
                                        <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
                                            Cliente
                                            {clienteSelected != null && clienteSelected.enQuiebra && <span className="bg-orange-600 text-white rounded-md py-0 px-2 text-xs mx-1">EN QUIEBRA</span>}
                                        </label>
                                        <div className="w-full">
                                            <div className="relative w-full pr-0 flex items-end">
                                                <input
                                                    id="cliente"
                                                    {...register('cliente')}
                                                    type="text"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setLoadingClients(true);
                                                        if(value == "") {
                                                            setAutocompleteClienteResults([]);
                                                            setClienteSelected(null);
                                                        }
                                                        if (value.length > 2) {
                                                            fetch(`/api/clientes/search?q=${value}`)
                                                                .then(response => response.json())
                                                                .then(data => {
                                                                    setAutocompleteClienteResults(data.clientes);
                                                                    setLoadingClients(false);
                                                                });
                                                        } else {
                                                            setLoadingClients(false);
                                                        }
                                                    }}
                                                    onFocus={() => setIndexFocused(1)}
                                                />
                                                {(loadingClients || loadingCliente) && <div className="absolute -right-2 top-2 md:top-1">
                                                    <div className="absolute -top-1 -left-2 w-11 h-11 bg-transparent md:bg-white opacity-70"></div>
                                                    <Loader texto="" />
                                                </div>}
                                                {(role === USER_ROLE.gerente || role === USER_ROLE.encargado || role === USER_ROLE.cobranza)
                                                    && <button
                                                        type="button"
                                                        className={`ml-2 flex items-center px-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${loadingClients ? 'cursor-not-allowed opacity-50' : ''}`}
                                                        onClick={() => {
                                                            router.push(`/modulos/configuraciones/clientes${clienteSelected ? `?id=${clienteSelected._id}` : ''}`);
                                                        }}
                                                    >
                                                        <LiaPencilAltSolid size="1.6rem" />
                                                    </button>}
                                            </div>
                                            {indexFocused == 1 && autocompleteClienteResults.length > 0 && (
                                                <ul className="absolute z-10 border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full max-w-xs">
                                                    {autocompleteClienteResults.map(cliente => (
                                                        <li
                                                            key={cliente._id}
                                                            className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                            onClick={async () => {
                                                                try {
                                                                    setLoadingCliente(true);
                                                                    setValue('cliente', cliente.nombre);
                                                                    // Primero, obtener el cliente completo desde la API
                                                                    const clienteResp = await fetch(`/api/clientes?id=${cliente._id}`);
                                                                    const clienteData = await clienteResp.json();
                                                                    console.log("Cliente Data:", clienteData);
                                                                    if (clienteResp.ok && clienteData.ok) {
                                                                        setClienteSelected(clienteData.cliente);
                                                                        setAutocompleteClienteResults([]);
                                                                        // Setear documentoTributarioId si corresponde
                                                                        if(session.user.role == USER_ROLE.gerente || session.user.role == USER_ROLE.encargado || session.user.role == USER_ROLE.cobranza) {
                                                                            if (clienteData.cliente.documentoTributarioId) {
                                                                                setValue("documentoTributarioId", documentosTributarios.find(documento => documento._id == clienteData.cliente.documentoTributarioId)?._id);
                                                                            }
                                                                        }
                                                                        if (clienteData.cliente.direccionesDespacho?.length === 1) {
                                                                            setValue("direccionDespachoId", clienteData.cliente.direccionesDespacho[0].direccionId._id);
                                                                        }
                                                                        setValue("cliente", clienteData.cliente.nombre);
                                                                        // Ahora cargar los precios
                                                                        const preciosResp = await fetch(`/api/clientes/precios?clienteId=${cliente._id}`);
                                                                        const preciosData = await preciosResp.json();
                                                                        if (preciosResp.ok && preciosData.ok) {
                                                                            console.log("Precios Data:", preciosData);
                                                                            setPrecios(preciosData.precios.precios);
                                                                        } else {
                                                                            console.error("Error fetching precios:", preciosData.error);
                                                                            toast.error("Error al cargar los precios del cliente.", {
                                                                                position: "top-right",
                                                                                autoClose: 5000,
                                                                                hideProgressBar: false,
                                                                                closeOnClick: true,
                                                                                pauseOnHover: true,
                                                                                draggable: true,
                                                                                progress: undefined,
                                                                            });
                                                                        }
                                                                    } else {
                                                                        toast.error("No se pudo cargar el cliente seleccionado.", {
                                                                            position: "top-right",
                                                                            autoClose: 5000,
                                                                            hideProgressBar: false,
                                                                            closeOnClick: true,
                                                                            pauseOnHover: true,
                                                                            draggable: true,
                                                                            progress: undefined,
                                                                        });
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Fetch error:", error);
                                                                    toast.error("Error al cargar los datos del cliente.", {
                                                                        position: "top-right",
                                                                        autoClose: 5000,
                                                                        hideProgressBar: false,
                                                                        closeOnClick: true,
                                                                        pauseOnHover: true,
                                                                        draggable: true,
                                                                        progress: undefined,
                                                                    });
                                                                } finally {
                                                                    setLoadingCliente(false);
                                                                }
                                                            }}
                                                        >
                                                            <p>{cliente.nombre}</p>
                                                            <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>}

                                {/*EDICIÓN DE DIRECCIÓN DE DESPACHO */}
                                {clienteSelected && editDireccionDespacho && <div className="w-full pr-0 md:pr-4">
                                    <div className="relative w-full">
                                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                        <div className="flex">
                                            <Autocomplete
                                                apiKey={googleMapsApiKey}
                                                onPlaceSelected={(place) => {
                                                    handlePlaceChanged(place);
                                                }}
                                                options={{
                                                    types: ['address'],
                                                    componentRestrictions: { country: 'cl' }
                                                }}
                                                ref={autocompleteRef}
                                                defaultValue={''}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                className={`ml-2 flex items-center pl-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${savingPlace ? 'cursor-not-allowed opacity-50' : ''}`}
                                                disabled={savingPlace}
                                                onClick={async () => {
                                                    setSavingPlace(true);
                                                    if (!selectedPlace) {
                                                        toast.error("Seleccione una dirección válida antes de guardar.");
                                                        setSavingPlace(false);
                                                        return;
                                                    }
                                                    try {
                                                        const resp = await fetch('/api/ventas/direccionDespacho', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                clienteId: clienteSelected._id,
                                                                direccion: {
                                                                    nombre: selectedPlace.formatted_address,
                                                                    latitud: selectedPlace.geometry.location.lat(),
                                                                    longitud: selectedPlace.geometry.location.lng(),
                                                                    apiId: selectedPlace.place_id
                                                                },
                                                                direccionId: false,
                                                            })
                                                        });
                                                        console.log("RESP", resp);
                                                        const result = await resp.json();
                                                        console.log("RESULT", result);
                                                        if (resp.ok) {
                                                            // Agregar la nueva dirección al cliente actual
                                                            const nuevaDireccion = {
                                                                direccionId: result.direccion,
                                                                comentario: null
                                                            };
                                                            setClienteSelected(prev => ({
                                                                ...prev,
                                                                direccionesDespacho: [...(prev.direccionesDespacho || []), nuevaDireccion]
                                                            }));
                                                            setValue("direccionDespachoId", result.direccion._id);
                                                            toast.success("Dirección agregada exitosamente.");
                                                            setEditDireccionDespacho(false);
                                                        } else {
                                                            toast.error(result.error || "No se pudo agregar la dirección.");
                                                        }
                                                    } catch {
                                                        toast.error("Error al guardar la dirección.");
                                                    } finally {
                                                        setSavingPlace(false);
                                                    }
                                                }}
                                            >
                                                <FaCheck className="mr-2" size="1.6rem" />
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 flex items-center px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-semibold"
                                                onClick={() => {
                                                    setEditDireccionDespacho(false);
                                                }}
                                            >
                                                <FaTimes size="1.6rem" />
                                            </button>
                                        </div>
                                        {autocompleteResults.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                {autocompleteResults.map((result, index) => (
                                                    <li
                                                        key={index}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSelectPlace(result)}
                                                    >
                                                        {result.formatted_address}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>}

                                {/* DIRECCION DESPACHO */}
                                {clienteSelected && !editDireccionDespacho && <div className="w-full pr-0 md:pr-4 flex">
                                    <div className="w-full">
                                        <label htmlFor="direccionesDespacho" className="block text-sm font-medium text-gray-700">Dirección de despacho</label>
                                        <select
                                            id="direccionDespachoId"
                                            {...register('direccionDespachoId')}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        >
                                            <option value="">Retiro en local</option>
                                            {clienteSelected.direccionesDespacho
                                                && clienteSelected.direccionesDespacho.length > 0
                                                && clienteSelected.direccionesDespacho.map(dir => (
                                                    <option key={dir.direccionId._id} value={dir.direccionId._id}>
                                                        {dir.direccionId.nombre}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                                        onClick={() => {
                                            setEditDireccionDespacho(true);
                                        }}
                                    >
                                        <MdAddLocationAlt size="1.8rem" />
                                    </button>
                                </div>}

                                {/* DOCUMENTO TRIBUTARIO */}
                                {(session.user.role === USER_ROLE.gerente || session.user.role === USER_ROLE.cobranza || session.user.role === USER_ROLE.encargado) 
                                    && clienteSelected && tipoOrden == 1 && <div className="w-full pr-0 md:pr-4">
                                    <label htmlFor="documentoTributarioId" className="block text-sm font-medium text-gray-700">Documento Tributario</label>
                                    <select id="documentoTributarioId" {...register('documentoTributarioId')}
                                        onChange={(e) => {
                                            setDocumentoTributarioSeleccionado(documentosTributarios.find(documento => documento._id == e.target.value));
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                        <option value="">Seleccione un documento</option>
                                        {documentosTributarios.length && documentosTributarios.map(documento => (
                                            <option key={documento._id} value={documento._id}>{documento.nombre}</option>
                                        ))}
                                    </select>
                                </div>}
                            </fieldset>}

                            {/* TRASLADO */}
                            {tipoOrden == 2 && <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
                                <legend className="font-bold text-gray-700 px-2">Detalle de Traslado</legend>
                                <div className="w-full">
                                    <div className="w-full pr-0 md:pr-4">
                                        <label htmlFor="empresaOrigen" className="block text-sm font-medium text-gray-700">
                                            Empresa de origen
                                            {empresaOrigen != null && empresaOrigen.enQuiebra && <span className="bg-orange-600 text-white rounded-md py-0 px-2 text-xs mx-1">EN QUIEBRA</span>}
                                        </label>
                                        <div className="w-full">
                                            <div className="relative w-full pr-0 flex items-end">
                                                <input
                                                    id="empresaOrigen"
                                                    {...register('empresaOrigen')}
                                                    type="text"
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setLoadingClients(true);
                                                        if (value.length > 2) {
                                                            fetch(`/api/clientes/search?q=${value}`)
                                                                .then(response => response.json())
                                                                .then(data => {
                                                                    setAutocompleteClienteResults(data.clientes);
                                                                    setLoadingClients(false);
                                                                });
                                                        } else setLoadingClients(false);
                                                    }}
                                                    onFocus={() => setIndexFocused(2)}
                                                />
                                                {indexFocused == 2 && (loadingClients || loadingCliente) && <div className="absolute -right-2 top-1">
                                                    <div className="absolute -top-1 -left-2 w-11 h-11 bg-white opacity-70"></div>
                                                    <Loader texto="" />
                                                </div>}
                                            </div>
                                            {indexFocused == 2 && autocompleteClienteResults.length > 0 && (
                                                <ul className="absolute z-10 border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full">
                                                    {autocompleteClienteResults.map(cliente => (
                                                        <li
                                                            key={cliente._id}
                                                            className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                            onClick={async () => {
                                                                try {
                                                                    setLoadingCliente(true);
                                                                    setValue('cliente', cliente.nombre);
                                                                    // Primero, obtener el cliente completo desde la API
                                                                    const clienteResp = await fetch(`/api/clientes?id=${cliente._id}`);
                                                                    const clienteData = await clienteResp.json();
                                                                    console.log("Cliente Data:", clienteData);
                                                                    if (clienteResp.ok && clienteData.ok) {
                                                                        setClienteSelected(clienteData.cliente);
                                                                        setAutocompleteClienteResults([]);
                                                                        // Setear documentoTributarioId si corresponde
                                                                        if (clienteData.cliente.documentoTributarioId) {
                                                                            setValue("documentoTributarioId", documentosTributarios.find(documento => documento._id == clienteData.cliente.documentoTributarioId)?._id);
                                                                        }
                                                                        if (clienteData.cliente.direccionesDespacho?.length === 1) {
                                                                            setValue("direccionDespachoId", clienteData.cliente.direccionesDespacho[0].direccionId._id);
                                                                        }
                                                                        // Setear tipoRegistro si corresponde
                                                                        if (clienteData.cliente.ordenCompra === true) {
                                                                            setValue("tipoRegistro", 3);
                                                                            setRegistroSelected(3);
                                                                        }
                                                                        setValue("cliente", clienteData.cliente.nombre);
                                                                        // Ahora cargar los precios
                                                                        const preciosResp = await fetch(`/api/clientes/precios?clienteId=${cliente._id}`);
                                                                        const preciosData = await preciosResp.json();
                                                                        if (preciosResp.ok && preciosData.ok) {
                                                                            setPrecios(preciosData.precios.precios);
                                                                        } else {
                                                                            console.error("Error fetching precios:", preciosData.error);
                                                                            toast.error("Error al cargar los precios del cliente.", {
                                                                                position: "top-right",
                                                                                autoClose: 5000,
                                                                                hideProgressBar: false,
                                                                                closeOnClick: true,
                                                                                pauseOnHover: true,
                                                                                draggable: true,
                                                                                progress: undefined,
                                                                            });
                                                                        }
                                                                    } else {
                                                                        toast.error("No se pudo cargar el cliente seleccionado.", {
                                                                            position: "top-right",
                                                                            autoClose: 5000,
                                                                            hideProgressBar: false,
                                                                            closeOnClick: true,
                                                                            pauseOnHover: true,
                                                                            draggable: true,
                                                                            progress: undefined,
                                                                        });
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Fetch error:", error);
                                                                    toast.error("Error al cargar los datos del cliente.", {
                                                                        position: "top-right",
                                                                        autoClose: 5000,
                                                                        hideProgressBar: false,
                                                                        closeOnClick: true,
                                                                        pauseOnHover: true,
                                                                        draggable: true,
                                                                        progress: undefined,
                                                                    });
                                                                } finally {
                                                                    setLoadingCliente(false);
                                                                }
                                                            }}
                                                        >
                                                            <p>{cliente.nombre}</p>
                                                            <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/*EDICIÓN DE ORIGEN */}
                                {indexFocused == 2 && clienteSelected && !editDireccionDespacho && <div className="w-full pr-0 md:pr-4">
                                    <div className="relative w-full">
                                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                        <div className="flex">
                                            <Autocomplete
                                                apiKey={googleMapsApiKey}
                                                onPlaceSelected={(place) => {
                                                    handlePlaceChanged(place);
                                                }}
                                                options={{
                                                    types: ['address'],
                                                    componentRestrictions: { country: 'cl' }
                                                }}
                                                ref={autocompleteRef}
                                                defaultValue={''}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                className={`ml-2 flex items-center pl-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${savingPlace ? 'cursor-not-allowed opacity-50' : ''}`}
                                                disabled={savingPlace}
                                                onClick={async () => {
                                                    setSavingPlace(true);
                                                    if (!selectedPlace) {
                                                        toast.error("Seleccione una dirección válida antes de guardar.");
                                                        setSavingPlace(false);
                                                        return;
                                                    }
                                                    try {
                                                        const resp = await fetch('/api/ventas/direccionDespacho', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                clienteId: clienteSelected._id,
                                                                direccion: {
                                                                    nombre: selectedPlace.formatted_address,
                                                                    latitud: selectedPlace.geometry.location.lat(),
                                                                    longitud: selectedPlace.geometry.location.lng(),
                                                                    apiId: selectedPlace.place_id
                                                                },
                                                                direccionId: false,
                                                            })
                                                        });
                                                        console.log("RESP", resp);
                                                        const result = await resp.json();
                                                        console.log("RESULT", result);
                                                        if (resp.ok) {
                                                            // Agregar la nueva dirección al cliente actual
                                                            const nuevaDireccion = {
                                                                direccionId: result.direccion,
                                                                comentario: null
                                                            };
                                                            setClienteSelected(prev => ({
                                                                ...prev,
                                                                direccionesDespacho: [...(prev.direccionesDespacho || []), nuevaDireccion]
                                                            }));
                                                            setValue("direccionDespachoId", result.direccion._id);
                                                            toast.success("Dirección agregada exitosamente.");
                                                            setEditDireccionDespacho(false);
                                                        } else {
                                                            toast.error(result.error || "No se pudo agregar la dirección.");
                                                        }
                                                    } catch {
                                                        toast.error("Error al guardar la dirección.");
                                                    } finally {
                                                        setSavingPlace(false);
                                                    }
                                                }}
                                            >
                                                <FaCheck className="mr-2" size="1.6rem" />
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 flex items-center px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-semibold"
                                                onClick={() => {
                                                    setEditDireccionDespacho(false);
                                                }}
                                            >
                                                <FaTimes size="1.6rem" />
                                            </button>
                                        </div>
                                        {autocompleteResults.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                {autocompleteResults.map((result, index) => (
                                                    <li
                                                        key={index}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSelectPlace(result)}
                                                    >
                                                        {result.formatted_address}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>}

                                {indexFocused == 2 && clienteSelected && editDireccionDespacho && <div className="w-full pr-0 md:pr-4">
                                    <div className="relative w-full">
                                        <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                        <div className="flex">
                                            <Autocomplete
                                                apiKey={googleMapsApiKey}
                                                onPlaceSelected={(place) => {
                                                    handlePlaceChanged(place);
                                                }}
                                                options={{
                                                    types: ['address'],
                                                    componentRestrictions: { country: 'cl' }
                                                }}
                                                ref={autocompleteRef}
                                                defaultValue={''}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                className={`ml-2 flex items-center pl-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${savingPlace ? 'cursor-not-allowed opacity-50' : ''}`}
                                                disabled={savingPlace}
                                                onClick={async () => {
                                                    setSavingPlace(true);
                                                    if (!selectedPlace) {
                                                        toast.error("Seleccione una dirección válida antes de guardar.");
                                                        setSavingPlace(false);
                                                        return;
                                                    }
                                                    try {
                                                        const resp = await fetch('/api/ventas/direccionDespacho', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                clienteId: clienteSelected._id,
                                                                direccion: {
                                                                    nombre: selectedPlace.formatted_address,
                                                                    latitud: selectedPlace.geometry.location.lat(),
                                                                    longitud: selectedPlace.geometry.location.lng(),
                                                                    apiId: selectedPlace.place_id
                                                                },
                                                                direccionId: false,
                                                            })
                                                        });
                                                        console.log("RESP", resp);
                                                        const result = await resp.json();
                                                        console.log("RESULT", result);
                                                        if (resp.ok) {
                                                            // Agregar la nueva dirección al cliente actual
                                                            const nuevaDireccion = {
                                                                direccionId: result.direccion,
                                                                comentario: null
                                                            };
                                                            setClienteSelected(prev => ({
                                                                ...prev,
                                                                direccionesDespacho: [...(prev.direccionesDespacho || []), nuevaDireccion]
                                                            }));
                                                            setValue("direccionDespachoId", result.direccion._id);
                                                            toast.success("Dirección agregada exitosamente.");
                                                            setEditDireccionDespacho(false);
                                                        } else {
                                                            toast.error(result.error || "No se pudo agregar la dirección.");
                                                        }
                                                    } catch {
                                                        toast.error("Error al guardar la dirección.");
                                                    } finally {
                                                        setSavingPlace(false);
                                                    }
                                                }}
                                            >
                                                <FaCheck className="mr-2" size="1.6rem" />
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 flex items-center px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-semibold"
                                                onClick={() => {
                                                    setEditDireccionDespacho(false);
                                                }}
                                            >
                                                <FaTimes size="1.6rem" />
                                            </button>
                                        </div>
                                        {autocompleteResults.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                                                {autocompleteResults.map((result, index) => (
                                                    <li
                                                        key={index}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSelectPlace(result)}
                                                    >
                                                        {result.formatted_address}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>}

                                {/* DIRECCION DESPACHO */}
                                {indexFocused == 2 && clienteSelected && !editDireccionDespacho && <div className="w-full pr-0 md:pr-4 flex">
                                    <div className="w-full">
                                        <label htmlFor="direccionesDespacho" className="block text-sm font-medium text-gray-700">Dirección de despacho</label>
                                        <select
                                            id="direccionDespachoId"
                                            {...register('direccionDespachoId')}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        >
                                            <option value="">Seleccione dirección</option>
                                            {clienteSelected.direccionesDespacho
                                                && clienteSelected.direccionesDespacho.length > 0
                                                && clienteSelected.direccionesDespacho.map(dir => (
                                                    <option key={dir.direccionId._id} value={dir.direccionId._id}>
                                                        {dir.direccionId.nombre}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="ml-2 flex items-center px-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold h-11 mt-4"
                                        onClick={() => {
                                            setEditDireccionDespacho(true);
                                        }}
                                    >
                                        <MdAddLocationAlt size="1.8rem" />
                                    </button>
                                </div>}

                                {/* DOCUMENTO TRIBUTARIO */}
                                {clienteSelected && <div className="w-full pr-0 md:pr-4">
                                    <label htmlFor="documentoTributarioId" className="block text-sm font-medium text-gray-700">Documento Tributario</label>
                                    <select id="documentoTributarioId" {...register('documentoTributarioId')}
                                        onChange={(e) => {
                                            setDocumentoTributarioSeleccionado(documentosTributarios.find(documento => documento._id == e.target.value));
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                        <option value="">Seleccione un documento</option>
                                        {documentosTributarios.length && documentosTributarios.map(documento => (
                                            <option key={documento._id} value={documento._id}>{documento.nombre}</option>
                                        ))}
                                    </select>
                                </div>}

                                {/* REGISTRO */}
                                {clienteSelected && <div className="w-full pr-0 md:pr-4">
                                    <label htmlFor="tipoRegistro" className="block text-sm font-medium text-gray-700">Registro</label>
                                    <select name="tipoRegistro" id="tipoRegistro" {...register('tipoRegistro', { valueAsNumber: true })}
                                        onChange={(e) => {
                                            setRegistroSelected(e.target.value);
                                        }}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                        {TIPO_REGISTRO.map((registro) => (
                                            <option key={registro.value} value={registro.value}>{registro.label}</option>
                                        ))}
                                    </select>
                                </div>}
                            </fieldset>}

                            {/* OT */}
                            {tipoOrden == 3 && <fieldset className="border rounded-md px-4 pt-0 pb-2 space-y-4">
                                <legend className="font-bold text-gray-700 px-2">Detalle de orden</legend>
                                <div className="w-full flex-col mt-3 space-y-4">                                    
                                    <div className="w-full">
                                        <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Prestador</label>
                                        <select
                                            id="motivo"
                                            {...register('motivo')}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        >
                                            <option value="">Seleccione opción</option>
                                            <option value="2">AirLiquide - Coronel</option>
                                            <option value="6">Messer - Coronel</option>
                                            <option value="8">Messer - Santiago</option>
                                            <option value="9">Planta Envasado Biox</option>
                                            <option value="10">Linde Gas Chile S.A.</option>
                                        </select>
                                    </div>
                                     <div className="w-full">
                                        <label htmlFor="controlEnvase" className="block text-sm font-medium text-gray-700">Control de envase</label>
                                        <input
                                            id="controlEnvase"
                                            {...register(`controlEnvase`)}
                                            type="text"
                                            className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right"                                            
                                        />
                                    </div>                                    
                                    <div className="w-full">
                                        <label htmlFor="servicio" className="block text-sm font-medium text-gray-700">Servicio</label>
                                        <select
                                            id="servicio"
                                            {...register('servicio')}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        >
                                            <option value="">Seleccione servicio</option>
                                            <option value="1">Prueba hidrostática</option>
                                            <option value="2">Cambio de Válvula</option>
                                            <option value="3">Prueba hidrostática y cambio de válvula</option>
                                            <option value="4">Recarga cilindros</option>
                                        </select>
                                    </div>
                                </div>
                            </fieldset>}                            

                            {/* INFORMACION EXTRA */}
                            {(session.user.role == USER_ROLE.gerente || session.user.role == USER_ROLE.encargado || session.user.role == USER_ROLE.cobranza) && clienteSelected != null && (<div className="border rounded-md p-4">
                                <div className="flex flex-col w-full text-center justify-center items-center">
                                    <div className="mt-1">
                                        <p className="text-lg font-bold">{clienteSelected.nombre}</p>
                                        <p className="text-sm font-semibold">
                                            {clienteSelected.tipoPrecio == TIPO_PRECIO.mayorista ? <span className="bg-green-600 text-white rounded-md py-1 px-2 text-xs mr-2">MAYORISTA</span>
                                                : <span className="bg-orange-600 text-white rounded-md py-1 px-2 text-xs mx-2">MINORISTA</span>}
                                            &nbsp;{formatRUT(clienteSelected.rut)}</p>
                                        <p className="text-gray-400 text-xs mt-2"><span className={`${clienteSelected.credito ? "text-green-600" : "text-red-600"}`}>{clienteSelected.credito ? "CON" : "SIN"}&nbsp;CRÉDITO</span> / {clienteSelected.arriendo ? "CON" : "SIN"}&nbsp;ARRIENDO</p>
                                    </div>
                                </div>
                            </div>)}
                        </div>
                        
                        {/* SECCION DE PRECIOS */}
                        {(tipoOrden == 1 || tipoOrden == 4) && clienteSelected && <div className="mt-6">
                            <div className={`w-full ${clienteSelected != null && clienteSelected.credito ? '' : 'opacity-20'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-lg">Listado productos</p>
                                    <button
                                        type="button"
                                        className="h-12 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                        onClick={async () => {
                                            if(categorias.length == 0) {
                                                setLoadingCatalogo(true);
                                                await fetchCategorias();
                                                await fetchSubcategorias();
                                                setLoadingCatalogo(false);
                                            }                                            
                                            setPrecioData({
                                                categoriaId: "",
                                                subcategoriaCatalogoId: "",
                                                valor: getValues('precio'),
                                            });
                                            setModalSolicitudPrecio(true);
                                        }}
                                        disabled={loadingCatalogo}
                                    >
                                        {loadingCatalogo ? <Loader texto="Cargando..." /> : (session.user.role == USER_ROLE.gerente
                                            || session.user.role == USER_ROLE.cobranza
                                            || session.user.role === USER_ROLE.encargado) ? 'Nuevo producto' : 'Solicitar producto'}
                                    </button>
                                </div>
                                <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold">Cantidad</p>
                                    </div>
                                    <div className={`${(session.user.role == USER_ROLE.gerente
                                            || session.user.role == USER_ROLE.cobranza
                                            || session.user.role === USER_ROLE.encargado) ? 'w-3/12' : 'w-9/12'} pr-4`}>
                                        <p className="font-bold">ITEM</p>
                                    </div>
                                    {(session.user.role === USER_ROLE.gerente || session.user.role === USER_ROLE.cobranza || session.user.role === USER_ROLE.encargado) && <> 
                                        <div className="w-3/12 pr-4">
                                            <p className="font-bold text-center">Precio</p>
                                        </div>
                                        <div className="w-3/12 pr-4">
                                            <p className="font-bold text-center">SubTotal</p>
                                        </div>
                                    </>}                                    
                                </div>
                                {precios.map((precio, index) => (
                                    <div key={`precio_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-2 bg-gray-100 ${precios[index].seleccionado == true ? '' : 'opacity-50'}`}>
                                        <div className="w-3/12">
                                            <div className="flex">
                                                <input
                                                    id={`checkbox-${index}`}
                                                    type="checkbox"
                                                    className="block w-8 h-8 mt-1 mr-2"
                                                    onClick={(e) => {
                                                        const updatedPrecios = [...precios];
                                                        updatedPrecios[index].seleccionado = e.target.checked;
                                                        updatedPrecios[index].cantidad = e.target.checked ? 1 : 0;
                                                        setValue(`precios[${index}].cantidad`, e.target.checked ? 1 : 0);
                                                        setPrecios(updatedPrecios);
                                                    }}
                                                    {...register(`precios[${index}].seleccionado`)}
                                                />
                                                <input
                                                    id={`precios-${index}`}
                                                    {...register(`precios[${index}].cantidad`)}
                                                    type="number"
                                                    min={0}
                                                    max={999}
                                                    defaultValue={precio.cantidad || 0}
                                                    className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right"
                                                    onChange={(e) => {
                                                        const newCantidad = parseInt(e.target.value) || 0;
                                                        const updatedPrecios = [...precios];
                                                        updatedPrecios[index].cantidad = newCantidad;
                                                        setPrecios(updatedPrecios);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className={`${(session.user.role == USER_ROLE.gerente
                                            || session.user.role == USER_ROLE.cobranza
                                            || session.user.role === USER_ROLE.encargado) ? 'w-3/12' : 'w-9/12'} flex space-x-2`}>                                                
                                            {precio.subcategoriaCatalogoId.categoriaCatalogoId.elemento ? <div className='w-full'>
                                                <p className="font-bold text-lg">{precio.subcategoriaCatalogoId.categoriaCatalogoId.elemento}</p>
                                                <span className="relative -top-1">{precio.subcategoriaCatalogoId.cantidad} {precio.subcategoriaCatalogoId.unidad}</span>
                                            </div> : <div className='w-full'>
                                                <p className="font-bold text-lg">{precio.subcategoriaCatalogoId.categoriaCatalogoId.nombre}</p>
                                                <span className="relative -top-1">{precio.subcategoriaCatalogoId.nombre}</span>
                                            </div>}
                                            {precio.subcategoriaCatalogoId.categoriaCatalogoId.elemento &&<div className="w-full flex items-end justify-end text-xs space-x-1">
                                                {precio.subcategoriaCatalogoId.categoriaCatalogoId.esMedicinal && <span className="text-white bg-green-600 rounded px-2 h-4">MED</span>}
                                                {precio.subcategoriaCatalogoId.sinSifon && <span className="text-white bg-gray-600 rounded px-2 h-4">S/S</span>}
                                                {precio.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial && <span className="text-white bg-blue-600 rounded px-2 h-4">IND</span>}
                                            </div>}
                                        </div>
                                        {(session.user.role == USER_ROLE.gerente
                                            || session.user.role == USER_ROLE.cobranza
                                            || session.user.role === USER_ROLE.encargado) && <><div className="w-3/12 pr-4">
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
                                        </div></>}
                                    </div>
                                ))}

                            </div>
                        </div>}

                        {/* SELECTOR DE ITEMS */}
                        {(tipoOrden == 2 || tipoOrden == 3) && <div className="mt-6">
                            <div className={`w-full`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-lg">LISTADO DE ITEMS</p>
                                    <button
                                        type="button"
                                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                        onClick={() => {
                                            setItems([...items, { cantidad: 1, precio: 0, nombre: "" }]);
                                        }}
                                    >
                                        NUEVO ITEM
                                    </button>
                                </div>
                                <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold">CODIGO</p>
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold">ITEM</p>
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold">Propietario</p>
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold text-center">Fecha PH</p>
                                    </div>                                    
                                    <div className="w-2/12 pr-4">
                                        <p className="font-bold text-center">Estado</p>
                                    </div>
                                </div>
                                {items.map((item, index) => (
                                    <div key={`item_${index}`} className={`w-full flex items-center mb-0.5 pb-1 px-2 bg-gray-100`}>
                                        <div className="w-2/12">
                                            <div className="flex">
                                                <span className="font-bold mt-3 mr-2">1. </span>
                                                <input
                                                    id={`item-codigo-${index}`}
                                                    {...register(`items[${index}].codigo`)}
                                                    type="text"
                                                    min={0}
                                                    max={99}
                                                    defaultValue={item.codigo || ""}
                                                    className="mt-1 mr-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right"
                                                    onChange={(e) => {
                                                        const newCodigo = e.target.value || "";
                                                        const updatedItems = [...items];
                                                        updatedItems[index].codigo = newCodigo;
                                                        setItems(updatedItems);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-4/12 pr-4">
                                            <p className="flex space-x-1 mt-1">
                                                <span className="font-bold text-xl">O2</span>
                                                <span className="mt-1">10 m3</span>
                                                <span className="text-xs text-white bg-blue-600 rounded px-2 pt-0.5 h-5 mt-1">MED</span>
                                                <span className="text-xs text-white bg-gray-600 rounded px-2 pt-0.5 h-5 mt-1">S/S</span>
                                                <span className="text-xs text-white bg-yellow-600 rounded px-2 pt-0.5 h-5 mt-1">IND</span>
                                            </p>
                                        </div>
                                        <div className="w-3/12 pr-4">
                                            <span className="text-xs border-gray-500 bg-gray-400 rounded px-2 pt-0 h-5 mr-2 text-white font-bold">TP</span>
                                            <span className="mt-1">Alexander Corraza</span>
                                        </div>
                                        <div className="w-2/12 pr-4">
                                            <div className="flex">
                                                <span className="font-bold mt-2 px-4">10/abr/2024</span>
                                                <span className="w-full font-bold text-sm text-right mt-2">
                                                    hace 10 días
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-2/12 pr-4">
                                            <div className="flex text-sm space-x-2 justify-end">
                                                <span className="w-4 h-4 border-gray-600 border-2 rounded-full bg-gray-400 mt-2"></span>
                                                <span className="font-bold mt-1">VACÍO</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>}

                        {/* Botones de acción */}
                        <div className="fixed left-0 w-full flex justify-end bottom-0 bg-white pt-2 pb-2 px-2 md:px-6 gap-4">
                            <button className="flex w-full md:w-3/12 justify-center rounded-md bg-gray-600 px-3 h-10 pt-2 text-white shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 mr-4"
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.back()
                                }}>CANCELAR</button>
                            <button
                                className={`px-4 h-10 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isVentaDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={isVentaDisabled()}
                            >
                                {creandoOrden ? <div className="relative mt-0"><Loader texto={redirecting ? "VOLVIENDO" : "CREANDO"} /></div> : "CREAR VENTA"}
                            </button>
                        </div>

                    </form> : <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
                        <p className="text-xl font-bold">Iniciando orden</p>
                    </div>}
                </div>
            </div>
            <ToastContainer />

            {modalSolicitudPrecio && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-12 p-5 border w-80 mx-auto shadow-lg rounded-md bg-white">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={handleCancel}
                                className="text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
                                aria-label="Cerrar"
                                type="button"
                            >
                                <LiaTimesSolid />
                            </button>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Solicitar precio</h3>
                            <div className="mt-2">
                                <div className="mt-4 space-y-3 text-left">
                                    <div className="flex flex-col relative">
    <label htmlFor="categoriaInput" className="text-sm text-gray-500">Categoría</label>
    <div className="relative">
        <input
            id="categoriaInput"
            type="text"
            value={busquedaCategoria}
            onChange={(e) => {
                const valor = e.target.value;
                setBusquedaCategoria(valor);
                
                // Limpiar selección si se está editando
                if (valor !== categoriaNombreSeleccionada) {
                    setCategoriaIdSeleccionada("");
                    setValue("categoriaId", "");
                    setValue("subcategoriaCatalogoId", "");
                    setPrecioData((prev) => ({
                        ...prev,
                        categoriaId: "",
                        subcategoriaCatalogoId: "",
                        valor: getValues('precio'),
                    }));
                    setSubcategorias([]);
                }
                
                buscarCategorias(valor);
            }}
            onFocus={() => {
                if (busquedaCategoria && categoriasFiltradas.length === 0) {
                    buscarCategorias(busquedaCategoria);
                }
            }}
            onBlur={() => {
                // Ocultar resultados después de un pequeño delay para permitir clicks
                setTimeout(() => {
                    setMostrarResultadosCategoria(false);
                }, 200);
            }}
            className="border rounded-md px-3 py-2 pr-10 text-base w-full"
            placeholder="Buscar categoría..."
        />
        
        {/* Ícono de lupa */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        
        {/* Dropdown de resultados */}
        {mostrarResultadosCategoria && categoriasFiltradas.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                {categoriasFiltradas.map((categoria) => (
                    <li
                        key={categoria._id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevenir que se dispare onBlur antes del click
                            seleccionarCategoria(categoria);
                        }}
                    >
                        <p className="font-medium">{categoria.nombre}</p>
                    </li>
                ))}
            </ul>
        )}
        
        {/* Mensaje cuando no hay resultados */}
        {mostrarResultadosCategoria && busquedaCategoria.length >= 2 && categoriasFiltradas.length === 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 p-3">
                <p className="text-gray-500 text-center">No se encontraron categorías</p>
            </div>
        )}
    </div>
</div>
                                    <div className="flex flex-col">
                                        <label htmlFor="subcategoriaId" className="text-sm text-gray-500">Subcategoría</label>
                                        <select
                                            {...register("subcategoriaCatalogoId")}
                                            value={precioData.subcategoriaCatalogoId || ""}
                                            onChange={(e) => {
                                                setPrecioData((prev) => ({
                                                    ...prev,
                                                    subcategoriaCatalogoId: e.target.value
                                                }));
                                                setValue("subcategoriaCatalogoId", e.target.value);
                                            }}
                                            className="border rounded-md px-3 py-2 text-base"
                                        >
                                            <option value="">Seleccione una subcategoría</option>
                                            {subcategorias &&
                                                subcategorias.filter(sc => sc.categoriaCatalogoId === categoriaIdSeleccionada).map((subcategoria) => (
                                                    <option key={subcategoria._id} value={subcategoria._id}>
                                                        {subcategoria.nombre}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    {(role == USER_ROLE.gerente || role == USER_ROLE.encargado || role == USER_ROLE.cobranza)
                                        && <div className="flex flex-col">
                                            <label htmlFor="precio" className="text-sm text-gray-500">Precio</label>
                                            <div className="flex items-center">
                                                <span className="text-gray-500 mr-1">$</span>
                                                <input
                                                    {...register("precio", { required: true })}
                                                    value={precioData.valor}
                                                    type="text"
                                                    id="precio"
                                                    name="precio"
                                                    className="border rounded-md px-3 py-2 text-base w-full text-right"
                                                    placeholder="Precio"
                                                    onChange={handlePrecioInputChange}
                                                    inputMode="numeric"
                                                />
                                            </div>
                                        </div>}
                                </div>
                            </div>
                            <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || formInvalid()}
                                    className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${(saving || formInvalid()) ? 'opacity-50 cursor-not-allowed' : ''}`}                                >
                                    {saving && <div className="absolute -mt-1"><Loader texto="" /></div>}
                                    {(session.user.role == USER_ROLE.gerente
                                        || session.user.role == USER_ROLE.encargado
                                        || session.user.role == USER_ROLE.cobranza) ? 'NUEVO' : 'SOLICITAR'} PRECIO
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}