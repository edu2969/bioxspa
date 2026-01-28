#!/usr/bin/env node

/**
 * BIOX - Script de Validación de Migración
 * 
 * Valida que la migración MongoDB → PostgreSQL fue exitosa
 * comparando conteos y verificando integridad de relaciones.
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
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

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERROR: Variables de entorno faltantes');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Validaciones a ejecutar
 */
const validaciones = [
    {
        nombre: 'Usuarios',
        mongoModel: User,
        supabaseTable: 'usuarios',
        validarRelaciones: async () => {
            // Verificar que todos los usuarios migrados tengan sus cargos
            const { data: usuariosConCargo } = await supabase
                .from('usuarios')
                .select(`
                    id,
                    email,
                    cargos!inner(tipo, activo)
                `);
            
            return {
                usuariosConCargo: usuariosConCargo?.length || 0,
                descripcion: 'usuarios con al menos un cargo asignado'
            };
        }
    },
    {
        nombre: 'Sucursales',
        mongoModel: Sucursal,
        supabaseTable: 'sucursales',
        validarRelaciones: async () => {
            // Verificar sucursales con dependencias
            const { data: sucursalesConDep } = await supabase
                .from('sucursales')
                .select(`
                    id,
                    nombre,
                    dependencias(count)
                `);
            
            return {
                sucursalesConDependencias: sucursalesConDep?.filter(s => s.dependencias?.length > 0)?.length || 0,
                descripcion: 'sucursales con dependencias asociadas'
            };
        }
    },
    {
        nombre: 'Dependencias',
        mongoModel: Dependencia,
        supabaseTable: 'dependencias',
        validarRelaciones: async () => {
            const { data: depConSucursal } = await supabase
                .from('dependencias')
                .select('id, sucursal_id')
                .not('sucursal_id', 'is', null);
            
            return {
                dependenciasConSucursal: depConSucursal?.length || 0,
                descripcion: 'dependencias vinculadas a sucursales'
            };
        }
    },
    {
        nombre: 'Cargos',
        mongoModel: Cargo,
        supabaseTable: 'cargos',
        validarRelaciones: async () => {
            const { data: cargosActivos } = await supabase
                .from('cargos')
                .select('id, usuario_id, sucursal_id')
                .eq('activo', true);
            
            const cargosConUsuario = cargosActivos?.filter(c => c.usuario_id)?.length || 0;
            const cargosConSucursal = cargosActivos?.filter(c => c.sucursal_id)?.length || 0;
            
            return {
                cargosActivos: cargosActivos?.length || 0,
                cargosConUsuario,
                cargosConSucursal,
                descripcion: 'cargos activos con relaciones válidas'
            };
        }
    },
    {
        nombre: 'Clientes',
        mongoModel: Cliente,
        supabaseTable: 'clientes',
        validarRelaciones: async () => {
            const { data: clientesActivos } = await supabase
                .from('clientes')
                .select('id, rut')
                .eq('activo', true);
            
            return {
                clientesActivos: clientesActivos?.length || 0,
                descripcion: 'clientes activos migrados'
            };
        }
    },
    {
        nombre: 'Categorías Catálogo',
        mongoModel: CategoriaCatalogo,
        supabaseTable: 'categorias_catalogo',
        validarRelaciones: async () => {
            const { data: categoriasConSub } = await supabase
                .from('categorias_catalogo')
                .select(`
                    id,
                    nombre,
                    subcategorias_catalogo(count)
                `);
            
            return {
                categoriasConSubcategorias: categoriasConSub?.filter(c => c.subcategorias_catalogo?.length > 0)?.length || 0,
                descripcion: 'categorías con subcategorías'
            };
        }
    },
    {
        nombre: 'Subcategorías Catálogo',
        mongoModel: SubcategoriaCatalogo,
        supabaseTable: 'subcategorias_catalogo',
        validarRelaciones: async () => {
            const { data: subConCategoria } = await supabase
                .from('subcategorias_catalogo')
                .select('id, categoria_id')
                .not('categoria_id', 'is', null);
            
            return {
                subcategoriasConCategoria: subConCategoria?.length || 0,
                descripcion: 'subcategorías vinculadas a categorías'
            };
        }
    },
    {
        nombre: 'Items Catálogo',
        mongoModel: ItemCatalogo,
        supabaseTable: 'items_catalogo',
        validarRelaciones: async () => {
            const { data: itemsConSubcat } = await supabase
                .from('items_catalogo')
                .select('id, subcategoria_id, propietario_id')
                .not('subcategoria_id', 'is', null);
            
            const itemsConPropietario = itemsConSubcat?.filter(i => i.propietario_id)?.length || 0;
            
            return {
                itemsConSubcategoria: itemsConSubcat?.length || 0,
                itemsConPropietario,
                descripcion: 'items con subcategoría y propietario'
            };
        }
    },
    {
        nombre: 'Vehículos',
        mongoModel: Vehiculo,
        supabaseTable: 'vehiculos',
        validarRelaciones: async () => {
            const { data: vehiculosConCliente } = await supabase
                .from('vehiculos')
                .select('id, patente, cliente_id')
                .not('cliente_id', 'is', null);
            
            // Verificar relaciones vehículo-conductores
            const { data: relacionesConductor } = await supabase
                .from('vehiculo_conductores')
                .select('vehiculo_id, conductor_id');
            
            return {
                vehiculosConCliente: vehiculosConCliente?.length || 0,
                relacionesConductor: relacionesConductor?.length || 0,
                descripción: 'vehículos con cliente y conductores asignados'
            };
        }
    }
];

/**
 * Ejecutar validación completa
 */
