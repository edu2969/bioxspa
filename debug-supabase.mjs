/**
 * Script de diagnóstico para Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== DIAGNÓSTICO SUPABASE ===');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);
console.log('Key preview:', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('\n📡 Testando conexión...');
  
  try {
    // Test 1: Verificar conexión básica con una tabla que debería existir
    console.log('Probando conexión con tabla usuarios...');
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    
    if (error) {
      console.error('❌ Error al conectar:', error.message);
      console.error('Código de error:', error.code);
      console.error('Detalles:', error.details);
      
      // Si es error de tabla no existe, verificar si podemos crear una
      if (error.message.includes('relation "usuarios" does not exist')) {
        console.log('\n📋 La tabla usuarios no existe en la base de datos');
        
        // Probar con auth directamente
        console.log('Probando servicio de autenticación...');
        const authTest = await supabase.auth.getSession();
        console.log('Auth test:', authTest.error ? authTest.error.message : 'OK');
      }
    } else {
      console.log('✅ Conexión exitosa a Supabase');
      console.log('Datos retornados:', data);
    }

    // Test 2: Verificar autenticación
    console.log('\n🔐 Testando auth...');
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message !== 'Auth session missing!') {
      console.error('❌ Error en auth:', authError.message);
    } else {
      console.log('✅ Servicio de auth disponible');
      console.log('Usuario actual:', user ? user.email : 'No hay sesión');
    }

  } catch (err) {
    console.error('❌ Error general:', err.message);
    console.error('Stack:', err.stack);
  }
}

testConnection();