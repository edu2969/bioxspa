import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import DetalleVenta from "@/models/detalleVenta";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import XubcategoriaProducto from "@/models/xubcategoriaProducto";
import XategoriaProducto from "@/models/xategoriaProducto";
import Precio from "@/models/precio";
import XroductosCliente from "@/models/xroductos_cliente";
import Cliente from "@/models/cliente";
import Xliente from "@/models/xliente";
import Direccion from "@/models/direccion";
import User from "@/models/user";
import Comuna from "@/models/comuna";
import Regione from "@/models/regione";
import DocumentoTributario from "@/models/documentoTributario";
import mongoose from 'mongoose';
import XistorialAumentoPrecio from "@/models/xistorialAumentoPrecio";
import { GasToNuMap } from "@/lib/nuConverter";
import { TIPO_CATEGORIA_CATALOGO } from "@/app/utils/constants";

export async function GET(request) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (q === "resetVentas") {
        console.log("Starting migration...");
        await resetVentas();
        console.log("Migration completed successfully");
    }   
    
    if (q === "mejorarSubcategorias") {
        console.log("Starting product migration and improvement...");
        await mejorarSubcategorias();
        console.log("Product migration and improvement completed successfully");
    }

    if (q === "completarCategorias") {
        console.log("Starting category completion...");
        await completarCategorias();
        console.log("Category completion completed successfully");
    }

    if (q === "actualizarPrecios") {
        console.log("Starting price update...");
        await actualizarPrecios();
        console.log("Price update completed successfully");
    }

    if(q === "geoCompletition") {
        console.log("Starting geocompletion...");
        await geoCompletition();
        console.log("Geocompletion completed successfully");
    }

    if(q === "migrarClientes") {
        console.log("Starting client migration...");
        await migrarClientes();
        console.log("Client migration completed successfully");
    }

    if(q === "repararCategoriasRepetidas") {
        console.log("Starting duplicate category repair...");
        await repararCategoriasRepetidas();
        console.log("Duplicate category repair completed successfully");
    }

    if(q === "repararDirecciones") {
        console.log("Starting address repair...");
        await repararDirecciones();
        console.log("Address repair completed successfully");
    }

    if(q === "eliminarDireccionesHuerfanas") {
        console.log("Starting orphaned address deletion...");
        await eliminarDireccionesHuerfanas();
        console.log("Orphaned address deletion completed successfully");
    }

    if(q === "encontrarCilindros") {
        console.log("Starting cylinder address assignment...");
        await encontrarCilindros();
        console.log("Cylinder address assignment completed successfully");
    }

    if(q === "migrarCatalogo") {
        console.log("Starting catalog migration...");
        await migrarCatalogo();
        console.log("Catalog migration completed successfully");
    }
    
    return NextResponse.json({ message: "Success migrate and improve" });
}

const resetVentas = async () => {
    await Venta.deleteMany({});
    await RutaDespacho.deleteMany({});
    await DetalleVenta.deleteMany({});
}

