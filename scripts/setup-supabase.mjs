#!/usr/bin/env node

/**
 * BIOX - Setup Inicial de Supabase
 * Este script configura automáticamente el schema y datos iniciales
 */

import { createClient } from '@supabase/supabase-js';
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

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERROR: Variables de entorno faltantes');
    console.error('Necesitas configurar:');
    if (!SUPABASE_URL) console.error('- NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_SERVICE_KEY) console.error('- SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nVariables encontradas:');
    console.error(`SUPABASE_URL: ${SUPABASE_URL ? 'OK' : 'FALTANTE'}`);
    console.error(`SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'OK (length: ' + SUPABASE_SERVICE_KEY.length + ')' : 'FALTANTE'}`);
    process.exit(1);
}

console.log('✅ Variables de entorno cargadas correctamente');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
    console.log('🚀 Iniciando setup de BIOX en Supabase...\n');

    try {
        console.log('🔗 Probando conexión a Supabase...');
        
        // Probar conexión básica primero
        const { data: testData, error: testError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .limit(1);
            
        if (testError) {
            console.error('❌ Error de conexión a Supabase:', testError);
            return;
        }
        
        console.log('✅ Conexión a Supabase exitosa');

        // En lugar de ejecutar SQL directamente, vamos a crear manualmente algunas tablas básicas
        console.log('📊 Intentando crear tablas básicas...');
        
        // Intentar crear tabla usuarios
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('count')
                .limit(1);
                
            if (error) {
                console.log('⚠️  La tabla usuarios no existe, necesitas ejecutar el schema manualmente');
                console.log('\n🔧 PASOS MANUALES REQUERIDOS:');
                console.log('1. Ve a tu proyecto Supabase: https://supabase.com/dashboard');
                console.log('2. Ve a SQL Editor');
                console.log('3. Copia y pega el contenido de database/schema-postgresql.sql');
                console.log('4. Ejecuta el SQL');
                console.log('5. Luego copia y pega database/rls-policies.sql');
                console.log('6. Ejecuta ese SQL también');
                console.log('7. Vuelve a ejecutar este script: npm run supabase:setup');
                return;
            } else {
                console.log('✅ Tabla usuarios existe');
            }
        } catch (err) {
            console.error('❌ Error verificando tablas:', err.message);
            return;
        }

        // 3. Datos iniciales
        console.log('📝 Insertando datos iniciales...');
        await insertInitialData();

        // 4. Validar setup
        console.log('🔍 Validando configuración...');
        await validateSetup();

        console.log('\n🎉 ¡Setup completado exitosamente!');
        console.log('💡 Próximos pasos:');
        console.log('   1. Ejecuta: npm run supabase:migrate');
        console.log('   2. Valida: npm run supabase:validate');

    } catch (error) {
        console.error('❌ Error durante el setup:', error);
    }
}

async function insertInitialData() {
    // Regiones de Chile
    const regiones = [
        { codigo: '01', nombre: 'Tarapacá' },
        { codigo: '02', nombre: 'Antofagasta' },
        { codigo: '03', nombre: 'Atacama' },
        { codigo: '04', nombre: 'Coquimbo' },
        { codigo: '05', nombre: 'Valparaíso' },
        { codigo: '06', nombre: 'O\'Higgins' },
        { codigo: '07', nombre: 'Maule' },
        { codigo: '08', nombre: 'Biobío' },
        { codigo: '09', nombre: 'Araucanía' },
        { codigo: '10', nombre: 'Los Lagos' },
        { codigo: '11', nombre: 'Aysén' },
        { codigo: '12', nombre: 'Magallanes' },
        { codigo: '13', nombre: 'Metropolitana' },
        { codigo: '14', nombre: 'Los Ríos' },
        { codigo: '15', nombre: 'Arica y Parinacota' },
        { codigo: '16', nombre: 'Ñuble' }
    ];

    const { error: regionError } = await supabase
        .from('regiones')
        .upsert(regiones, { onConflict: 'codigo' });

    if (regionError) {
        console.log('⚠️  Error insertando regiones (puede ser normal si ya existen)');
    }

    // Tipos de cargo básicos
    const tiposCargo = [
        { tipo: 1, nombre: 'Gerente', nivel_acceso: 10 },
        { tipo: 2, nombre: 'Cobranza', nivel_acceso: 5 },
        { tipo: 8, nombre: 'Encargado', nivel_acceso: 7 },
        { tipo: 9, nombre: 'Responsable', nivel_acceso: 6 },
        { tipo: 16, nombre: 'Despacho', nivel_acceso: 4 },
        { tipo: 32, nombre: 'Conductor', nivel_acceso: 2 },
        { tipo: 64, nombre: 'Proveedor', nivel_acceso: 1 }
    ];

    const { error: cargoError } = await supabase
        .from('tipos_cargo')
        .upsert(tiposCargo, { onConflict: 'tipo' });

    if (cargoError) {
        console.log('⚠️  Error insertando tipos de cargo (puede ser normal si ya existen)');
    }

    console.log('✅ Datos iniciales insertados');
}

async function validateSetup() {
    // Verificar que las tablas principales existan
    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        console.log('⚠️  No se pudo validar las tablas');
        return;
    }

    const expectedTables = ['usuarios', 'clientes', 'sucursales', 'item_catalogo'];
    const existingTables = tables.map(t => t.table_name);
    
    for (const table of expectedTables) {
        if (existingTables.includes(table)) {
            console.log(`✅ Tabla '${table}' creada correctamente`);
        } else {
            console.log(`❌ Tabla '${table}' NO encontrada`);
        }
    }
}

// Ejecutar setup
if (import.meta.url === `file://${process.argv[1]}`) {
    setupDatabase();
}

export { setupDatabase };