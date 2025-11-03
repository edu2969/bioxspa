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
    
    return NextResponse.json({ message: "Success migrate and improve" });
}

const resetVentas = async () => {
    await Venta.deleteMany({});
    await RutaDespacho.deleteMany({});
    await DetalleVenta.deleteMany({});
}

const mejorarSubcategorias = async () => {
    const items = await ItemCatalogo.find({});
        
        for (const item of items) {
            try {
                // Get the subcategoria from the item
                const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId);
                
                if (subcategoria && subcategoria.temporalId) {
                    // Find the corresponding xubcategoriaProducto using temporalId
                    const xubcategoria = await XubcategoriaProducto.findOne({ id: subcategoria.temporalId });
                    
                    if (xubcategoria && xubcategoria.categoria_id) {
                        // Find the categoria using the categoria_id as temporalId
                        const categoria = await CategoriaCatalogo.findOne({ temporalId: xubcategoria.categoria_id });
                        
                        if (categoria) {
                            // Update the subcategoria with the categoriaCatalogoId
                            await SubcategoriaCatalogo.findByIdAndUpdate(
                                subcategoria._id,
                                { categoriaCatalogoId: categoria._id }
                            );
                            
                            console.log(`Updated subcategoria ${subcategoria._id} with categoria ${categoria._id}`);
                        } else {
                            console.warn(`Categoria not found for temporalId: ${xubcategoria.categoria_id}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing item ${item._id}:`, error);
            }
        }
}

const completarCategorias = async () => {
    const categorias = await CategoriaCatalogo.find({});

    for (const categoria of categorias) {
        try {
            // Find the corresponding XategoriaProducto by name
            const xategoria = await XategoriaProducto.findOne({ nombre: categoria.nombre });
            
            if (xategoria) {
                // Update the categoria with the temporalId from XategoriaProducto
                await CategoriaCatalogo.findByIdAndUpdate(
                    categoria._id,
                    { temporalId: xategoria.id }
                );
                
                console.log(`Updated categoria ${categoria._id} with temporalId ${xategoria.id}`);
            } else {
                console.warn(`XategoriaProducto not found for categoria: ${categoria.nombre}`);
            }
        } catch (error) {
            console.error(`Error processing categoria ${categoria._id}:`, error);
        }
    }
}

const actualizarPrecios = async () => {
    const xproductos = await XroductosCliente.find({});

    for (const xproducto of xproductos) {
        try {
            if (!xproducto.clientes_id || !xproducto.subcategoria_id) {
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
                    impuesto: 0,
                    moneda: 'CLP',
                    valor: parseFloat(xproducto.precio1) || 0,
                    historial: []
                };

                // Update or create precio
                await Precio.findOneAndUpdate(
                    {
                        subcategoriaCatalogoId: subcategoria._id,
                        clienteId: cliente._id
                    },
                    precioData,
                    { upsert: true, new: true }
                );

                console.log(`Updated/Created precio for cliente ${cliente._id} and subcategoria ${subcategoria._id}`);
            } else {
                console.warn(`Cliente or subcategoria not found for ids: ${xproducto.clientes_id}, ${xproducto.subcategoria_id}`);
            }
        } catch (error) {
            console.error(`Error processing xproducto ${xproducto.id}:`, error);
        }
    }
}

const geoCompletition = async () => {
    const clientes = await Cliente.find({}).limit(1000);
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
                    nombre: xliente.nombre || cliente.nombre,
                    rut: xliente.rut || cliente.rut,
                    giro: xliente.giro,
                    telefono: xliente.telefono || cliente.telefono,
                    email: xliente.email || cliente.email,
                    emailIntercambio: xliente.email_intercambio || cliente.emailIntercambio,
                    envioFactura: xliente.envio_factura === 'Si' || xliente.envio_factura === '1' || cliente.envioFactura,
                    envioReporte: xliente.envio_reporte === 'Si' || xliente.envio_reporte === '1' || cliente.envioReporte,
                    seguimiento: xliente.seguimiento === 'Si' || xliente.seguimiento === '1' || cliente.seguimiento,
                    ordenCompra: xliente.orden_compra === 'Si' || xliente.orden_compra === '1' || cliente.ordenCompra,
                    reporteDeuda: xliente.reporte_deuda === 'Si' || xliente.reporte_deuda === '1' || cliente.reporteDeuda,
                    arriendo: xliente.arriendo === 'Si' || xliente.arriendo === '1' || cliente.arriendo,
                    dias_de_pago: xliente.dias_de_pago ? parseInt(xliente.dias_de_pago) : cliente.dias_de_pago,
                    notificacion: xliente.notificacion === 'Si' || xliente.notificacion === '1' || cliente.notificacion,
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
                if (xliente.documentoTributarioId) {
                    const docTributario = await DocumentoTributario.findOne({ temporalId: xliente.documentoTributarioId });
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
            }
        } catch (error) {
            console.error(`Error procesando xliente ${xliente.id}:`, error);
        }
    }

    console.log(`\nClientes actualizados: ${clientesActualizados}`);
    console.log(`Clientes no encontrados: ${clientesNoEncontrados}`);
}