const migrarCatalogo = async () => {
    console.log('Iniciando migración del catálogo...');

    // Obtener datos de las tablas legacy
    const xategorias = await XategoriaProducto.find({ deleted_at: null });
    const xubcategorias = await XubcategoriaProducto.find({ deleted_at: null });

    console.log(`Encontradas ${xategorias.length} categorías y ${xubcategorias.length} subcategorías para migrar`);

    // Crear un mapa de elementos desde GasToNuMap
    const elementosMap = new Map();
    Object.keys(GasToNuMap).sort((a, b) => b.length - a.length).forEach(key => {
        elementosMap.set(key.toLowerCase(), GasToNuMap[key]);
    }); // Ordenar por longitud descendente

    // Mapa para relacionar temporalId de categorías
    const categoriaMap = new Map();

    // Migrar categorías
    for (const xategoria of xategorias) {
        try {
            const nombreLower = xategoria.nombre.toLowerCase();

            // Buscar si alguna clave de elementosMap está en el nombre
            let elemento = null;
            let gas = null;
            let nuCode = null;
            for (const [clave, nu] of elementosMap.entries()) {
                if (nombreLower.includes(clave)) {
                    elemento = clave;
                    nuCode = nu;
                    gas = clave;
                    break;
                }
            }

            const esCilindro = elemento !== null;

            let tipo = TIPO_CATEGORIA_CATALOGO.sinCategoria;
            let esIndustrial = false;
            let esMedicinal = false;

            if (esCilindro) {
                tipo = TIPO_CATEGORIA_CATALOGO.cilindro;
                esIndustrial = nombreLower.includes('industrial') || nombreLower.includes(' ind');
                esMedicinal = nombreLower.includes('medicinal') || nombreLower.includes(' med');
            }

            if(nombreLower.includes('arriendo')) {
                tipo = TIPO_CATEGORIA_CATALOGO.arriendo;
            }

            if(nombreLower.includes('flete')) {
                tipo = TIPO_CATEGORIA_CATALOGO.flete;
            }

            if(nombreLower.includes('servicio')) {
                tipo = TIPO_CATEGORIA_CATALOGO.servicio;
            }

            const updateData = {
                nombre: xategoria.nombre,
                descripcion: null,
                seguir: xategoria.seguir.toLowerCase() === 'si' || xategoria.seguir === '1',
                urlImagen: xategoria.url,
                tipo: tipo,
                gas: gas,
                elemento: elemento,
                nuCode: nuCode,
                esIndustrial: esIndustrial,
                esMedicinal: esMedicinal
            };

            const categoriaGuardada = await CategoriaCatalogo.findOneAndUpdate(
                { temporalId: xategoria.id },
                updateData,
                { upsert: true, new: true }
            );

            categoriaMap.set(xategoria.id, categoriaGuardada._id);

            console.log(`Categoría migrada/actualizada: ${xategoria.nombre} (ID: ${categoriaGuardada._id})`);
        } catch (error) {
            console.error(`Error migrando categoría ${xategoria.id}:`, error);
        }
    }

    // Migrar subcategorías
    for (const xubcategoria of xubcategorias) {
        try {
            const categoriaId = categoriaMap.get(xubcategoria.categoria_id);
            if (!categoriaId) {
                console.warn(`Categoría no encontrada para subcategoría ${xubcategoria.id} (categoria_id: ${xubcategoria.categoria_id})`);
                continue;
            }

            const nombreLower = xubcategoria.nombre.toLowerCase();

            // Determinar unidad de medida
            let unidad = null;
            if (nombreLower.includes('m3')) {
                unidad = 'm3';
            } else if (nombreLower.includes('kilos') || nombreLower.includes('kgs')) {
                unidad = 'kg';
            } else if (nombreLower.includes('kg')) {
                unidad = 'kg';
            }

            // Extraer cantidad (asumiendo formato como "5 kg" o "10 m3")
            let cantidad = null;
            const match = xubcategoria.nombre.match(/(\d+)/);
            if (match) {
                cantidad = parseInt(match[1]);
            }

            // Determinar sinSifon
            const sinSifon = nombreLower.includes('sin sifón') || nombreLower.includes('sin sifon');

            const updateData = {
                nombre: xubcategoria.nombre,
                categoriaCatalogoId: categoriaId,
                cantidad: cantidad,
                unidad: unidad,
                sinSifon: sinSifon,
                urlImagen: xubcategoria.url
            };

            const subcategoriaGuardada = await SubcategoriaCatalogo.findOneAndUpdate(
                { temporalId: xubcategoria.id },
                updateData,

                { upsert: true, new: true }
            );

            console.log(`Subcategoría migrada/actualizada: ${xubcategoria.nombre} (ID: ${subcategoriaGuardada._id})`);
        } catch (error) {
            console.error(`Error migrando subcategoría ${xubcategoria.id}:`, error);
        }
    }

    console.log('Migración del catálogo completada.');
}

