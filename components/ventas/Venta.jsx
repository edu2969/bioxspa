"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AiFillHome } from 'react-icons/ai';
import { IoIosArrowForward } from 'react-icons/io';
import { FaTrashAlt } from 'react-icons/fa';
import formatRUT from '@/app/utils/idetificationDocument';
import { TIPO_PRECIO } from '@/app/utils/constants';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

export default function Venta({ session }) {
    const router = useRouter();
    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm();
    const [sucursales, setSucursales] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [items, setItems] = useState([]);
    const [precios, setPrecios] = useState([]);
    const [loadingForm, setLoadingForm] = useState(false);
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);
    const [clienteSelected, setClienteSelected] = useState(null);
    const [itemsVenta, setItemsVenta] = useState([{ cantidad: 1, subcategoriaId: '', precio: '' }]);
    const [autocompleteCategoriaResults, setAutocompleteCategoriaResults] = useState([]);
    const [documentosTributarios, setDocumentosTributarios] = useState([]);
    const [tipoGuiaSelected, setTipoGuiaSelected] = useState(0);
    const [documentoTributarioSeleccionado, setDocumentoTributarioSeleccionado] = useState(null);
    const [registroSelected, setRegistroSelected] = useState(0);
    const [total, setTotal] = useState(0);

    const isCreateVentaDisabled = itemsVenta.some(item => !item.precio || parseInt(item.precio) <= 0);

    const fetchSucursales = async () => {
        const response = await fetch('/api/sucursales');
        const data = await response.json();
        console.log("SUCURSALES", data);
        setSucursales(data.sucursales);
    };

    const fetchDependencias = async (sucursalId) => {
        const response = await fetch(`/api/sucursales/${sucursalId}`);
        const data = await response.json();
        console.log("DEPENDENCIAS", data);
        setDependencias(data.dependencias);
    };

    const fetchUsuarios = async () => {
        const response = await fetch('/api/users');
        const data = await response.json();
        console.log("USERS", data);
        setUsuarios(data.users);
    };

    const fetchCategorias = async () => {
        const response = await fetch('/api/catalogo');
        const data = await response.json();
        setCategorias(data);
    };

    const fetchDocumentosTributarios = async () => {
        const response = await fetch('/api/ventas/documentostributarios?venta=true');
        const data = await response.json();
        console.log("DOCUMENTOS TRIBUTARIOS", data);
        setDocumentosTributarios(data.documentosTributarios);
    };

    const onSubmit = async (data) => {

        console.log("DATA", data);

        const payload = {
            clienteId: clienteSelected?._id,
            sucursalId: data.sucursalId,
            dependenciaId: data.dependenciaId,
            usuarioId: data.usuarioId,
            items: itemsVenta.map(item => ({
                cantidad: parseInt(item.cantidad),
                precio: parseInt(item.precio.replace(/\./g, '')),
                subcategoriaId: item.subcategoriaId
            })),
        }

        console.log("PAYLOAD", payload);

        /*
        setLoadingForm(true);
        try {
            await fetch('/api/ventas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            router.push('/ventas');
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingForm(false);
        }*/
    };

    useEffect(() => {
        fetchUsuarios();
        fetchSucursales();
        fetchDocumentosTributarios();
        fetchCategorias();
    }, []);

    useEffect(() => {
        if (session && session.user && session.user.id) {
            setValue('usuarioId', session.user.id);
            console.log('usuarioId set to:', getValues('usuarioId'));
        }
    }, [usuarios]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sucursalId = urlParams.get('id');
        if (sucursalId) {
            setValue('sucursalId', sucursalId);
            fetchDependencias(sucursalId);
        }
    }, sucursales);

    useEffect(() => {
        const newTotal = itemsVenta.reduce((acc, item) => {
            const cantidad = parseInt(item.cantidad) || 0;
            const precio = parseInt(item.precio) || 0;
            return acc + (cantidad * precio);
        }, 0);
        setTotal(newTotal);
    }, [itemsVenta]);

    return (
        <main className="w-full h-screen mt-10">
            <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pt-4 mx-10 bg-white dark:bg-gray-900 mb-4">
                <div className="flex items-center space-x-4 text-ship-cove-800">
                    <Link href="/">
                        <AiFillHome size="1.25rem" className="text-gray-700 dark:text-gray-300 ml-2" />
                    </Link>
                    <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                    <Link href="/modulos">
                        <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">VENTAS</span>
                    </Link>
                    <IoIosArrowForward size="1.25rem" className="text-gray-700 dark:text-gray-300" />
                    <span className="text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">NUEVA VENTA</span>
                </div>
            </div>
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
                                            {usuarios.length && usuarios.map(usuario => (
                                                <option key={usuario._id} value={usuario._id}>{usuario.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-4/12 pr-4">
                                        <label htmlFor="sucursalId" className="block text-sm font-medium text-gray-700">Sucursal</label>
                                        <select id="sucursalId" {...register('sucursalId')} onChange={(e) => fetchDependencias(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione una sucursal</option>
                                            {sucursales.length && sucursales.map(sucursal => (
                                                <option key={sucursal._id} value={sucursal._id}>{sucursal.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-4/12 pr-4">
                                        <label htmlFor="dependenciaId" className="block text-sm font-medium text-gray-700">Dependencia</label>
                                        <select id="dependenciaId" {...register('dependenciaId')} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione una dependencia</option>
                                            {dependencias.length && dependencias.map(dependencia => (
                                                <option key={dependencia._id} value={dependencia._id}>{dependencia.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                </div>
                                <div className="flex mt-3">
                                    <div className="w-4/12 relative pr-4">
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
                                                            console.log("CLIENTE", cliente);
                                                            setAutocompleteClienteResults([]);
                                                            cliente.documentoTributarioId != null && setValue("documentoTributarioId", documentosTributarios.find(documento => documento._id == cliente.documentoTributarioId)?._id);
                                                        }}
                                                    >
                                                        <p>{cliente.nombre}</p>
                                                        <p className="text-xs text-gray-500">{cliente.rut}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="w-3/12 pr-4">
                                        <label htmlFor="documentoTributarioId" className="block text-sm font-medium text-gray-700">Documento Tributario</label>
                                        <select id="documentoTributarioId" {...register('documentoTributarioId')}
                                            onChange={(e) => {
                                                console.log("VEAMOS", documentosTributarios.find(documento => documento._id == e.target.value));
                                                setDocumentoTributarioSeleccionado(documentosTributarios.find(documento => documento._id == e.target.value));
                                            }}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            <option value="">Seleccione un documento</option>
                                            {documentosTributarios.length && documentosTributarios.map(documento => (
                                                <option key={documento._id} value={documento._id}>{documento.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {documentoTributarioSeleccionado != null && documentoTributarioSeleccionado.nombre.startsWith("Guia") && <div className="w-3/12 pr-4">
                                        <label htmlFor="tipoGuia" className="block text-sm font-medium text-gray-700">Motivo guía</label>
                                        <select name="detalleguiadespacho" {...register('tipoGuia', { valueAsNumber: true })}
                                            id="detalleguiadespacho" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm">
                                            {TIPO_GUIA.map((guia) => (
                                                <option key={guia.value} value={guia.value}>{guia.label}</option>
                                            ))}
                                        </select>
                                    </div>}
                                    <div className="w-3/12 pr-4">
                                        <label htmlFor="tipoRegistro" className="block text-sm font-medium text-gray-700">Registro</label>
                                        <select name="tipoRegistro" id="tipoRegistro" {...register('tipoRegistro', { valueAsNumber: true })}
                                            onChange={(e) => {
                                                console.log("REGISTRO", e.target.value);
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

                            <div className="w-3/12 text-center">
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
                            <div className="w-1/12 pr-4">
                                <label htmlFor="permanente" className="block text-sm font-medium text-gray-700">Permanente</label>
                                <input
                                    id="permanente"
                                    type="checkbox"
                                    {...register('permanente')}
                                    className="block w-6 h-6 m-2 mt-3"
                                />
                            </div>

                            <div className="w-3/12 pr-4">
                                <label htmlFor="patente" className="block text-sm font-medium text-gray-700">Patente</label>
                                <input
                                    id="patente"
                                    {...register('patente')}
                                    type="text"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm uppercase"
                                />
                            </div>
                            <div className="w-3/12 pr-4">
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
                            <div className="w-6/12 pr-4">
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
                                <p className="font-bold text-lg">DETALLE</p>
                                <button
                                    type="button"
                                    className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                    onClick={() => setItemsVenta([...itemsVenta, { cantidad: 1, subcategoriaId: '', precio: '' }])}
                                >
                                    Agregar línea
                                </button>
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
                                    <p className="font-bold text-sm text-center">Valor</p>
                                </div>
                                <div className="w-1/12 flex justify-center items-right">
                                    <p className="font-bold text-sm">Acciones</p>
                                </div>
                            </div>
                            {itemsVenta.map((item, index) => (
                                <div key={`itemVenta_${index}`} className="w-full flex items-center bg-green-200 mb-0.5 py-1 px-4">
                                    <div className="w-1/12 pr-4">
                                        <input
                                            id={`cantidad-${index}`}
                                            {...register(`itemsVenta[${index}].cantidad`)}
                                            type="number"
                                            min={1}
                                            max={99}
                                            defaultValue={item.cantidad}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            onChange={(e) => {
                                                const newCantidad = parseInt(e.target.value) || 0;
                                                const updatedItems = [...itemsVenta];
                                                updatedItems[index].cantidad = newCantidad;
                                                setItemsVenta(updatedItems);
                                            }}
                                        />
                                    </div>
                                    <div className="w-5/12 pr-4">
                                        <input
                                            id={`categoriaId-${index}`}
                                            {...register(`itemsVenta[${index}].categoriaId`)}
                                            type="text"
                                            defaultValue={itemsVenta[index].subcategoriaId}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm"
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value.length > 2) {
                                                    fetch(`/api/catalogo/search?q=${value}`)
                                                        .then(response => response.json())
                                                        .then(data => {
                                                            setAutocompleteCategoriaResults(prev => ({
                                                                ...prev,
                                                                [index]: data.results
                                                            }));
                                                        });
                                                }
                                            }}
                                        />
                                        {autocompleteCategoriaResults[index]?.length > 0 && (
                                            <ul className="absolute z-10 w-full border border-gray-300 rounded-md shadow-sm mt-1 max-h-40 overflow-y-auto bg-white">
                                                {autocompleteCategoriaResults[index].map((categoria, indice2) => (
                                                    <li
                                                        key={`_id_${indice2}`}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                                                        onClick={() => {
                                                            setValue(`itemsVenta[${index}].categoriaId`, categoria.original);
                                                            setAutocompleteCategoriaResults(prev => ({
                                                                ...prev,
                                                                [index]: []
                                                            }));
                                                            fetch(`/api/precios/${categoria._id}?clienteId=${clienteSelected?._id}&usuarioId=${getValues('usuarioId')}`)
                                                                .then(response => response.json())
                                                                .then(data => {
                                                                    console.log("PRECIO", data);
                                                                    if (data && data.valor) {
                                                                        const formattedPrice = data.valor.toLocaleString('es-CL');
                                                                        setValue(`itemsVenta[${index}].precio`, formattedPrice);                                                                            
                                                                        setItemsVenta(prev => {
                                                                            const updatedItems = [...prev];
                                                                            updatedItems[index].subcategoriaId = categoria._id;
                                                                            if (data.sugerido) {
                                                                                updatedItems[index].precioError = true;                                                                        
                                                                            }
                                                                            updatedItems[index].precio = formattedPrice;
                                                                            return updatedItems;
                                                                        });
                                                                        if (data.sugerido) {
                                                                            toast.warning(<div><p><b>Precio sugerido</b></p><span className="text-xs">a <b>{data.clienteId.nombre}</b> el {new Date(data.fechaDesde).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>, {                                                                            
                                                                                position: "top-right",
                                                                                autoClose: 5000,
                                                                                hideProgressBar: false,
                                                                                closeOnClick: true,
                                                                                pauseOnHover: true,
                                                                                draggable: true,
                                                                                progress: undefined,                                                                           
                                                                            });
                                                                        } else {
                                                                            toast.success(<div><p><b>Precio cargado exitósamente</b></p><span className="text-xs">el {new Date(data.fechaDesde).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>, {                                                                            
                                                                                position: "top-right",
                                                                                autoClose: 5000,
                                                                                hideProgressBar: false,
                                                                                closeOnClick: true,
                                                                                pauseOnHover: true,
                                                                                draggable: true,
                                                                                progress: undefined,                                                                           
                                                                            });
                                                                        }
                                                                    } else if(data.error) {
                                                                        console.log("Error 404: Resource not found");
                                                                        setItemsVenta(prev => {
                                                                            const updatedItems = [...prev];
                                                                            updatedItems[index].precioError = true;
                                                                            return updatedItems;
                                                                        });
                                                                        toast.error(<div><p><b>Sin precio cargado</b></p><span className="text-xs">No hay precio para sugerir</span></div>, {
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
                                                        }}
                                                    >
                                                        <p dangerouslySetInnerHTML={{ __html: categoria.texto }}></p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="w-2/12 pr-4">
                                        <div className="flex">
                                            <span className="font-bold mt-2 px-4">$</span>
                                            <input
                                                id={`precio-${index}`}
                                                {...register(`itemsVenta[${index}].precio`)}
                                                type="text"
                                                value={item.precio.toLocaleString('es-CL')}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\./g, '');
                                                    const numericValue = parseInt(value, 10) || 0;
                                                    const updatedItems = [...itemsVenta];
                                                    updatedItems[index].precio = numericValue;
                                                    setItemsVenta(updatedItems);
                                                }}
                                                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:text-sm text-right ${itemsVenta[index].precioError ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                            />
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
                                        <button
                                            type="button"
                                            className="bg-red-400 text-white hover:bg-red-200 hover:text-red-800 rounded-md px-2 py-2"
                                            onClick={() => setItemsVenta(itemsVenta.filter((_, i) => i !== index))}
                                        >
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="w-full flex items-center bg-gray-300 px-4 py-2 mt-0.5 rounded-b-md uppercase">
                                <div className="w-8/12 pr-4">
                                    <p className="font-bold text-sm">Total</p>
                                </div>
                                <div className="w-3/12 pr-4">
                                    <div className="flex">
                                        <span className="text-xl font-bold px-4">$</span>
                                        <span className="w-full font-bold text-xl text-right">
                                            {itemsVenta.reduce((acc, item) => {
                                                console.log("ITEM>>>", item);
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
                                <button className="flex w-3/12 justify-center rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 mr-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.back()
                                    }}>VOLVER Y CANCELAR</button>
                                <button
                                    className={`flex w-3/12 justify-center rounded-md bg-ship-cove-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-ship-cove-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ship-cove-600 ml-1 ${isCreateVentaDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    type="submit"
                                    disabled={isCreateVentaDisabled || loadingForm}
                                >
                                    CREAR VENTA
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>            
            <ToastContainer />
        </main>
    );
}