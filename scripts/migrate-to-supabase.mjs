#!/usr/bin/env node

/**
 * BIOX - Script de Migración MongoDB → Supabase PostgreSQL
 * 
 * Este script migra todos los datos desde MongoDB hacia PostgreSQL
 * manteniendo relaciones y optimizando para BI.
 * 
 * Modelos a migrar:
 * - User -> usuarios  
 * - Cargo -> cargos
 * - Sucursal -> sucursales  
 * - Dependencia -> dependencias
 * - Cliente -> clientes
 * - CategoriaCatalogo -> categorias_catalogo
 * - SubcategoriaCatalogo -> subcategorias_catalogo
 * - ItemCatalogo -> items_catalogo
 * - Vehiculo -> vehiculos
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        }
    });
}

// Importar modelos MongoDB
import User from '../models/user.js';
import Cargo from '../models/cargo.js';
import Sucursal from '../models/sucursal.js';
import Dependencia from '../models/dependencia.js';
import Cliente from '../models/cliente.js';
import CategoriaCatalogo from '../models/categoriaCatalogo.js';
import SubcategoriaCatalogo from '../models/subcategoriaCatalogo.js';
import ItemCatalogo from '../models/itemCatalogo.js';
import Vehiculo from '../models/vehiculo.js';

// Configuración
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debug - Variables de entorno:');
console.log(`MONGODB_URI: ${MONGODB_URI ? 'OK' : 'FALTANTE'}`);
console.log(`SUPABASE_URL: ${SUPABASE_URL ? 'OK' : 'FALTANTE'}`);
console.log(`SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'OK (length: ' + SUPABASE_SERVICE_KEY.length + ')' : 'FALTANTE'}`);

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERROR: Variables de entorno faltantes');
    console.error('Necesitas configurar:');
    if (!MONGODB_URI) console.error('- MONGODB_URI');
    if (!SUPABASE_URL) console.error('- NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapeo ObjectId -> UUID para mantener relaciones
const idMappings = {
    users: new Map(),
    sucursales: new Map(),
    dependencias: new Map(),
    clientes: new Map(),
    categorias: new Map(),
    subcategorias: new Map(),
    items: new Map(),
    vehiculos: new Map(),
    direcciones: new Map()
};

let stats = {
    total: 0,
    migrated: 0,
    errors: 0,
    skipped: 0
};

/**
 * Función principal de migración
 */
