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
    const [documentoTributarioSeleccionado, setDocumentoTributarioSeleccionado] = useState(null);
    const [registroSelected, setRegistroSelected] = useState(0);
    const [total, setTotal] = useState(0);
    const [modalSolicitudPrecio, setModalSolicitudPrecio] = useState(false);
    const [precioData, setPrecioData] = useState({});
    const [saving, setSaving] = useState(false);
    const [categoriaIdSeleccionada, setCategoriaIdSeleccionada] = useState("");
    const [loading, setLoading] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [creandoVenta, setCreandoVenta] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [loadingClients, setLoadingClients] = useState(false);
    const [role, setRole] = useState(-1);
    const [editDireccionDespacho, setEditDireccionDespacho] = useState(false);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const autocompleteRef = useRef(null);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [savingPlace, setSavingPlace] = useState(false);

    const isVentaDisabled = () => {
        return  redirecting ||!precios.length  
            || !precios.some(precio => precio.seleccionado) 
            || precios.some(precio => precio.cantidad <= 0 && precio.seleccionado) 
            || !clienteSelected || !getValues("direccionDespachoId") 
            || !getValues("usuarioId") || !getValues("documentoTributarioId");
    }

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
        console.log("USERS", data.users);
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
            console.log("CATEGORIAS", data);
            setCategorias(data.sort((a, b) => a.nombre < b.nombre ? -1 : 1));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching categorias:', error);
        }
    }

    const fetchSubcategorias = async () => {
        try {
            const response = await fetch('/api/catalogo/subcategoria');
            const data = await response.json();
            console.log("SUBCATEGORIAS", data);
            setSubcategorias(data);
        } catch (error) {
            console.error('Error fetching subcategorias:', error);
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
        setCreandoVenta(true);
        // Solo incluir los precios seleccionados como items de la venta
        const payload = {
            clienteId: clienteSelected?._id,
            usuarioId: data.usuarioId,
            documentoTributarioId: data.documentoTributarioId,
            direccionDespachoId: data.direccionDespachoId,
            comentario: data.comentario || "",
            items: precios
                .filter(item => item.seleccionado && item.cantidad > 0)
                .map(item => ({
                    cantidad: parseInt(item.cantidad),
                    precio: parseInt(item.valor),
                    subcategoriaId: item.subcategoriaCatalogoId
                })),
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
                router.push('/modulos');
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
            setCreandoVenta(false);
        }
    };

    const handleCancel = () => {
        setModalSolicitudPrecio(false);
        setPrecioData({});
        setCategoriaIdSeleccionada("");
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
    }

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
                fetchCategorias();
                fetchSubcategorias();
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
        if(!session) return true;
        const role = session.user?.role || -1;
        return !getValues('subcategoriaCatalogoId') || !getValues('categoriaId') 
            || ([USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado].includes(role) && !getValues('precio'));
    };

    return (
        <main className="w-full min-h-screen pt-0 overflow-y-auto bg-white sm:px-1 md:px-4">
            <div className="w-full pb-2 mt-14 h-[calc(100vh-106px)] overflow-y-auto">
                <div className="mx-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="px-2 sm:px-4 md:px-8 space-y-4 md:space-y-6">
                        <div className="w-full flex flex-col md:flex-row">
                            <div className="w-full md:w-9/12">
                                {session.role == USER_ROLE.gerente && <div className="w-full flex">
                                    <div className="w-full md:w-4/12 pr-0 md:pr-4">
                                        <label htmlFor="usuarioId" className="block text-sm font-medium text-gray-700">Usuario</label>
                                        <select id="usuarioId" {...register('usuarioId')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione un usuario</option>
                                            {usuarios.length && usuarios.map(usuario => (
                                                <option key={usuario._id} value={usuario._id}>{usuario.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>}
                                <div className="w-full md:flex mt-3 space-y-4 md:space-y-0">
                                    <div className="w-full md:w-4/12 pr-0 md:pr-4">
                                        <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
                                            Cliente
                                            {clienteSelected != null && clienteSelected.enQuiebra && <span className="bg-orange-600 text-white rounded-md py-0 px-2 text-xs mx-1">EN QUIEBRA</span>}
                                        </label>
                                        <div className="relative">
                                            <div className="w-full pr-0 flex items-end">
                                                <input
                                                    id="cliente"
                                                    {...register('cliente')}
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
                                                />
                                                {loadingClients && <div className="absolute -right-2 top-1">
                                                    <Loader texto="" />
                                                </div>}
                                                {(role === USER_ROLE.gerente || role === USER_ROLE.encargado || role === USER_ROLE.cobranza) 
                                                && <button
                                                    type="button"
                                                    className={`ml-2 flex items-center px-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold ${loadingClients ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    onClick={() => {
                                                        router.push(`/modulos/configuraciones/clientes${clienteSelected ? `?id=${clienteSelected._id}` : '' }`);
                                                    }}
                                                >
                                                    <LiaPencilAltSolid size="1.6rem" />
                                                </button>}
                                            </div>
                                            {autocompleteClienteResults.length > 0 && (
                                                <ul className="absolute z-10 border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white w-full">
                                                    {autocompleteClienteResults.map(cliente => (
                                                        <li
                                                            key={cliente._id}
                                                            className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                            onClick={async () => {
                                                                try {
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
                                                                        if(clienteData.cliente.direccionesDespacho?.length === 1) {                                                                            
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
                                    {clienteSelected && <>
                                        {!editDireccionDespacho ? <div className="w-full md:w-5/12 pr-0 md:pr-4 flex items-end">
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
                                                className="ml-2 flex items-center px-2 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-semibold"
                                                onClick={() => {
                                                    setEditDireccionDespacho(true);
                                                }}
                                            >
                                                <MdAddLocationAlt size="1.6rem" />
                                            </button>
                                        </div> : <div className="w-full md:w-5/12 pr-0 md:pr-4 flex items-end">
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
                                                                        direccion: {
                                                                            nombre: selectedPlace.formatted_address,
                                                                            latitud: selectedPlace.geometry.location.lat(),
                                                                            longitud: selectedPlace.geometry.location.lng(),
                                                                            apiId: selectedPlace.place_id
                                                                        },
                                                                        direccionId: false,
                                                                    })
                                                                });
                                                                const result = await resp.json();
                                                                if (resp.ok && result.ok) {
                                                                    // Agregar la nueva dirección al cliente actual
                                                                    const nuevaDireccion = result.direccion;
                                                                    setClienteSelected(prev => ({
                                                                        ...prev,
                                                                        direccionesDespacho: [...(prev.direccionesDespacho || []), nuevaDireccion]
                                                                    }));
                                                                    setValue("direccionDespachoId", nuevaDireccion.direccionId._id);
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
                                        <div className="w-full md:w-2/12 pr-0 md:pr-4">
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
                                        </div>
                                        {documentoTributarioSeleccionado != null && documentoTributarioSeleccionado.nombre.startsWith("Guia") && <div className="w-full md:w-3/12 pr-0 md:pr-4">
                                            <label htmlFor="tipoGuia" className="block text-sm font-medium text-gray-700">Motivo guía</label>
                                            <select name="detalleguiadespacho" {...register('tipoGuia', { valueAsNumber: true })}
                                                id="detalleguiadespacho" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                                {TIPO_GUIA.map((guia) => (
                                                    <option key={guia.value} value={guia.value}>{guia.label}</option>
                                                ))}
                                            </select>
                                        </div>}
                                        <div className="w-full md:w-2/12 pr-0 md:pr-4">
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
                                        </div>
                                    </>}
                                </div>
                                <div className="w-full md:w-1/2 mt-4">
                                    <label htmlFor="comentario" className="block text-sm font-medium text-gray-700">Comentario</label>
                                    <textarea
                                        id="comentario"
                                        {...register('comentario')}
                                        rows={3}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                        placeholder="Comentario para la venta"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="w-full md:w-3/12 text-center">
                                {clienteSelected != null && (<div className="mt-1">
                                    <p className="text-lg font-bold">{clienteSelected.nombre}</p>
                                    <p className="text-sm font-semibold">
                                        {clienteSelected.tipoPrecio == TIPO_PRECIO.mayorista ? <span className="bg-green-600 text-white rounded-md py-1 px-2 text-xs mr-2">MAYORISTA</span>
                                            : <span className="bg-orange-600 text-white rounded-md py-1 px-2 text-xs mx-2">MINORISTA</span>}
                                        &nbsp;{formatRUT(clienteSelected.rut)}</p>
                                    <p className="text-gray-400 text-xs mt-2"><span className={`${clienteSelected.credito ? "text-green-600" : "text-red-600"}`}>{clienteSelected.credito ? "CON" : "SIN"}&nbsp;CRÉDITO</span> / {clienteSelected.arriendo ? "CON" : "SIN"}&nbsp;ARRIENDO</p>
                                </div>)}
                            </div>
                        </div>


                        {registroSelected == 3 && <div className="w-full flex mt-3">
                            <div className="w-full md:w-1/12 pr-4">
                                <label htmlFor="permanente" className="block text-sm font-medium text-gray-700">Permanente</label>
                                <input
                                    id="permanente"
                                    type="checkbox"
                                    {...register('permanente')}
                                    className="block w-6 h-6 m-2 mt-3"
                                />
                            </div>

                            <div className="w-full md:w-3/12 pr-4">
                                <label htmlFor="patente" className="block text-sm font-medium text-gray-700">Patente</label>
                                <input
                                    id="patente"
                                    {...register('patente')}
                                    type="text"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm uppercase"
                                />
                            </div>
                            <div className="w-full md:w-3/12 pr-4">
                                <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo</label>
                                <select
                                    id="motivo"
                                    {...register('motivo')}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                >
                                    <option value="">Seleccione motivo</option>
                                    <option value="1">Prueba hidrostática</option>
                                    <option value="2">Cambio de Válvula</option>
                                    <option value="3">Prueba hidrostática y cambio de válvula</option>
                                    <option value="4">Recarga cilindros</option>
                                </select>
                            </div>
                            <div className="w-full md:w-6/12 pr-4">
                                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción</label>
                                <textarea
                                    id="descripcion"
                                    {...register('descripcion')}
                                    rows="3"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                ></textarea>
                            </div>
                        </div>}

                        <div className={`w-full ${clienteSelected != null && clienteSelected.credito ? '' : 'opacity-20'}`}>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg">PRECIOS CARGADOS</p>
                                <button
                                    type="button"
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                    onClick={() => {
                                        setPrecioData({
                                            categoriaId: "",
                                            subcategoriaCatalogoId: "",
                                            valor: getValues('precio'),
                                        });
                                        setModalSolicitudPrecio(true);
                                    }}
                                >
                                    {(session.user.role == USER_ROLE.gerente 
                                        || session.user.role == USER_ROLE.cobranza
                                        || session.user.role === USER_ROLE.encargado) ? 'NUEVO' : 'SOLICITAR'} PRECIO
                                </button>
                            </div>
                            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-2 rounded-t-md uppercase text-sm sm:text-xs">
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold">Cantidad</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold">ITEM</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold text-center">Precio</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <p className="font-bold text-center">SubTotal</p>
                                </div>
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
                                                max={99}
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
                                    <div className="w-3/12 pr-4">
                                        <p className="font-bold text-lg">{precio.nombre.split("-")[0]}</p>
                                        <span className="relative -top-1">{precio.nombre.split("-")[1]}</span>
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
                                </div>
                            ))}
                            <div className="fixed left-0 w-full flex mt-6 justify-end bottom-2 bg-white pt-1 pb-2 px-2 md:px-6">
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
                                    {creandoVenta ? <div className="relative mt-0"><Loader texto={redirecting ? "VOLVIENDO" : "CREANDO"} /></div> : "CREAR VENTA"}
                                </button>
                            </div>
                        </div>

                    </form>
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
                                    <div className="flex flex-col">
                                        <label htmlFor="categoriaId" className="text-sm text-gray-500">Categoría</label>
                                        <select
                                            {...register("categoriaId")}
                                            value={categoriaIdSeleccionada || ""}
                                            onChange={async (e) => {
                                                const categoriaId = e.target.value;
                                                setPrecioData((prev) => ({
                                                    ...prev,
                                                    categoriaId,
                                                    subcategoriaCatalogoId: "",
                                                    valor: getValues('precio'),
                                                }));
                                                setCategoriaIdSeleccionada(categoriaId);
                                                setValue("categoriaId", categoriaId);
                                                setValue("subcategoriaCatalogoId", "");
                                                if (categoriaId) {
                                                    await fetchSubcategorias(categoriaId);
                                                } else {
                                                    setSubcategorias([]);
                                                }                                                
                                            }}
                                            className="border rounded-md px-3 py-2 text-base"
                                        >
                                            <option value="">Seleccione una categoría</option>
                                            {categorias && categorias.map((categoria) => (
                                                <option key={categoria._id} value={categoria._id}>
                                                    {categoria.nombre}
                                                </option>
                                            ))}
                                        </select>
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