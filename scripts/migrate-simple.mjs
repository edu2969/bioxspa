#!/usr/bin/env node

/**
 * BIOX - Migración Simple MongoDB → Supabase
 * Versión simplificada para probar la migración básica
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
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

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Stats globales
let stats = {
    total: 0,
    migrated: 0,
    errors: 0
};

// Mapeo de IDs
const idMappings = {
    users: new Map(),
    sucursales: new Map(),
    dependencias: new Map(),
    clientes: new Map(),
    categorias: new Map(),
    subcategorias: new Map(),
    vehiculos: new Map()
};

/**
 * Migración usando queries directas a MongoDB
 */
async function simpleMigration() {
    console.log('🚀 Iniciando migración simple MongoDB → Supabase...\n');

    try {
        // Conectar a MongoDB
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const db = mongoose.connection.db;

        // 1. Migrar usuarios
        await migrateUsers(db);
        
        // 2. Migrar sucursales  
        await migrateSucursales(db);
        
        // 3. Migrar dependencias
        await migrateDependencias(db);
        
        // 4. Migrar cargos
        await migrateCargos(db);
        
        // 5. Migrar clientes
        await migrateClientes(db);
        
        // 6. Migrar categorías
        await migrateCategorias(db);
        
        // 7. Migrar subcategorías
        await migrateSubcategorias(db);
        
        // 8. Migrar items
        await migrateItems(db);
        
        // 9. Migrar vehículos
        await migrateVehiculos(db);

        console.log('\n🎉 ¡Migración completada!');
        console.log(`📊 Estadísticas finales:`);
        console.log(`   Total: ${stats.total}`);
        console.log(`   Migrados: ${stats.migrated}`);
        console.log(`   Errores: ${stats.errors}`);

    } catch (error) {
        console.error('❌ Error general:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

async function migrateUsers(db) {
    console.log('👥 Migrando usuarios...');
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`   Encontrados: ${users.length} usuarios`);
    
    for (const user of users) {
        try {
            const newId = uuidv4();
            idMappings.users.set(user._id.toString(), newId);
            
            const userData = {
                id: newId,
                temporal_id: user.temporalId,
                nombre: user.name,
                email: user.email,
                password_hash: user.password,
                role_legacy: user.role,
                active: user.active !== false,
                created_at: user.createdAt || new Date().toISOString(),
                updated_at: user.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('usuarios')
                .upsert(userData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error usuario ${user.email}:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando usuario ${user._id}:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Usuarios: ${stats.migrated}/${users.length}\n`);
}

async function migrateSucursales(db) {
    console.log('🏢 Migrando sucursales...');
    
    const sucursales = await db.collection('sucursals').find({}).toArray();
    console.log(`   Encontradas: ${sucursales.length} sucursales`);
    
    for (const sucursal of sucursales) {
        try {
            const newId = uuidv4();
            idMappings.sucursales.set(sucursal._id.toString(), newId);
            
            const sucursalData = {
                id: newId,
                codigo_interno: sucursal.id || Math.floor(Math.random() * 1000),
                nombre: sucursal.nombre,
                visible: sucursal.visible !== false,
                prioridad: sucursal.prioridad || 0,
                created_at: sucursal.createdAt || new Date().toISOString(),
                updated_at: sucursal.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('sucursales')
                .upsert(sucursalData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error sucursal ${sucursal.nombre}:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando sucursal ${sucursal._id}:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Sucursales: migradas\n`);
}

async function migrateDependencias(db) {
    console.log('🏛️ Migrando dependencias...');
    
    const dependencias = await db.collection('dependencias').find({}).toArray();
    console.log(`   Encontradas: ${dependencias.length} dependencias`);
    
    for (const dep of dependencias) {
        try {
            const newId = uuidv4();
            idMappings.dependencias.set(dep._id.toString(), newId);
            
            const depData = {
                id: newId,
                nombre: dep.nombre || 'Sin nombre',
                tipo: dep.tipo || 10,
                activa: dep.operativa !== false,
                created_at: dep.createdAt || new Date().toISOString(),
                updated_at: dep.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('dependencias')
                .upsert(depData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error dependencia:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando dependencia:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Dependencias: migradas\n`);
}

async function migrateCargos(db) {
    console.log('👔 Migrando cargos...');
    
    const cargos = await db.collection('cargos').find({}).toArray();
    console.log(`   Encontrados: ${cargos.length} cargos`);
    
    for (const cargo of cargos) {
        try {
            const cargoData = {
                id: uuidv4(),
                usuario_id: cargo.userId ? idMappings.users.get(cargo.userId.toString()) : null,
                sucursal_id: cargo.sucursalId ? idMappings.sucursales.get(cargo.sucursalId.toString()) : null,
                dependencia_id: cargo.dependenciaId ? idMappings.dependencias.get(cargo.dependenciaId.toString()) : null,
                tipo: cargo.tipo,
                desde: cargo.desde || new Date().toISOString().split('T')[0],
                hasta: cargo.hasta,
                activo: !cargo.hasta,
                created_at: cargo.createdAt || new Date().toISOString(),
                updated_at: cargo.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('cargos')
                .upsert(cargoData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error cargo:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando cargo:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Cargos: migrados\n`);
}

async function migrateClientes(db) {
    console.log('👥 Migrando clientes...');
    
    const clientes = await db.collection('clientes').find({}).toArray();
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
                credito: cliente.credito || 300000,
                activo: cliente.activo !== false,
                dias_de_pago: cliente.dias_de_pago || 1,
                created_at: cliente.createdAt || new Date().toISOString(),
                updated_at: cliente.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('clientes')
                .upsert(clienteData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error cliente ${cliente.nombre}:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando cliente:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Clientes: migrados\n`);
}

async function migrateCategorias(db) {
    console.log('📦 Migrando categorías...');
    
    const categorias = await db.collection('categoriacatalogos').find({}).toArray();
    console.log(`   Encontradas: ${categorias.length} categorías`);
    
    for (const cat of categorias) {
        try {
            const newId = uuidv4();
            idMappings.categorias.set(cat._id.toString(), newId);
            
            const catData = {
                id: newId,
                temporal_id: cat.temporalId,
                nombre: cat.nombre,
                descripcion: cat.descripcion,
                url_imagen: cat.urlImagen,
                tipo: cat.tipo,
                gas: cat.gas,
                elemento: cat.elemento,
                es_industrial: cat.esIndustrial || false,
                es_medicinal: cat.esMedicinal || false,
                seguir: cat.seguir || false,
                created_at: cat.createdAt || new Date().toISOString(),
                updated_at: cat.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('categorias_catalogo')
                .upsert(catData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error categoría:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando categoría:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Categorías: migradas\n`);
}

async function migrateSubcategorias(db) {
    console.log('📂 Migrando subcategorías...');
    
    const subcategorias = await db.collection('subcategoriacatalogos').find({}).toArray();
    console.log(`   Encontradas: ${subcategorias.length} subcategorías`);
    
    for (const subcat of subcategorias) {
        try {
            const newId = uuidv4();
            idMappings.subcategorias.set(subcat._id.toString(), newId);
            
            const subcatData = {
                id: newId,
                temporal_id: subcat.temporalId,
                nombre: subcat.nombre,
                categoria_id: subcat.categoriaCatalogoId ? idMappings.categorias.get(subcat.categoriaCatalogoId.toString()) : null,
                cantidad: subcat.cantidad,
                unidad: subcat.unidad,
                sin_sifon: subcat.sinSifon || false,
                created_at: subcat.createdAt || new Date().toISOString(),
                updated_at: subcat.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('subcategorias_catalogo')
                .upsert(subcatData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error subcategoría:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando subcategoría:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Subcategorías: migradas\n`);
}

async function migrateItems(db) {
    console.log('🏷️ Migrando items del catálogo...');
    
    const items = await db.collection('itemcatalogos').find({}).toArray();
    console.log(`   Encontrados: ${items.length} items`);
    
    for (const item of items) {
        try {
            const newId = uuidv4();
            
            const itemData = {
                id: newId,
                temporal_id: item.temporalId,
                codigo: item.codigo,
                estado: item.estado || 0,
                subcategoria_id: item.subcategoriaCatalogoId ? idMappings.subcategorias.get(item.subcategoriaCatalogoId.toString()) : null,
                nombre: item.nombre,
                descripcion: item.descripcion,
                stock_actual: item.stockActual || 0,
                stock_minimo: item.stockMinimo || 0,
                visible: item.visible !== false,
                propietario_id: item.ownerId ? idMappings.clientes.get(item.ownerId.toString()) : null,
                created_at: item.createdAt || new Date().toISOString(),
                updated_at: item.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('items_catalogo')
                .upsert(itemData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error item:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
            }
            
        } catch (error) {
            console.error(`❌ Error procesando item:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Items: migrados\n`);
}

async function migrateVehiculos(db) {
    console.log('🚚 Migrando vehículos...');
    
    const vehiculos = await db.collection('vehiculos').find({}).toArray();
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
                cliente_id: vehiculo.clienteId ? idMappings.clientes.get(vehiculo.clienteId.toString()) : null,
                revision_tecnica: vehiculo.revisionTecnica || new Date().toISOString().split('T')[0],
                fecha_vencimiento_extintor: vehiculo.fechaVencimientoExtintor,
                posicion_latitud: vehiculo.posicionActual?.latitud,
                posicion_longitud: vehiculo.posicionActual?.longitud,
                created_at: vehiculo.createdAt || new Date().toISOString(),
                updated_at: vehiculo.updatedAt || new Date().toISOString()
            };

            const { error } = await supabase
                .from('vehiculos')
                .upsert(vehiculoData, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error vehículo ${vehiculo.patente}:`, error.message);
                stats.errors++;
            } else {
                stats.migrated++;
                
                // Migrar conductores
                if (vehiculo.choferIds && vehiculo.choferIds.length > 0) {
                    for (const choferId of vehiculo.choferIds) {
                        if (choferId) {
                            const conductorId = idMappings.users.get(choferId.toString());
                            if (conductorId) {
                                await supabase
                                    .from('vehiculo_conductores')
                                    .upsert({
                                        vehiculo_id: newId,
                                        conductor_id: conductorId
                                    }, { onConflict: 'vehiculo_id,conductor_id' });
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Error procesando vehículo:`, error.message);
            stats.errors++;
        }
        stats.total++;
    }
    
    console.log(`✅ Vehículos: migrados\n`);
}

// Ejecutar migración
simpleMigration();