async function migrateData() {
    console.log('🚀 Iniciando migración de datos MongoDB → Supabase...\n');

    try {
        // Conectar a MongoDB
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Verificar conexión Supabase
        console.log('🔗 Probando conexión a Supabase...');
        const { data, error } = await supabase.from('usuarios').select('count').limit(1);
        if (error) {
            console.log('⚠️  Warning Supabase:', error.message);
            // Continuamos aunque haya error, puede ser normal
        }
        console.log('✅ Conexión a Supabase probada\n');

        // Ejecutar migración en orden de dependencias
        console.log('📊 Iniciando migración de modelos...');
        await migrateInOrder();

        // Mostrar estadísticas finales
        console.log('\n🎉 ¡Migración completada!');
        console.log(`📊 Estadísticas:`);
        console.log(`   Total procesados: ${stats.total}`);
        console.log(`   Migrados: ${stats.migrated}`);
        console.log(`   Errores: ${stats.errors}`);
        console.log(`   Saltados: ${stats.skipped}`);

        if (stats.errors > 0) {
            console.log('⚠️  Revisa los errores arriba para detalles');
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Desconectado de MongoDB');
    }
}

/**
 * Migrar en orden correcto de dependencias
 */
async function migrateInOrder() {
    // 1. Usuarios (base para todo)
    await migrateUsers();
    
    // 2. Sucursales 
    await migrateSucursales();
    
    // 3. Dependencias (dependen de sucursales)
    await migrateDependencias();
    
    // 4. Cargos (dependen de usuarios, sucursales y dependencias)
    await migrateCargos();
    
    // 5. Clientes
    await migrateClientes();
    
    // 6. Categorías del catálogo
    await migrateCategoriasCatalogo();
    
    // 7. Subcategorías (dependen de categorías)
    await migrateSubcategoriasCatalogo();
    
    // 8. Items del catálogo (dependen de subcategorías)
    await migrateItemsCatalogo();
    
    // 9. Vehículos (dependen de clientes)
    await migrateVehiculos();
}

/**
 * Migrar usuarios
 */
async function migrateUsers() {
    console.log('👥 Migrando usuarios...');
    
    const users = await User.find({});
    console.log(`   Encontrados: ${users.length} usuarios`);
    
    for (const user of users) {
        try {
            const newId = uuidv4();
            idMappings.users.set(user._id.toString(), newId);
            
            const userData = {
                id: newId,
                temporal_id: user.name,
                nombre: user.name,
                email: user.email,
                password_hash: user.password,
                persona_id: null, // Se mapea después si existe
                rol: user.role,
                activo: user.active,
                created_at: user.createdAt || user.createdAt || new Date(),
                updated_at: user.updatedAt || user.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('usuarios')
                .upsert(userData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando usuario ${user.email}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando usuario ${user._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Usuarios migrados: ${stats.migrated}/${users.length}\n`);
}

/**
 * Migrar sucursales
 */
async function migrateSucursales() {
    console.log('🏢 Migrando sucursales...');
    
    const sucursales = await Sucursal.find({});
    console.log(`   Encontradas: ${sucursales.length} sucursales`);
    
    for (const sucursal of sucursales) {
        try {
            const newId = uuidv4();
            idMappings.sucursales.set(sucursal._id.toString(), newId);
            
            const sucursalData = {
                id: newId,
                codigo_interno: sucursal.id?.toString() || `SUC-${Math.random().toString(36).substr(2, 9)}`,
                nombre: sucursal.nombre,
                direccion_id: null, // Se mapea después si existe direccionId
                visible: sucursal.visible !== false,
                prioridad: sucursal.prioridad || 0,
                activa: true,
                created_at: sucursal.createdAt || new Date(),
                updated_at: sucursal.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('sucursales')
                .upsert(sucursalData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando sucursal ${sucursal.nombre}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando sucursal ${sucursal._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Sucursales migradas: ${stats.migrated}/${sucursales.length}\n`);
}

/**
 * Migrar dependencias
 */
async function migrateDependencias() {
    console.log('🏛️ Migrando dependencias...');
    
    const dependencias = await Dependencia.find({});
    console.log(`   Encontradas: ${dependencias.length} dependencias`);
    
    for (const dependencia of dependencias) {
        try {
            const newId = uuidv4();
            idMappings.dependencias.set(dependencia._id.toString(), newId);
            
            const dependenciaData = {
                id: newId,
                nombre: dependencia.nombre || 'Sin nombre',
                tipo: dependencia.tipo || 10,
                sucursal_id: dependencia.sucursalId ? 
                    idMappings.sucursales.get(dependencia.sucursalId.toString()) : null,
                direccion_id: null, // Se mapea después si existe
                cliente_id: dependencia.clienteId ? 
                    idMappings.clientes.get(dependencia.clienteId.toString()) : null,
                operativa: dependencia.operativa !== false,
                activa: true,
                created_at: dependencia.createdAt || new Date(),
                updated_at: dependencia.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('dependencias')
                .upsert(dependenciaData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando dependencia ${dependencia.nombre}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando dependencia ${dependencia._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Dependencias migradas: ${stats.migrated}/${dependencias.length}\n`);
}

/**
 * Migrar cargos
 */
async function migrateCargos() {
    console.log('👔 Migrando cargos...');
    
    const cargos = await Cargo.find({});
    console.log(`   Encontrados: ${cargos.length} cargos`);
    
    for (const cargo of cargos) {
        try {
            const newId = uuidv4();
            
            const cargoData = {
                id: newId,
                usuario_id: cargo.userId ? 
                    idMappings.users.get(cargo.userId.toString()) : null,
                dependencia_id: cargo.dependenciaId ? 
                    idMappings.dependencias.get(cargo.dependenciaId.toString()) : null,
                sucursal_id: cargo.sucursalId ? 
                    idMappings.sucursales.get(cargo.sucursalId.toString()) : null,
                tipo: cargo.tipo,
                desde: cargo.desde || new Date(),
                hasta: cargo.hasta,
                activo: !cargo.hasta, // Si no tiene fecha hasta, está activo
                created_at: cargo.createdAt || new Date(),
                updated_at: cargo.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('cargos')
                .upsert(cargoData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando cargo ${cargo._id}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando cargo ${cargo._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Cargos migrados: ${stats.migrated}/${cargos.length}\n`);
}

/**
 * Migrar clientes
 */
async function migrateClientes() {
    console.log('👥 Migrando clientes...');
    
    const clientes = await Cliente.find({});
    console.log(`   Encontrados: ${clientes.length} clientes`);
    
    for (const cliente of clientes) {
        try {
            const newId = uuidv4();
            idMappings.clientes.set(cliente._id.toString(), newId);
            
            const clienteData = {
                id: newId,
                temporal_id: cliente.temporalId,
                nombre: cliente.nombre,
                rut: cliente.rut,
                giro: cliente.giro,
                telefono: cliente.telefono,
                email: cliente.email,
                email_intercambio: cliente.emailIntercambio,
                envio_factura: cliente.envioFactura || false,
                envio_reporte: cliente.envioReporte || false,
                seguimiento: cliente.seguimiento || false,
                orden_compra: cliente.ordenCompra || false,
                reporte_deuda: cliente.reporteDeuda || false,
                arriendo: cliente.arriendo || false,
                dias_credito: cliente.dias_de_pago || 1,
                notificacion: cliente.notificacion || false,
                limite_credito: cliente.credito || 300000,
                url_web: cliente.urlWeb,
                comentario: cliente.comentario,
                contacto: cliente.contacto,
                activo: cliente.activo !== false,
                cilindros_min: parseInt(cliente.cilindrosMin) || 0,
                cilindros_max: cliente.cilindrosMax || 9999,
                en_quiebra: cliente.enQuiebra || false,
                meses_aumento: cliente.mesesAumento || [],
                direccion_facturacion: null, // Se mapea después si existe direccionId
                ciudad: null, // Se extrae de dirección
                region_id: null, // Se mapea después
                created_at: cliente.createdAt || new Date(),
                updated_at: cliente.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('clientes')
                .upsert(clienteData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando cliente ${cliente.nombre}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando cliente ${cliente._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Clientes migrados: ${stats.migrated}/${clientes.length}\n`);
}

/**
 * Migrar categorías del catálogo
 */
async function migrateCategoriasCatalogo() {
    console.log('📦 Migrando categorías del catálogo...');
    
    const categorias = await CategoriaCatalogo.find({});
    console.log(`   Encontradas: ${categorias.length} categorías`);
    
    for (const categoria of categorias) {
        try {
            const newId = uuidv4();
            idMappings.categorias.set(categoria._id.toString(), newId);
            
            const categoriaData = {
                id: newId,
                temporal_id: categoria.temporalId,
                nombre: categoria.nombre,
                descripcion: categoria.descripcion,
                seguir: categoria.seguir || false,
                url_imagen: categoria.urlImagen,
                tipo: categoria.tipo,
                gas: categoria.gas,
                elemento: categoria.elemento,
                es_industrial: categoria.esIndustrial || false,
                es_medicinal: categoria.esMedicinal || false,
                activa: true,
                created_at: categoria.createdAt || new Date(),
                updated_at: categoria.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('categorias_catalogo')
                .upsert(categoriaData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando categoría ${categoria.nombre}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando categoría ${categoria._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Categorías migradas: ${stats.migrated}/${categorias.length}\n`);
}

/**
 * Migrar subcategorías del catálogo
 */
async function migrateSubcategoriasCatalogo() {
    console.log('📂 Migrando subcategorías del catálogo...');
    
    const subcategorias = await SubcategoriaCatalogo.find({});
    console.log(`   Encontradas: ${subcategorias.length} subcategorías`);
    
    for (const subcategoria of subcategorias) {
        try {
            const newId = uuidv4();
            idMappings.subcategorias.set(subcategoria._id.toString(), newId);
            
            const subcategoriaData = {
                id: newId,
                temporal_id: subcategoria.temporalId,
                nombre: subcategoria.nombre,
                categoria_id: subcategoria.categoriaCatalogoId ? 
                    idMappings.categorias.get(subcategoria.categoriaCatalogoId.toString()) : null,
                cantidad: subcategoria.cantidad,
                unidad: subcategoria.unidad,
                sin_sifon: subcategoria.sinSifon || false,
                url_imagen: subcategoria.urlImagen,
                activa: true,
                created_at: subcategoria.createdAt || new Date(),
                updated_at: subcategoria.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('subcategorias_catalogo')
                .upsert(subcategoriaData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando subcategoría ${subcategoria.nombre}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando subcategoría ${subcategoria._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Subcategorías migradas: ${stats.migrated}/${subcategorias.length}\n`);
}

/**
 * Migrar items del catálogo
 */
async function migrateItemsCatalogo() {
    console.log('🏷️ Migrando items del catálogo...');
    
    const items = await ItemCatalogo.find({});
    console.log(`   Encontrados: ${items.length} items`);
    
    for (const item of items) {
        try {
            const newId = uuidv4();
            idMappings.items.set(item._id.toString(), newId);
            
            const itemData = {
                id: newId,
                temporal_id: item.temporalId,
                codigo: item.codigo,
                estado: item.estado || 0,
                subcategoria_id: item.subcategoriaCatalogoId ? 
                    idMappings.subcategorias.get(item.subcategoriaCatalogoId.toString()) : null,
                nombre: item.nombre,
                descripcion: item.descripcion,
                descripcion_corta: item.descripcionCorta,
                ficha_tecnica: item.fichaTecnica,
                url_ficha_tecnica: item.urlFichaTecnica,
                url_imagen: item.urlImagen,
                garantia_anual: item.garantiaAnual || 0,
                destacado: item.destacado || false,
                stock_minimo: item.stockMinimo || 0,
                stock_actual: item.stockActual || 0,
                precio_base: 0, // Se calculará después desde precios
                visible: item.visible !== false,
                url: item.url,
                direccion_id: null, // Se mapea después si existe
                propietario_id: item.ownerId ? 
                    idMappings.clientes.get(item.ownerId.toString()) : null,
                fecha_mantencion: item.fechaMantencion,
                sucursal_id: null, // Se asigna después según lógica de negocio
                activo: true,
                created_at: item.createdAt || new Date(),
                updated_at: item.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('items_catalogo')
                .upsert(itemData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando item ${item.codigo || item._id}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando item ${item._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Items migrados: ${stats.migrated}/${items.length}\n`);
}

/**
 * Migrar vehículos
 */
async function migrateVehiculos() {
    console.log('🚚 Migrando vehículos...');
    
    const vehiculos = await Vehiculo.find({});
    console.log(`   Encontrados: ${vehiculos.length} vehículos`);
    
    for (const vehiculo of vehiculos) {
        try {
            const newId = uuidv4();
            idMappings.vehiculos.set(vehiculo._id.toString(), newId);
            
            const vehiculoData = {
                id: newId,
                temporal_id: vehiculo.temporalId,
                patente: vehiculo.patente,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                numero_motor: vehiculo.nmotor,
                numero_chasis: vehiculo.numeroChasis,
                ano: vehiculo.ano,
                empresa_id: vehiculo.empresaId,
                cliente_id: vehiculo.clienteId ? 
                    idMappings.clientes.get(vehiculo.clienteId.toString()) : null,
                revision_tecnica: vehiculo.revisionTecnica,
                fecha_vencimiento_extintor: vehiculo.fechaVencimientoExtintor,
                direccion_destino_id: null, // Se mapea después si existe
                posicion_latitud: vehiculo.posicionActual?.latitud,
                posicion_longitud: vehiculo.posicionActual?.longitud,
                created_at: vehiculo.createdAt || new Date(),
                updated_at: vehiculo.updatedAt || new Date()
            };

            const { error } = await supabase
                .from('vehiculos')
                .upsert(vehiculoData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error migrando vehículo ${vehiculo.patente}:`, error);
                stats.errors++;
            } else {
                stats.migrated++;
                
                // Migrar relaciones vehículo-conductores
                if (vehiculo.choferIds && vehiculo.choferIds.length > 0) {
                    for (const choferId of vehiculo.choferIds) {
                        if (choferId) {
                            const conductorId = idMappings.users.get(choferId.toString());
                            if (conductorId) {
                                const { error: relError } = await supabase
                                    .from('vehiculo_conductores')
                                    .upsert({
                                        vehiculo_id: newId,
                                        conductor_id: conductorId
                                    }, { onConflict: 'vehiculo_id,conductor_id' });
                                
                                if (relError) {
                                    console.error(`❌ Error relación vehículo-conductor:`, relError);
                                }
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Error procesando vehículo ${vehiculo._id}:`, error);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Vehículos migrados: ${stats.migrated}/${vehiculos.length}\n`);
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateData();
}

export { migrateData };