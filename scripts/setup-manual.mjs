#!/usr/bin/env node

/**
 * BIOX - Setup Manual de Supabase
 * Guía paso a paso para configurar Supabase manualmente
 */

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

function manualSetup() {
    console.log('🚀 BIOX - Setup Manual de Supabase\n');
    
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ ERROR: Variables de entorno faltantes en .env.local');
        return;
    }
    
    console.log('✅ Variables configuradas correctamente');
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);
    
    console.log('📋 PASOS MANUALES PARA CONFIGURAR SUPABASE:');
    console.log('=========================================\n');
    
    console.log('1. 🌐 Ve a tu Dashboard de Supabase:');
    console.log(`   ${SUPABASE_URL.replace('.supabase.co', '.supabase.co/dashboard')}\n`);
    
    console.log('2. 📝 Ve al SQL Editor:');
    console.log('   - Click en "SQL Editor" en la barra lateral\n');
    
    console.log('3. 🗃️ Ejecutar Schema Principal:');
    console.log('   - Copia TODO el contenido de: database/schema-postgresql.sql');
    console.log('   - Pégalo en el SQL Editor');
    console.log('   - Click "Run" o Ctrl+Enter');
    console.log('   - Debe crear ~40 tablas\n');
    
    console.log('4. 🔒 Ejecutar Políticas de Seguridad:');
    console.log('   - Copia TODO el contenido de: database/rls-policies.sql');
    console.log('   - Pégalo en el SQL Editor');
    console.log('   - Click "Run" o Ctrl+Enter\n');
    
    console.log('5. ✅ Verificar:');
    console.log('   - Ve a "Table Editor"');
    console.log('   - Deberías ver tablas como: usuarios, clientes, sucursales, etc.');
    console.log('   - Si ves las tablas, el setup fue exitoso\n');
    
    console.log('6. 🔄 Una vez completado:');
    console.log('   - Ejecuta: npm run supabase:migrate');
    console.log('   - Para migrar tus datos de MongoDB\n');
    
    // Verificar que los archivos existan
    const schemaPath = path.join(__dirname, '../database/schema-postgresql.sql');
    const rlsPath = path.join(__dirname, '../database/rls-policies.sql');
    
    console.log('📁 VERIFICACIÓN DE ARCHIVOS:');
    console.log('============================');
    
    if (fs.existsSync(schemaPath)) {
        const schemaSize = Math.round(fs.statSync(schemaPath).size / 1024);
        console.log(`✅ schema-postgresql.sql (${schemaSize}KB)`);
    } else {
        console.log('❌ schema-postgresql.sql NO ENCONTRADO');
    }
    
    if (fs.existsSync(rlsPath)) {
        const rlsSize = Math.round(fs.statSync(rlsPath).size / 1024);
        console.log(`✅ rls-policies.sql (${rlsSize}KB)`);
    } else {
        console.log('❌ rls-policies.sql NO ENCONTRADO');
    }
    
    console.log('\n💡 TIPS:');
    console.log('- Si hay errores al ejecutar el SQL, es normal');
    console.log('- Algunos comandos pueden fallar si ya existen');
    console.log('- Lo importante es que se creen las tablas principales');
    console.log('- Puedes ejecutar los SQLs varias veces sin problema');
    
    console.log('\n🆘 SI TIENES PROBLEMAS:');
    console.log('- Verifica que tu proyecto Supabase esté activo');
    console.log('- Asegúrate de pegar TODO el contenido del archivo');
    console.log('- Si hay muchos errores, ejecuta statement por statement');
}

// Ejecutar
manualSetup();