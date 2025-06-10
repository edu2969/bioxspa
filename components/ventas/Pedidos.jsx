"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import formatRUT from '@/app/utils/idetificationDocument';
import { TIPO_PRECIO, USER_ROLE } from '@/app/utils/constants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LiaTimesSolid } from 'react-icons/lia';
import Loader from '../Loader';
import { socket } from "@/lib/socket-client";

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

export default function Pedidos({ session }) {
    const router = useRouter();
    const { register, handleSubmit, setValue } = useForm();
    const [usuarios, setUsuarios] = useState([]);
    const [precios, setPrecios] = useState([]);
    const [loadingForm, setLoadingForm] = useState(false);
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

    const fetchCategorias = async () => {
        try {
            const response = await fetch('/api/catalogo');
            const data = await response.json();
            console.log("CATEGORIAS", data);
            setCategorias(data);
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

    const onSubmit = async (data) => {
        console.log("DATA-SUBMIT", data);
        // Solo incluir los precios seleccionados como items de la venta
        const payload = {
            clienteId: clienteSelected?._id,
            usuarioId: data.usuarioId,
            documentoTributarioId: data.documentoTributarioId,
            items: precios
            .filter(item => item.seleccionado && item.cantidad > 0)
            .map(item => ({
                cantidad: parseInt(item.cantidad),
                precio: parseInt(item.valor),
                subcategoriaId: item.subcategoriaCatalogoId
            })),
        }
        console.log("PAYLOAD2", payload);
        setLoadingForm(true);
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
            if(resp.ok && result.ok) {
                toast.success("Venta creada exitosamente.", {
                    position: "top-center"
                });
                socket.emit("update-pedidos", { userId: session.user.id });
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
            setLoadingForm(false);
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

    return (
        <main className="w-full min-h-screen pt-0 overflow-y-auto bg-white sm:px-1 md:px-4">
            <div className="w-full pb-2 pt-14 h-screen overflow-y-auto">
                <div className="mx-auto">
                    <form onSubmit={handleSubmit(onSubmit)} className="px-2 sm:px-4 md:px-8 space-y-4 md:space-y-6">
                        <div className="w-full flex flex-col md:flex-row">
                            <div className="w-full md:w-9/12">
                                {session.role == USER_ROLE.manager && <div className="w-full flex">
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
                                        <input
                                            id="cliente"
                                            {...register('cliente')}
                                            type="text"
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value.length > 2) {
                                                    fetch(`/api/clientes/search?q=${value}`)
                                                        .then(response => response.json())
                                                        .then(data => setAutocompleteClienteResults(data.clientes));
                                                }
                                            }}
                                        />
                                        {autocompleteClienteResults.length > 0 && (
                                            <ul className="absolute z-10 w-full border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white">
                                                {autocompleteClienteResults.map(cliente => (
                                                    <li
                                                        key={cliente._id}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                        onClick={() => {
                                                            setValue('cliente', cliente.nombre);
                                                            setClienteSelected(cliente);
                                                            setAutocompleteClienteResults([]);
                                                            if (cliente.documentoTributarioId) {
                                                                setValue("documentoTributarioId", documentosTributarios.find(documento => documento._id == cliente.documentoTributarioId)?._id);
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
                                                                    } else {
                                                                        console.error("Error fetching precios:", data.error);
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
                                                                })
                                                                .catch(error => {
                                                                    console.error("Fetch error:", error);
                                                                    toast.error("Error al cargar los precios del cliente.", {
                                                                        position: "top-right",
                                                                        autoClose: 5000,
                                                                        hideProgressBar: false,
                                                                        closeOnClick: true,
                                                                        pauseOnHover: true,
                                                                        draggable: true,
                                                                        progress: undefined,
                                                                    });
                                                                });
                                                        }}
                                                    >
                                                        <p>{cliente.nombre}</p>
                                                        <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="w-full md:w-3/12 pr-0 md:pr-4">
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
                                    <div className="w-full md:w-3/12 pr-0 md:pr-4">
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
                                </div>
                            </div>

                            <div className="w-full md:w-3/12 text-center">
                                {clienteSelected != null && (<div className="mt-1">
                                    <p className="text-lg font-bold">{clienteSelected.nombre}</p>
                                    <p className="text-sm font-semibold">
                                        {clienteSelected.tipoPrecio == TIPO_PRECIO.mayorista ? <span className="bg-green-600 text-white rounded-md py-1 px-2 text-xs mr-2">MAYORISTA</span>
                                            : <span className="bg-orange-600 text-white rounded-md py-1 px-2 text-xs mx-2">MINORISTA</span>}
                                        &nbsp;{formatRUT(clienteSelected.rut)}</p>
                                    <p className="text-gray-400 text-xs mt-2">{clienteSelected.credito ? "CON" : "SIN"}&nbsp;CREDITO / {clienteSelected.arriendo ? "CON" : "SIN"}&nbsp;ARRIENDO</p>
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

                        <div className={`w-full ${clienteSelected != null ? '' : 'opacity-20'}`}>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg">PRECIOS CARGADOS</p>
                                <button
                                    type="button"
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                    onClick={() => setModalSolicitudPrecio(true)}
                                >
                                    SOLICITAR PRECIO
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
                                                className="block w-10 h-10 mr-2"
                                                onClick={(e) => {
                                                    const updatedPrecios = [...precios];
                                                    updatedPrecios[index].seleccionado = e.target.checked;
                                                    updatedPrecios[index].cantidad = e.target.checked ? 1 : 0;
                                                    setValue(`precios[${index}].cantidad`, e.target.checked ? 1 : 0);
                                                    console.log("PRECIOS", updatedPrecios);
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
                            <div className="w-full flex mt-6 justify-end">
                                <button className="flex w-full md:w-3/12 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.back()
                                    }}>&lt;&lt; CANCELAR</button>
                                <button
                                    className={`flex w-full md:w-3/12 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1 ${isCreateVentaDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    type="submit"
                                    disabled={isCreateVentaDisabled || loadingForm}
                                >
                                    CREAR VENTA
                                </button>
                            </div>
                            {/*<div className="w-full flex justify-end mt-4">
                                <button
                                    type="button"
                                    disabled={!precios.some(precio => precio.seleccionado)}
                                    className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                    onClick={() => {
                                        const selectedItems = precios.filter(precio => precio.seleccionado);
                                        console.log("ITEM", selectedItems);
                                        const updatedItemsVenta = selectedItems.map(item => ({
                                            cantidad: item.cantidad || 1,
                                            subcategoriaId: item.subcategoriaCatalogoId,
                                            subcategoria: item.nombre,
                                            precio: item.valor
                                        }));
                                        setItemsVenta(prev => [...prev, ...updatedItemsVenta]);
                                    }}
                                >
                                    <div className="flex">
                                        <BiCartDownload size="1.25rem" className="text-white mr-2" />
                                        <span className="text-sm font-semibold">CARGAR SELECCIONADOS</span>
                                    </div>
                                </button>
                            </div>*/}
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
                                                    subcategoriaCatalogoId: ""
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
                                </div>
                            </div>
                            <div className={`mt-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}                                >
                                    {saving && <div className="absolute -mt-1"><Loader texto="" /></div>}
                                    SOLICITAR PRECIO
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