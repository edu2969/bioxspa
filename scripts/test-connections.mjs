#!/usr/bin/env node

/**
 * BIOX - Test de Conexión Simple
 * Verifica que las conexiones funcionen antes de migrar
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
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

console.log('🧪 Test de Conexiones BIOX\n');

async function testConnections() {
    console.log('📋 Variables de entorno:');
    console.log(`✅ MONGODB_URI: ${MONGODB_URI ? 'Configurada' : 'FALTANTE'}`);
    console.log(`✅ SUPABASE_URL: ${SUPABASE_URL ? 'Configurada' : 'FALTANTE'}`);
    console.log(`✅ SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'Configurada (length: ' + SUPABASE_SERVICE_KEY.length + ')' : 'FALTANTE'}\n`);

    // Test MongoDB
    console.log('🔍 Probando MongoDB...');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB: Conectado correctamente');
        
        // Contar algunos documentos
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`   Colecciones encontradas: ${collections.length}`);
        
        // Contar usuarios como ejemplo
        const userCount = await db.collection('users').countDocuments();
        console.log(`   Usuarios en MongoDB: ${userCount}`);
        
        await mongoose.disconnect();
        console.log('✅ MongoDB: Desconectado\n');
        
    } catch (error) {
        console.error('❌ MongoDB Error:', error.message);
        return false;
    }

    // Test Supabase
    console.log('🔍 Probando Supabase...');
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        // Test básico
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .limit(5);
            
        if (tablesError) {
            console.log('⚠️  Supabase warning:', tablesError.message);
        } else {
            console.log('✅ Supabase: Conectado correctamente');
            console.log(`   Tablas encontradas: ${tables?.length || 0}`);
            if (tables?.length > 0) {
                console.log(`   Ejemplos: ${tables.slice(0, 3).map(t => t.table_name).join(', ')}`);
            }
        }
        
        // Test tabla usuarios
        const { count: userCount, error: countError } = await supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.log(`   usuarios table: Error (${countError.message})`);
        } else {
            console.log(`   usuarios table: ${userCount} registros`);
        }
        
        console.log('✅ Supabase: Probado correctamente\n');
        
    } catch (error) {
        console.error('❌ Supabase Error:', error.message);
        return false;
    }

    console.log('🎉 Ambas conexiones funcionan correctamente!');
    console.log('💡 Ahora puedes ejecutar la migración completa.');
    
    return true;
}

// Ejecutar test
testConnections().catch(error => {
    console.error('❌ Error en test:', error.message);
    process.exit(1);
});