const actualizarPrecios = async () => {
    const xproductos = await XroductosCliente.find();
    let preciosCreados = 0;
    let historialesAgregados = 0;
    let registrosNoProcesados = 0;

    for (const xproducto of xproductos) {
        try {
            if (!xproducto.clientes_id || !xproducto.subcategoria_id) {
                registrosNoProcesados++;
                continue;
            }

            // Find cliente by temporalId
            const cliente = await Cliente.findOne({ temporalId: xproducto.clientes_id });
            
            // Find subcategoria by temporalId
            const subcategoria = await SubcategoriaCatalogo.findOne({ temporalId: xproducto.subcategoria_id });
            
            if (cliente && subcategoria) {
                const precioData = {
                    subcategoriaCatalogoId: subcategoria._id,
                    clienteId: cliente._id,
                    valorBruto: parseFloat(xproducto.precio1) || 0,
                    impuesto: 0.19,
                    moneda: 'CLP',
                    valor: parseFloat(xproducto.precio1) * 1.19 || 0,
                    historial: []
                };

                // Update or create precio
                const precio = await Precio.findOneAndUpdate(
                    {
                        subcategoriaCatalogoId: subcategoria._id,
                        clienteId: cliente._id
                    },
                    precioData,
                    { upsert: true, new: true }
                );

                if (precio.isNew || precio.wasNew) preciosCreados++;

                // Buscar historial de aumentos por producto y cliente (temporalId)
                const historialAumentos = await XistorialAumentoPrecio.find({
                    productos_clientes_id: xproducto.id
                });

                if (historialAumentos && historialAumentos.length > 0) {
                    // Ordenar por fecha de creación si existe
                    historialAumentos.sort((a, b) => {
                        const fa = a.created_at ? new Date(a.created_at) : new Date(0);
                        const fb = b.created_at ? new Date(b.created_at) : new Date(0);
                        return fa - fb;
                    });

                    const historial = historialAumentos.map(h => {
                        const valorAnterior = parseFloat(h.valor_anterior) || 0;
                        const valorNuevo = parseFloat(h.valor_nuevo) || 0;
                        const varianza = valorAnterior !== 0 ? ((valorNuevo - valorAnterior) / valorAnterior) * 100 : 0;
                        return {
                            valor: valorNuevo,
                            fecha: h.created_at || new Date(),
                            varianza
                        };
                    });

                    // Actualizar el historial en el precio
                    await Precio.findOneAndUpdate(
                        {
                            subcategoriaCatalogoId: subcategoria._id,
                            clienteId: cliente._id
                        },
                        { $set: { historial } }
                    );
                    historialesAgregados += historial.length;
                }                
            } else {
                registrosNoProcesados++;
                console.warn(`Cliente or subcategoria not found for ids: ${xproducto.clientes_id}, ${xproducto.subcategoria_id}`);
            }
        } catch (error) {
            registrosNoProcesados++;
            console.error(`Error processing xproducto ${xproducto.id}:`, error);
        }
    }

    console.log('\n=== RESUMEN DE ACTUALIZACIÓN DE PRECIOS ===');
    console.log(`Precios creados/actualizados: ${preciosCreados}`);
    console.log(`Historiales agregados: ${historialesAgregados}`);
    console.log(`Registros no procesados: ${registrosNoProcesados}`);
    console.log('==========================================\n');
}