const repararCategoriasRepetidas = async () => {
    // Get all CategoriaCatalogo grouped by temporalId to find duplicates
    const categoriaGroups = await CategoriaCatalogo.aggregate([
        {
            $match: { temporalId: { $ne: null } }
        },
        {
            $group: {
                _id: "$temporalId",
                categorias: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }
        },
        {
            $match: { count: { $gt: 1 } }
        }
    ]);

    console.log(`Found ${categoriaGroups.length} categoria groups with duplicates`);

    for (const group of categoriaGroups) {
        const categorias = group.categorias;
        const categoriaToKeep = categorias[0]; // Keep the first one
        const categoriasToRemove = categorias.slice(1); // Remove the rest
        
        console.log(`Processing categoria group with temporalId: ${group._id}`);
        console.log(`Keeping categoria: ${categoriaToKeep._id}, removing: ${categoriasToRemove.map(c => c._id).join(', ')}`);
        
        // Get all subcategorias that reference any of these categorias
        const subcategoriasToUpdate = await SubcategoriaCatalogo.find({
            categoriaCatalogoId: { $in: categoriasToRemove.map(c => c._id) }
        });
        
        // Update subcategorias to reference the categoria to keep
        if (subcategoriasToUpdate.length > 0) {
            await SubcategoriaCatalogo.updateMany(
                { categoriaCatalogoId: { $in: categoriasToRemove.map(c => c._id) } },
                { $set: { categoriaCatalogoId: categoriaToKeep._id } }
            );
            console.log(`Updated ${subcategoriasToUpdate.length} subcategorias`);
        }
        
        // Remove duplicate categorias
        await CategoriaCatalogo.deleteMany({
            _id: { $in: categoriasToRemove.map(c => c._id) }
        });
        console.log(`Removed ${categoriasToRemove.length} duplicate categorias`);
    }

    // Now handle subcategoria duplicates
    const subcategoriaGroups = await SubcategoriaCatalogo.aggregate([
        {
            $match: { temporalId: { $ne: null } }
        },
        {
            $group: {
                _id: "$temporalId",
                subcategorias: { $push: "$$ROOT" },
                count: { $sum: 1 }
            }
        },
        {
            $match: { count: { $gt: 1 } }
        }
    ]);

    console.log(`Found ${subcategoriaGroups.length} subcategoria groups with duplicates`);

    for (const group of subcategoriaGroups) {
        const subcategorias = group.subcategorias;
        const subcategoriaToKeep = subcategorias[0]; // Keep the first one
        const subcategoriasToRemove = subcategorias.slice(1); // Remove the rest
        
        console.log(`Processing subcategoria group with temporalId: ${group._id}`);
        console.log(`Keeping subcategoria: ${subcategoriaToKeep._id}, removing: ${subcategoriasToRemove.map(s => s._id).join(', ')}`);
        
        // Update ItemCatalogo references
        const itemsToUpdate = await ItemCatalogo.find({
            subcategoriaCatalogoId: { $in: subcategoriasToRemove.map(s => s._id) }
        });
        
        if (itemsToUpdate.length > 0) {
            await ItemCatalogo.updateMany(
                { subcategoriaCatalogoId: { $in: subcategoriasToRemove.map(s => s._id) } },
                { $set: { subcategoriaCatalogoId: subcategoriaToKeep._id } }
            );
            console.log(`Updated ${itemsToUpdate.length} items' subcategoriaCatalogoId`);
        }
        
        // Update ItemCatalogo subcategoriaCatalogoIds arrays
        await ItemCatalogo.updateMany(
            { subcategoriaCatalogoIds: { $in: subcategoriasToRemove.map(s => s._id) } },
            { 
                $pullAll: { subcategoriaCatalogoIds: subcategoriasToRemove.map(s => s._id) },
                $addToSet: { subcategoriaCatalogoIds: subcategoriaToKeep._id }
            }
        );
        
        // Update Precio references
        const preciosToUpdate = await Precio.find({
            subcategoriaCatalogoId: { $in: subcategoriasToRemove.map(s => s._id) }
        });
        
        if (preciosToUpdate.length > 0) {
            await Precio.updateMany(
                { subcategoriaCatalogoId: { $in: subcategoriasToRemove.map(s => s._id) } },
                { $set: { subcategoriaCatalogoId: subcategoriaToKeep._id } }
            );
            console.log(`Updated ${preciosToUpdate.length} precios`);
        }
        
        // Remove duplicate subcategorias
        await SubcategoriaCatalogo.deleteMany({
            _id: { $in: subcategoriasToRemove.map(s => s._id) }
        });
        console.log(`Removed ${subcategoriasToRemove.length} duplicate subcategorias`);
    }

    console.log('Catalog repair completed successfully');
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


