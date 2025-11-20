'use client'
import { signOut } from 'next-auth/react';
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiFillHome, AiOutlineMenu, AiOutlineClose, AiFillAliwangwang, AiOutlineLogout } from 'react-icons/ai'
import { usePathname, useRouter } from 'next/navigation'
import { MdOutlinePropaneTank, MdSell } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import { USER_ROLE } from '@/app/utils/constants';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { BsQrCodeScan } from 'react-icons/bs';
import { FaRegTrashAlt } from 'react-icons/fa';
import Loader from './Loader';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { getColorEstanque } from '@/lib/uix';


export default function Nav() {
    const [role, setRole] = useState(0);
    const router = useRouter();
    const [menuActivo, setMenuActivo] = useState(false);
    const path = usePathname();
    const { data: session, status } = useSession();
    const [scanMode, setScanMode] = useState(false);
    const temporalRef = useRef(null);
    const hiddenInputRef = useRef(null);
    const [inputTemporalVisible, setInputTemporalVisible] = useState(false);    

    // Estados para el modal de cilindro
    const [showCilindroModal, setShowCilindroModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingItem, setLoadingItem] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Estados para clientes y direcciones
    const [autocompleteClienteResults, setAutocompleteClienteResults] = useState([]);
    const [clienteSelected, setClienteSelected] = useState(null);
    const [loadingCliente, setLoadingCliente] = useState(false);
    const [direccionesCliente, setDireccionesCliente] = useState([]);
    const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);

    // Form hooks para el modal
    const { register, handleSubmit, reset, setValue } = useForm();

    const activateSuperScanMode = () => {
        setScanMode(true);
        setMenuActivo(false);
    }

    // Función para cargar datos completos del item
    const cargarDatosItem = useCallback(async (item) => {
        console.log("CARGANDO ITEM", item);
        try {
            setLoadingItem(true);
            setSelectedItem(item);

            // Rellenar el formulario con los datos del item
            reset({
                itemId: item._id,
                codigo: item.codigo || '',
                nombre: item.nombre || '',
                descripcion: item.descripcion || '',
                descripcionCorta: item.descripcionCorta || '',
                stockActual: item.stockActual || 0,
                stockMinimo: item.stockMinimo || 0,
                garantiaAnual: item.garantiaAnual || 0,
                estado: item.estado || 0,
                destacado: item.destacado || false,
                visible: item.visible || true,
                url: item.url || '',
                urlImagen: item.urlImagen || '',
                urlFichaTecnica: item.urlFichaTecnica || '',
                fichaTecnica: item.fichaTecnica || '',
                fechaMantencion: item.fechaMantencion ? dayjs(item.fechaMantencion).format('YYYY-MM-DD') : ''
            });

            // Cargar cliente y direcciones si existen
            if (item.ownerId) {
                setClienteSelected(item.ownerId);
                setDireccionesCliente(item.ownerId.direccionesDespacho || []);
                if (item.direccionId) {
                    setDireccionSeleccionada(item.direccionId);
                }
            }

            setShowCilindroModal(true);
            return item;
        } catch (error) {
            console.error('Error al cargar cilindro:', error);
            toast.error('Error al cargar los datos del cilindro');
            return null;
        } finally {
            setLoadingItem(false);
        }
    }, [reset, setLoadingItem, setShowCilindroModal, setDireccionesCliente, setClienteSelected]);

    // Función para buscar clientes (basada en Pedidos.jsx)
    const buscarClientes = async (query) => {
        if (!query || query.length < 2) {
            setAutocompleteClienteResults([]);
            return;
        }

        try {
            setLoadingCliente(true);
            const response = await fetch(`/api/clientes/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.ok) {
                setAutocompleteClienteResults(data.clientes || []);
            } else {
                setAutocompleteClienteResults([]);
            }
        } catch (error) {
            console.error('Error buscando clientes:', error);
            setAutocompleteClienteResults([]);
        } finally {
            setLoadingCliente(false);
        }
    };

    // Función para seleccionar cliente
    const seleccionarCliente = (cliente) => {
        setClienteSelected(cliente);
        setDireccionesCliente(cliente.direccionesDespacho || []);
        setAutocompleteClienteResults([]);
        setDireccionSeleccionada(null);
        
        // Actualizar valores del formulario
        setValue('ownerId', cliente._id);
        setValue('direccionId', '');
    };

    // Función para seleccionar dirección
    const seleccionarDireccion = (direccion) => {
        setDireccionSeleccionada(direccion.direccionId);
        setValue('direccionId', direccion.direccionId._id);
    };

    // Función para guardar cambios del item
    const guardarCambiosItem = async (formData) => {
        try {
            setSavingItem(true);
            
            // Preparar datos para envío
            const dataToSend = {
                ...formData,
                fechaMantencion: formData.fechaMantencion ? new Date(formData.fechaMantencion) : null,
                ownerId: clienteSelected?._id || null,
                direccionId: direccionSeleccionada?._id || null
            };

            const response = await fetch(`/api/cilindros/gestionar/${selectedItem.codigo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend),
            });

            const data = await response.json();

            if (data.ok) {
                toast.success('Cilindro actualizado correctamente');
                setSelectedItem(data.item);
                setEditMode(false);
            } else {
                toast.error(data.error || 'Error al actualizar el cilindro');
            }
        } catch (error) {
            console.error('Error al guardar cilindro:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setSavingItem(false);
        }
    };

    // Función para cancelar la edición
    const cancelarEdicion = () => {
        setEditMode(false);
        if (selectedItem) {
            // Restaurar datos originales
            if (selectedItem.ownerId) {
                setClienteSelected(selectedItem.ownerId);
                setDireccionesCliente(selectedItem.ownerId.direccionesDespacho || []);
            }
            if (selectedItem.direccionId) {
                setDireccionSeleccionada(selectedItem.direccionId);
            }
            
            reset({
                codigo: selectedItem.codigo || '',
                nombre: selectedItem.nombre || '',
                descripcion: selectedItem.descripcion || '',
                descripcionCorta: selectedItem.descripcionCorta || '',
                stockActual: selectedItem.stockActual || 0,
                stockMinimo: selectedItem.stockMinimo || 0,
                garantiaAnual: selectedItem.garantiaAnual || 0,
                estado: selectedItem.estado || 0,
                destacado: selectedItem.destacado || false,
                visible: selectedItem.visible || true,
                urlImagen: selectedItem.urlImagen || '',
                fechaMantencion: selectedItem.fechaMantencion ? dayjs(selectedItem.fechaMantencion).format('YYYY-MM-DD') : '',
                ownerId: selectedItem.ownerId?._id || '',
                direccionId: selectedItem.direccionId?._id || ''
            });
        }
    };

    // Función para cerrar el modal completamente  
    const cerrarModal = () => {
        setShowCilindroModal(false);
        setEditMode(false);
        setSelectedItem(null);
        setClienteSelected(null);
        setDireccionesCliente([]);
        setDireccionSeleccionada(null);
        setAutocompleteClienteResults([]);
        reset();
    };

    const gestionarItem = useCallback(async (codigo) => {
        // Lógica para gestionar el item escaneado
        try {
            const response = await fetch(`/api/cilindros/gestionar/${codigo}`);
            const data = await response.json();

            if (data.ok && data.item) {
                setSelectedItem(data.item);
                toast.success(`Cilindro encontrado: ${codigo}`);
                setInputTemporalVisible(false);
                setScanMode(false);

                // Cargar datos completos y mostrar modal
                await cargarDatosItem(data.item);                
            } else {
                toast.error(data.error || 'Cilindro no encontrado');
                setInputTemporalVisible(false);
                setScanMode(false);
            }
        } catch (error) {
            console.error('Error al buscar cilindro:', error);
            toast.error('Error al buscar el cilindro');
            setScanMode(false);
        }
    }, [setSelectedItem, setScanMode, cargarDatosItem]);

    useEffect(() => {
        const handleTextInput = (e) => {
            if (scanMode) {
                const codigo = e.data;
                if (codigo === "x") {
                    setInputTemporalVisible(true);
                    setTimeout(() => {
                        if (temporalRef.current)
                            temporalRef.current.focus();
                    }, 0);
                    return;
                }
                gestionarItem(codigo);
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
    }, [scanMode, gestionarItem, temporalRef]);

    useEffect(() => {
        if (status === 'loading') return;
        if (session && session.user && session.user?.role) {
            setRole(session.user.role);
        }
    }, [session, setRole, status]);

    return (
        <div className={`w-full absolute top-0 left-0 ${path === '/' ? 'hidden' : 'visible'}`}>
            <div className="absolute">
                <div className="flex">
                    <AiOutlineMenu size="1.7rem" className="m-4 text-slate-800 cursor-pointer"
                        onClick={() => setMenuActivo(true)} />
                </div>
            </div>
            <div className="absolute right-0">
                <Link href={`/modulos`} onClick={() => setMenuActivo(false)}>
                    <AiFillHome size="1.7rem" className="mt-4 mr-4 text-slate-800 justify-end cursor-pointer" />
                </Link>
            </div>
            <div className={`w-full h-screen min-w-2xl min-h-full z-50 absolute transition-all bg-[#313A46] p-6 ${menuActivo ? 'left-0' : '-left-full'}`}>
                <AiOutlineClose size="2rem" className="text-white m-auto cursor-pointer absolute top-4 right-4"
                    onClick={() => setMenuActivo(false)} />
                <div className="mt-12 text-white space-y-6">
                    {role == USER_ROLE.gerente && <>
                        <Link href="/modulos/configuraciones" onClick={() => setMenuActivo(false)}>
                            <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                                <IoSettingsSharp size="4rem" />
                                <p className="text-2xl mx-6 mt-4">CONFIGURACIONES</p>
                            </div>
                        </Link>
                        <Link href="/modulos/operacion" onClick={() => setMenuActivo(false)}>
                            <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                                <MdOutlinePropaneTank size="4rem" />
                                <p className="text-2xl mx-6 mt-4">OPERACIÓN</p>
                            </div>
                        </Link>
                    </>}
                    <Link href="/modulos/pedidos/nuevo" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <MdSell size="4rem" />
                            <p className="text-2xl mx-6 mt-4">VENTA</p>
                        </div>
                    </Link>
                    <button onClick={() => {
                        activateSuperScanMode();
                    }}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <BsQrCodeScan size="4rem" />
                            <p className="text-2xl mx-6 mt-4">Power Scan</p>
                        </div>
                    </button>
                    <Link href="/modulos/about" onClick={() => setMenuActivo(false)}>
                        <div className="flex hover:bg-white hover:text-[#313A46] rounded-md p-2 cursor-pointer">
                            <AiFillAliwangwang size="4rem" />
                            <p className="text-2xl mx-6 mt-4">Acerca de...</p>
                        </div>
                    </Link>
                    <button className="min-w-2xl flex hover:bg-white hover:text-[#9cb6dd] rounded-md p-2"
                        onClick={async () => {
                            setMenuActivo(false);
                            signOut({ redirect: false }).then(() => {
                                router.push('/modulos/logingOut');
                            });
                        }}>
                        <AiOutlineLogout size="4rem" />
                        <p className="text-2xl mx-6 mt-4">Cerrar sesión</p>
                    </button>
                </div>
                {session?.user && (
                    <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-2">
                        <div className="flex flex-row items-center space-x-4">
                            <div className="flex flex-col text-right">
                                <span className="text-lg text-green-800 font-semibold">{session.user.name}</span>
                                <span className="text-sm text-gray-300">{session.user.email}</span>
                            </div>
                            <Image
                                src={`/profiles/${session.user.email.split('@')[0]}.jpg`}
                                alt="Perfil"
                                className="w-14 h-14 rounded-full object-cover border-2 border-white"
                                width={56}
                                height={56}
                            />
                        </div>
                    </div>
                )}
            </div>

            {scanMode && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 px-4">
                    {!inputTemporalVisible ? <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
                        <BsQrCodeScan className="text-8xl text-green-500 mb-4" />
                        <div className="flex">
                            <Loader texto="Escaneando código..." />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">Por favor, escanee un código QR</p>                        
                    </div> : <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 max-w-xs">
                            <label className="text-gray-600 text-sm mb-2">Ingrese código:</label>
                            <input
                                ref={temporalRef}
                                type="text"
                                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        console.log("Código temporal ingresado:", e.target.value);
                                        setInputTemporalVisible(false);
                                        gestionarItem(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>}
                    
                </div>
            )}

            {/* Modal de información del cilindro */}
            {showCilindroModal && selectedItem && (
                <div className="fixed flex inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 items-center justify-center p-2 sm:p-4">
                    <div className="relative mx-auto p-5 pt-0 border w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-lg rounded-md bg-white sm:w-11/12 md:w-10/12">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Cilindro</h3>
                            
                            {loadingItem ? (
                                <div className="flex justify-center p-8">
                                    <Loader texto="Cargando datos..." />
                                </div>
                            ) : (
                                <div className="mt-0">
                                    <div className="flex items-center justify-center gap-6">
                                        {/* Imagen del cilindro a la izquierda */}
                                        {!editMode &&selectedItem.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento && (
                                            <div className="flex-shrink-0">
                                                <Image 
                                                    width={20} 
                                                    height={64} 
                                                    src={`/ui/tanque_biox${getColorEstanque(selectedItem.subcategoriaCatalogoId.categoriaCatalogoId.elemento)}.png`} 
                                                    style={{ width: "32px", height: "auto" }} 
                                                    alt="tanque_biox" 
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Información a la derecha */}
                                        <div className="text-left flex-1 mt-4">
                                            {/* NUCode y Estado en la parte superior */}
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {selectedItem.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento && (
                                                    <div className="text-white bg-orange-600 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">
                                                        {selectedItem.subcategoriaCatalogoId.categoriaCatalogoId.elemento}
                                                    </div>
                                                )}
                                                {selectedItem.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial && (
                                                    <span className="text-white bg-blue-400 px-2 py-0.5 rounded text-xs h-5 font-bold">INDUSTRIAL</span>
                                                )}
                                                {selectedItem.subcategoriaCatalogoId?.sinSifon && (
                                                    <div className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs h-5 font-bold tracking-widest">sin SIFÓN</div>
                                                )}
                                                
                                                {/* Estado del cilindro */}
                                                {editMode ? (
                                                    <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Estado</label>
                                                    <select
                                                        {...register('estado')}
                                                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                                                    >
                                                        <option value={0}>Disponible</option>
                                                        <option value={1}>En uso</option>
                                                        <option value={2}>Mantenimiento</option>
                                                        <option value={3}>Fuera de servicio</option>
                                                    </select></div>
                                                ) : (
                                                    <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded uppercase">
                                                        {selectedItem.estado === 0 ? 'DISPONIBLE' : 
                                                         selectedItem.estado === 1 ? 'EN USO' :
                                                         selectedItem.estado === 2 ? 'MANTENIMIENTO' : 'FUERA DE SERVICIO'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Nombre del gas */}
                                            <div className="mb-3">
                                                <p className="text-4xl font-bold">
                                                    {selectedItem.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento ? (() => {
                                                        const elemento = selectedItem.subcategoriaCatalogoId.categoriaCatalogoId.elemento;
                                                        let match = elemento?.match(/^([a-zA-Z]*)(\d*)$/);
                                                        if (!match) {
                                                            match = [null, elemento, ''];
                                                        }
                                                        const [, p1, p2] = match;
                                                        return (
                                                            <>
                                                                {p1 ? p1.toUpperCase() : ''}
                                                                {p2 ? <small>{p2}</small> : ''}
                                                            </>
                                                        );
                                                    })() : selectedItem.nombre || 'N/A'}
                                                </p>
                                            </div>
                                            
                                            {/* Cantidad y unidad */}
                                            <div className="mb-3">
                                                <p className="text-4xl font-bold orbitron">
                                                    {selectedItem.subcategoriaCatalogoId?.cantidad || 'N/A'} 
                                                    <small className="text-2xl ml-1">{selectedItem.subcategoriaCatalogoId?.unidad || ''}</small>
                                                </p>
                                            </div>
                                            
                                            {/* Código */}
                                            <div className="mb-4">
                                                {editMode ? (
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Código</label>
                                                        <input
                                                            type="text"
                                                            {...register('codigo')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                            placeholder="Código del cilindro"
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-600">
                                                        <small>Código:</small> <b className="text-lg">{selectedItem.codigo || 'N/A'}</b>
                                                    </p>
                                                )}
                                                {selectedItem.fechaMantencion && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        <small>Vence:</small> <b>{dayjs(selectedItem.fechaMantencion).format("DD/MM/YYYY")}</b>
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {/* Sección adicional en modo edición */}
                                            {editMode && (
                                                <div className="mt-4 space-y-3">
                                                    {/* Nombre */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                                                        <input
                                                            type="text"
                                                            {...register('nombre')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Descripción corta */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Descripción corta</label>
                                                        <input
                                                            type="text"
                                                            {...register('descripcionCorta')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Stock actual y mínimo */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-600 mb-1">Stock actual</label>
                                                            <input
                                                                type="number"
                                                                {...register('stockActual')}
                                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-600 mb-1">Stock mínimo</label>
                                                            <input
                                                                type="number"
                                                                {...register('stockMinimo')}
                                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Garantía anual */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Garantía (años)</label>
                                                        <input
                                                            type="number"
                                                            {...register('garantiaAnual')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Fecha de mantención */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Fecha mantención</label>
                                                        <input
                                                            type="date"
                                                            {...register('fechaMantencion')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* URL Imagen */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">URL Imagen</label>
                                                        <input
                                                            type="url"
                                                            {...register('urlImagen')}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Descripción */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 mb-1">Descripción</label>
                                                        <textarea
                                                            {...register('descripcion')}
                                                            rows={3}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                                        />
                                                    </div>
                                                    
                                                    {/* Checkboxes */}
                                                    <div className="flex space-x-4">
                                                        <label className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                {...register('destacado')}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-xs text-gray-700">Destacado</span>
                                                        </label>
                                                        <label className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                {...register('visible')}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-xs text-gray-700">Visible</span>
                                                        </label>
                                                    </div>
                                                    
                                                    {/* Sección de Cliente y Ubicación */}
                                                    <div className="mt-4 space-y-4">
                                                        {/* Selector de Cliente */}
                                                        <div className="p-3 bg-green-50 rounded-lg">
                                                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Cliente Propietario</h4>
                                                            
                                                            {clienteSelected ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                                                                        <div>
                                                                            <p className="font-medium text-sm">{clienteSelected.nombre}</p>
                                                                            <p className="text-xs text-gray-600">RUT: {clienteSelected.rut}</p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setClienteSelected(null);
                                                                                setDireccionesCliente([]);
                                                                                setDireccionSeleccionada(null);
                                                                                setValue('ownerId', '');
                                                                                setValue('direccionId', '');
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700"
                                                                        >
                                                                            <FaRegTrashAlt size="0.8em" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Buscar cliente..."
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                                        onChange={(e) => buscarClientes(e.target.value)}
                                                                    />
                                                                    
                                                                    {loadingCliente && (
                                                                        <div className="text-center py-2">
                                                                            <span className="text-sm text-gray-500">Buscando...</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {autocompleteClienteResults.length > 0 && (
                                                                        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded">
                                                                            {autocompleteClienteResults.map((cliente) => (
                                                                                <div
                                                                                    key={cliente._id}
                                                                                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                                                                    onClick={() => seleccionarCliente(cliente)}
                                                                                >
                                                                                    <p className="font-medium">{cliente.nombre}</p>
                                                                                    <p className="text-xs text-gray-600">RUT: {cliente.rut}</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Selector de Dirección */}
                                                        {clienteSelected && direccionesCliente.length > 0 && (
                                                            <div className="p-3 bg-blue-50 rounded-lg">
                                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Ubicación del Cilindro</h4>
                                                                
                                                                <div className="space-y-2">
                                                                    {direccionesCliente.map((dirDespacho, idx) => (
                                                                        <div
                                                                            key={`dir_${idx}`}
                                                                            className={`p-2 border rounded cursor-pointer transition-colors ${
                                                                                direccionSeleccionada?._id === dirDespacho.direccionId._id
                                                                                    ? 'border-blue-500 bg-blue-100'
                                                                                    : 'border-gray-200 hover:border-gray-300'
                                                                            }`}
                                                                            onClick={() => seleccionarDireccion(dirDespacho)}
                                                                        >
                                                                            <p className="text-sm font-medium">{dirDespacho.direccionId.nombre}</p>
                                                                            {dirDespacho.comentario && (
                                                                                <p className="text-xs text-gray-600 mt-1">{dirDespacho.comentario}</p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                
                                                                {direccionSeleccionada && (
                                                                    <div className="mt-3 p-2 bg-white border border-gray-200 rounded">
                                                                        <p className="text-xs font-semibold text-gray-700">Ubicación seleccionada:</p>
                                                                        <p className="text-sm">{direccionSeleccionada.nombre}</p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setDireccionSeleccionada(null);
                                                                                setValue('direccionId', '');
                                                                            }}
                                                                            className="mt-1 text-xs text-red-500 hover:text-red-700"
                                                                        >
                                                                            Quitar ubicación
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Botones de acción */}
                            <div className="mt-4 mx-2 sm:mx-4 space-y-2">
                                {editMode ? (
                                    <form onSubmit={handleSubmit(guardarCambiosItem)}>
                                        <button
                                            type="submit"
                                            disabled={savingItem}
                                            className="relative px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2"
                                        >
                                            ACTUALIZAR
                                            {savingItem && (
                                                <div className="absolute top-0 left-0 w-full h-10">
                                                    <div className="absolute top-0 left-0 w-full h-full bg-gray-100 opacity-80"></div>
                                                    <div className="mt-1"><Loader texto="" /></div>
                                                </div>
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => cerrarModal()}
                                        className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2"
                                    >
                                        ACEPTAR
                                    </button>
                                )}
                                
                                {!editMode && (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="mt-2 px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        CORREGIR
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => {
                                        if (editMode) {
                                            cancelarEdicion();
                                        } else {
                                            cerrarModal();
                                        }
                                    }}
                                    className="mt-2 px-4 py-2 bg-gray-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                ref={hiddenInputRef}
                type="text"
                className="opacity-0 h-0 w-0 absolute"
                inputMode="none"
            />
        </div>
    )
}