const geoCompletition = async () => {
    const clientes = await Cliente.find({
        direccionesDespacho: []
    }).limit(1000);
    let direccionesDetectadas = 0;
    let direccionesReparadas = 0;
    let direccionesSinReparar = 0;
    let direccionesFallidas = [];
    let direccionesCreadas = 0;
    let direccionesReutilizadas = 0;

    console.log(`Detectados ${clientes.length} clientes para geolocalizar`);

    for (let i = 0; i < clientes.length; i++) {
        const cliente = clientes[i];
        direccionesDetectadas++;
        
        try {
            // Find corresponding xliente
            const xliente = await Xliente.findOne({ id: cliente.temporalId });
            
            if (!xliente || !xliente.direccion || !xliente.ciudad) {
                console.warn(`Xliente not found or missing address data for cliente ${cliente._id}`);
                direccionesSinReparar++;
                direccionesFallidas.push(`Cliente ID: ${cliente._id} - Datos incompletos en xliente`);
                continue;
            }

            // Find comuna by ID and get region through comuna's regionId
            let nombreComuna = '';
            let nombreRegione = '';
            if (xliente.comuna_id) {
                const comuna = await Comuna.findOne({ id: xliente.comuna_id });
                if (comuna) {
                    nombreComuna = comuna.nombre;
                    
                    // Get region through comuna's regionId reference
                    if (comuna.region_id) {
                        const region = await Regione.findOne({ id: comuna.region_id });
                        if (region) {
                            nombreRegione = region.nombre;
                        } else {
                            console.warn(`Regione not found for comuna ${comuna._id}: ${comuna.region_id}`);
                        }
                    } else {
                        console.warn(`Comuna ${comuna._id} has no region_id`);
                    }
                } else {
                    console.warn(`Comuna not found for xliente comuna_id: ${xliente.comuna_id}`);
                }
            }

            // Build complete address string (avoid duplicating comuna and ciudad if they're the same)
            const addressParts = [xliente.direccion];
            
            // Add comuna if it's different from ciudad
            
            addressParts.push(nombreComuna);
            if(nombreComuna !== xliente.ciudad) {
                addressParts.push(xliente.ciudad);
            }       

            // Add region if available
            if (nombreRegione) {
                addressParts.push(nombreRegione);
            } 
            
            const direccionCompleta = addressParts.join(', ');
            
            // Check if address already exists with this query
            const direccionExistente = await Direccion.findOne({ 
                direccionOriginal: direccionCompleta 
            });

            let direccionId = null;

            if (direccionExistente) {
                // Use existing address
                direccionId = direccionExistente._id;
                direccionesReutilizadas++;
                console.log(`Reutilizando dirección existente para cliente ${cliente._id}: ${direccionCompleta}`);
            } else {
                // Call Google Maps API for geocoding
                try {
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccionCompleta)}&key=${process.env.GOOGLE_API_KEY}`
                    );
                    const data = await response.json();

                    if (data.status === 'OK' && data.results.length > 0) {
                        const result = data.results[0];
                        const location = result.geometry.location;
                        
                        // Extract address components
                        const components = result.address_components;
                        let codigoPostal = '';

                        components.forEach(component => {
                            if (component.types.includes('postal_code')) {
                                codigoPostal = component.long_name;
                            }
                        });

                        // Create new Direccion
                        const nuevaDireccion = new Direccion({
                            nombre: direccionCompleta,
                            direccionOriginal: direccionCompleta,
                            apiId: result.place_id,
                            latitud: location.lat,
                            longitud: location.lng,
                            comuna: nombreComuna,
                            ciudad: xliente.ciudad,
                            region: nombreRegione,
                            codigoPostal: codigoPostal,
                            categoria: result.types[0] || 'address'
                        });

                        const direccionGuardada = await nuevaDireccion.save();
                        direccionId = direccionGuardada._id;
                        direccionesCreadas++;
                        console.log(`Nueva dirección creada para cliente ${cliente._id}: ${direccionCompleta}`);
                        
                    } else if (data.status === 'ZERO_RESULTS') {
                        // Create basic Direccion for ZERO_RESULTS
                        const direccionBasica = new Direccion({
                            nombre: direccionCompleta,
                            direccionOriginal: direccionCompleta,
                            apiId: null,
                            latitud: null,
                            longitud: null,
                            comuna: nombreComuna,
                            ciudad: xliente.ciudad,
                            region: nombreRegione,
                            codigoPostal: null,
                            categoria: 'unresolved'
                        });

                        const direccionGuardada = await direccionBasica.save();
                        direccionId = direccionGuardada._id;
                        direccionesCreadas++;
                        console.log(`Dirección básica creada para cliente ${cliente._id} (ZERO_RESULTS)`);
                        
                    } else {
                        direccionesSinReparar++;
                        direccionesFallidas.push(`${direccionCompleta} - API Status: ${data.status}`);
                        console.warn(`Google Maps API failed for address: ${direccionCompleta} - Status: ${data.status}`);
                        continue;
                    }
                } catch (apiError) {
                    direccionesSinReparar++;
                    direccionesFallidas.push(direccionCompleta);
                    console.error(`API error for address ${direccionCompleta}:`, apiError);
                    continue;
                }
            }

            // Update cliente with direccionId and ensure it's in direccionesDespacho
            if (direccionId) {
                const updateData = { direccionId };
                
                // Check if direccionId is already in direccionesDespacho
                const existeEnDespacho = cliente.direccionesDespacho.some(
                    dir => dir.direccionId && dir.direccionId.toString() === direccionId.toString()
                );
                
                if (!existeEnDespacho) {
                    // Add to direccionesDespacho array
                    updateData.direccionesDespacho = [
                        ...cliente.direccionesDespacho,
                        { direccionId: direccionId, comentario: 'Dirección principal' }
                    ];
                }

                await Cliente.findByIdAndUpdate(cliente._id, updateData);
                direccionesReparadas++;
            }

            // Progress reporting
            const porcentajeAvance = ((i + 1) / clientes.length * 100).toFixed(2);
            const tiempoEstimado = Math.ceil((clientes.length - (i + 1)) / 60); // minutes
            
            console.log(`Progreso: ${i + 1}/${clientes.length} (${porcentajeAvance}%) - Tiempo estimado: ${tiempoEstimado} minutos`);

            // Wait between API calls to respect rate limits
            if (i < clientes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            direccionesSinReparar++;
            direccionesFallidas.push(`Cliente ID: ${cliente._id} - Error interno: ${error.message}`);
            console.error(`Error processing cliente ${cliente._id}:`, error);
        }
    }

    // Generate final report
    console.log('\n=== INFORME FINAL DE GEOCOMPLECIÓN ===');
    console.log(`Direcciones detectadas: ${direccionesDetectadas}`);
    console.log(`Direcciones reparadas: ${direccionesReparadas}`);
    console.log(`Direcciones creadas: ${direccionesCreadas}`);
    console.log(`Direcciones reutilizadas: ${direccionesReutilizadas}`);
    console.log(`Direcciones sin reparar: ${direccionesSinReparar}`);

    // Check for orphaned addresses
    const todasDirecciones = await Direccion.find({});
    const direccionesUsadas = new Set();
    
    const clientesCompletos = await Cliente.find({}).populate('direccionId');
    
    clientesCompletos.forEach(cliente => {
        if (cliente.direccionId) {
            direccionesUsadas.add(cliente.direccionId._id.toString());
        }
        cliente.direccionesDespacho.forEach(despacho => {
            if (despacho.direccionId) {
                direccionesUsadas.add(despacho.direccionId.toString());
            }
        });
    });

    const direccionesHuerfanas = todasDirecciones.filter(
        dir => !direccionesUsadas.has(dir._id.toString())
    );

    console.log(`\nDirecciones huérfanas (sin referencia de clientes): ${direccionesHuerfanas.length}`);
    console.log(`Total de direcciones en DB: ${todasDirecciones.length}`);
    console.log(`Direcciones utilizadas: ${direccionesUsadas.size}`);

    if (direccionesFallidas.length > 0) {
        console.log('\nDirecciones que fallaron:');
        direccionesFallidas.forEach((direccion, index) => {
            console.log(`${index + 1}. ${direccion}`);
        });
    }

    if (direccionesHuerfanas.length > 0) {
        console.log('\nPrimeras 10 direcciones huérfanas:');
        direccionesHuerfanas.slice(0, 10).forEach((dir, index) => {
            console.log(`${index + 1}. ${dir.nombre || dir.direccionOriginal} (ID: ${dir._id})`);
        });
    }

    console.log('=====================================\n');
}

const migrarClientes = async () => {
    const xlientes = await Xliente.find({});
    let clientesActualizados = 0;
    let clientesNoEncontrados = 0;

    console.log(`Encontrados ${xlientes.length} xlientes para migrar`);

    for (const xliente of xlientes) {
        try {
            // Find cliente by temporalId matching xliente.id
            const cliente = await Cliente.findOne({ temporalId: xliente.id });
            
            if (cliente) {
                // Map all xliente fields to cliente fields (xliente data takes precedence)
                const updateData = {
                    temporalId: xliente.id,
                    nombre: xliente.nombre || cliente.nombre,
                    rut: xliente.rut || cliente.rut,
                    giro: xliente.giro,
                    telefono: xliente.telefono || cliente.telefono,
                    email: xliente.email || cliente.email,
                    emailIntercambio: xliente.email_intercambio || cliente.emailIntercambio,
                    envioFactura: xliente.envio_factura?.toLowerCase() === 'si' || xliente.envio_factura === '1' || cliente.envioFactura,
                    envioReporte: xliente.envio_reporte?.toLowerCase() === 'si' || xliente.envio_reporte === '1' || cliente.envioReporte,
                    seguimiento: xliente.seguimiento?.toLowerCase() === 'si' || xliente.seguimiento === '1' || cliente.seguimiento,
                    ordenCompra: xliente.orden_compra?.toLowerCase() === 'si' || xliente.orden_compra === '1' || cliente.ordenCompra,
                    reporteDeuda: xliente.reporte_deuda?.toLowerCase() === 'si' || xliente.reporte_deuda === '1' || cliente.reporteDeuda,
                    arriendo: xliente.arriendo?.toLowerCase() === 'si' || xliente.arriendo === '1' || cliente.arriendo,
                    dias_de_pago: xliente.dias_de_pago ? parseInt(xliente.dias_de_pago) : cliente.dias_de_pago,
                    notificacion: xliente.notificacion?.toLowerCase() === 'si' || xliente.notificacion === '1' || cliente.notificacion,
                    credito: xliente.credito ? parseFloat(xliente.credito) : cliente.credito,
                    urlWeb: xliente.web || cliente.urlWeb,
                    comentario: xliente.comentario || cliente.comentario,
                    contacto: xliente.contacto || cliente.contacto,
                    activo: xliente.activo ? (xliente.activo === 'Si' || xliente.activo === '1' || xliente.activo === 'activo') : cliente.activo,
                    cilindrosMin: xliente.cilindrosminimo || cliente.cilindrosMin,
                    cilindrosMax: xliente.limite_cilindros ? parseInt(xliente.limite_cilindros) : cliente.cilindrosMax,
                    enQuiebra: xliente.quiebra ? (xliente.quiebra === 'Si' || xliente.quiebra === '1') : cliente.enQuiebra,
                    mesesAumento: xliente.mesesaumento ? 
                        xliente.mesesaumento.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m)) : 
                        cliente.mesesAumento
                };

                // Find creator user by temporalId
                if (xliente.creado_por) {
                    const creador = await User.findOne({ temporalId: xliente.creado_por });
                    if (creador) {
                        updateData.creadorId = creador._id;
                    }
                }

                // Find documento tributario by temporalId
                if (xliente.tipodoc) {
                    const docTributario = await DocumentoTributario.findOne({ temporalId: xliente.tipodoc });
                    if (docTributario) {
                        updateData.documentoTributarioId = docTributario._id;
                    }
                }

                // Update cliente with all mapped fields
                await Cliente.findByIdAndUpdate(cliente._id, updateData);
                
                clientesActualizados++;
                console.log(`Cliente ${cliente._id} actualizado completamente desde xliente ${xliente.id}`);
            } else {
                clientesNoEncontrados++;
                console.warn(`Cliente no encontrado para temporalId: ${xliente.id}`);
                const nuevoCliente = new Cliente({
                    temporalId: xliente.id,
                    nombre: xliente.nombre,
                    rut: xliente.rut,
                    giro: xliente.giro,
                    telefono: xliente.telefono,
                    email: xliente.email,
                    emailIntercambio: xliente.email_intercambio,
                    envioFactura: xliente.envio_factura === 'Si' || xliente.envio_factura === '1',
                    envioReporte: xliente.envio_reporte === 'Si' || xliente.envio_reporte === '1',
                    seguimiento: xliente.seguimiento === 'Si' || xliente.seguimiento === '1',
                    ordenCompra: xliente.orden_compra === 'Si' || xliente.orden_compra === '1',
                    reporteDeuda: xliente.reporte_deuda === 'Si' || xliente.reporte_deuda === '1',
                    arriendo: xliente.arriendo === 'Si' || xliente.arriendo === '1',
                    dias_de_pago: xliente.dias_de_pago ? parseInt(xliente.dias_de_pago) : 1,
                    notificacion: xliente.notificacion === 'Si' || xliente.notificacion === '1',
                    credito: xliente.credito ? parseFloat(xliente.credito) : 300000,
                    urlWeb: xliente.web,
                    comentario: xliente.comentario,
                    contacto: xliente.contacto,
                    activo: xliente.activo ? (xliente.activo === 'Si' || xliente.activo === '1' || xliente.activo === 'activo') : true,
                    cilindrosMin: xliente.cilindrosminimo || '0',
                    cilindrosMax: xliente.limite_cilindros ? parseInt(xliente.limite_cilindros) : 9999,
                    enQuiebra: xliente.quiebra === 'Si' || xliente.quiebra === '1',
                    mesesAumento: xliente.mesesaumento ?
                        xliente.mesesaumento.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m)) :
                        [],
                    creadorId: null,
                    documentoTributarioId: null,
                    direccionesDespacho: []
                });

                // Buscar creador
                if (xliente.creado_por) {
                    const creador = await User.findOne({ temporalId: xliente.creado_por });
                    if (creador) {
                        nuevoCliente.creadorId = creador._id;
                    }
                }

                // Buscar documento tributario
                if (xliente.documentoTributarioId) {
                    const docTributario = await DocumentoTributario.findOne({ temporalId: xliente.documentoTributarioId });
                    if (docTributario) {
                        nuevoCliente.documentoTributarioId = docTributario._id;
                    }
                }

                await nuevoCliente.save();
                console.log(`Cliente creado desde xliente ${xliente.id}`);
            }
        } catch (error) {
            console.error(`Error procesando xliente ${xliente.id}:`, error);
        }
    }

    console.log(`\nClientes actualizados: ${clientesActualizados}`);
    console.log(`Clientes creados: ${clientesNoEncontrados}`);
}

const repararDirecciones = async () => {
    const clientes = await Cliente.find({});
    let clientesActualizados = 0;

    console.log(`Encontrados ${clientes.length} clientes para reparar direcciones`);

    for (const cliente of clientes) {
        try {
            if (cliente.direccionId) {
                // Update direccionesDespacho to contain only the client's main address
                await Cliente.findByIdAndUpdate(
                    cliente._id,
                    {
                        direccionesDespacho: [{
                            direccionId: cliente.direccionId,
                            comentario: 'Dirección comercial'
                        }]
                    }
                );
                
                clientesActualizados++;
                console.log(`Cliente ${cliente._id} actualizado - direccionesDespacho sincronizado con direccionId`);
            } else {
                console.warn(`Cliente ${cliente._id} no tiene direccionId definida`);
            }
        } catch (error) {
            console.error(`Error procesando cliente ${cliente._id}:`, error);
        }
    }

    console.log(`\nClientes actualizados: ${clientesActualizados}`);
}

const eliminarDireccionesHuerfanas = async () => {
    const todasDirecciones = await Direccion.find({});
    const direccionesUsadas = new Set();
    
    const clientes = await Cliente.find({}).populate('direccionId');
    clientes.forEach(cliente => {
        if (cliente.direccionId) {
            direccionesUsadas.add(cliente.direccionId._id.toString());
        }
        cliente.direccionesDespacho.forEach(despacho => {
            if (despacho.direccionId) {
                direccionesUsadas.add(despacho.direccionId.toString());
            }
        });
    });
    const direccionesHuerfanas = todasDirecciones.filter(
        dir => !direccionesUsadas.has(dir._id.toString())
    );
    console.log(`Found ${direccionesHuerfanas.length} orphaned addresses to delete`);
    for (const direccion of direccionesHuerfanas) {
        try {
            await Direccion.findByIdAndDelete(direccion._id);
            console.log(`Deleted orphaned address ${direccion._id}`);
        } catch (error) {
            console.error(`Error deleting address ${direccion._id}:`, error);
        }
    }
    console.log('Orphaned address deletion completed');
}

const encontrarCilindros = async () => {
    try {
        await connectMongoDB();
        
        const targetDireccionId = new mongoose.Types.ObjectId('686ab4ac49e6cb8c30c59f99');
        
        const result = await ItemCatalogo.updateMany(
            { direccionId: { $exists: false } },
            { $set: { direccionId: targetDireccionId } }
        );
        
        console.log(`Updated ${result.modifiedCount} items without direccionId`);
        return result;
    } catch (error) {
        console.error("Error updating ItemCatalogo direccionId:", error);
        throw error;
    }
}