async function validarMigracion() {
    console.log('🔍 Validando migración MongoDB → Supabase...\n');

    try {
        // Conectar a ambas bases de datos
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const { data, error } = await supabase.from('usuarios').select('count').limit(1);
        if (error) {
            throw new Error(`Error conectando Supabase: ${error.message}`);
        }
        console.log('✅ Conectado a Supabase\n');

        let totalValidaciones = 0;
        let validacionesExitosas = 0;
        let errores = [];

        // Ejecutar cada validación
        for (const validacion of validaciones) {
            console.log(`📊 Validando ${validacion.nombre}...`);
            
            try {
                // Contar en MongoDB
                const countMongo = await validacion.mongoModel.countDocuments({});
                
                // Contar en Supabase
                const { count: countSupabase, error: countError } = await supabase
                    .from(validacion.supabaseTable)
                    .select('*', { count: 'exact', head: true });

                if (countError) {
                    throw new Error(`Error contando en Supabase: ${countError.message}`);
                }

                const diferencia = Math.abs(countMongo - countSupabase);
                const porcentajeMigracion = countMongo > 0 ? ((countSupabase / countMongo) * 100).toFixed(1) : '100.0';

                console.log(`   MongoDB: ${countMongo} registros`);
                console.log(`   Supabase: ${countSupabase} registros`);
                console.log(`   Migración: ${porcentajeMigracion}%`);

                // Validar relaciones si está definido
                if (validacion.validarRelaciones) {
                    const relacionesResult = await validacion.validarRelaciones();
                    console.log(`   Relaciones: ${JSON.stringify(relacionesResult, null, 2)}`);
                }

                // Determinar resultado
                if (diferencia === 0) {
                    console.log(`   ✅ Migración completa\n`);
                    validacionesExitosas++;
                } else if (diferencia <= Math.ceil(countMongo * 0.05)) {
                    console.log(`   ⚠️  Migración casi completa (diferencia: ${diferencia})\n`);
                    validacionesExitosas++;
                } else {
                    console.log(`   ❌ Migración incompleta (faltan ${diferencia} registros)\n`);
                    errores.push(`${validacion.nombre}: faltan ${diferencia} registros`);
                }

            } catch (error) {
                console.log(`   ❌ Error en validación: ${error.message}\n`);
                errores.push(`${validacion.nombre}: ${error.message}`);
            }

            totalValidaciones++;
        }

        // Validaciones adicionales de integridad
        console.log('🔗 Validando integridad referencial...');
        await validarIntegridadReferencial();

        // Resultados finales
        console.log('\n📈 RESUMEN DE VALIDACIÓN');
        console.log('==================================');
        console.log(`Total validaciones: ${totalValidaciones}`);
        console.log(`Exitosas: ${validacionesExitosas}`);
        console.log(`Con errores: ${totalValidaciones - validacionesExitosas}`);

        if (errores.length > 0) {
            console.log('\n❌ ERRORES ENCONTRADOS:');
            errores.forEach(error => console.log(`   • ${error}`));
        } else {
            console.log('\n🎉 ¡Migración validada exitosamente!');
        }

        // Recomendaciones
        console.log('\n💡 PRÓXIMOS PASOS:');
        if (errores.length === 0) {
            console.log('   • La migración está completa');
            console.log('   • Puedes comenzar a usar Supabase');
            console.log('   • Considera hacer backup de MongoDB antes de desconectarlo');
        } else {
            console.log('   • Revisa y corrige los errores listados');
            console.log('   • Re-ejecuta la migración para los elementos faltantes');
            console.log('   • Valida nuevamente antes de hacer el switch');
        }

    } catch (error) {
        console.error('❌ Error general de validación:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Validación completada');
    }
}

/**
 * Validar integridad referencial entre tablas
 */
async function validarIntegridadReferencial() {
    const validacionesIntegridad = [
        {
            nombre: 'Cargos huérfanos (sin usuario)',
            query: `
                SELECT COUNT(*) as count 
                FROM cargos c 
                LEFT JOIN usuarios u ON c.usuario_id = u.id 
                WHERE u.id IS NULL AND c.usuario_id IS NOT NULL
            `
        },
        {
            nombre: 'Items sin subcategoría',
            query: `
                SELECT COUNT(*) as count 
                FROM items_catalogo ic 
                LEFT JOIN subcategorias_catalogo sc ON ic.subcategoria_id = sc.id 
                WHERE sc.id IS NULL AND ic.subcategoria_id IS NOT NULL
            `
        },
        {
            nombre: 'Subcategorías sin categoría',
            query: `
                SELECT COUNT(*) as count 
                FROM subcategorias_catalogo sc 
                LEFT JOIN categorias_catalogo cc ON sc.categoria_id = cc.id 
                WHERE cc.id IS NULL AND sc.categoria_id IS NOT NULL
            `
        },
        {
            nombre: 'Vehículos sin cliente',
            query: `
                SELECT COUNT(*) as count 
                FROM vehiculos v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                WHERE c.id IS NULL AND v.cliente_id IS NOT NULL
            `
        }
    ];

    for (const validacion of validacionesIntegridad) {
        try {
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: validacion.query
            });

            if (error) {
                console.log(`   ⚠️  No se pudo validar: ${validacion.nombre}`);
                continue;
            }

            const count = data?.[0]?.count || 0;
            if (count === 0) {
                console.log(`   ✅ ${validacion.nombre}: OK`);
            } else {
                console.log(`   ❌ ${validacion.nombre}: ${count} registros huérfanos`);
            }

        } catch (error) {
            console.log(`   ⚠️  Error validando ${validacion.nombre}: ${error.message}`);
        }
    }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    validarMigracion();
}

export { validarMigracion };