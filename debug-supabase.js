/**
 * Script de diagnóstico para Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== DIAGNÓSTICO SUPABASE ===');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('\n📡 Testando conexión...');
  
  try {
    // Test 1: Verificar conexión básica
    const { data, error } = await supabase.from('usuarios').select('count').limit(1);
    
    if (error) {
      console.error('❌ Error al conectar:', error.message);
      
      // Si es error de tabla no existe, verificar si podemos crear una
      if (error.message.includes('relation "usuarios" does not exist')) {
        console.log('\n📋 La tabla usuarios no existe. ¿Necesitas ejecutar las migraciones?');
      }
    } else {
      console.log('✅ Conexión exitosa a Supabase');
    }

    // Test 2: Verificar autenticación
    console.log('\n🔐 Testando auth...');
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message !== 'Auth session missing!') {
      console.error('❌ Error en auth:', authError.message);
    } else {
      console.log('✅ Servicio de auth disponible');
    }

  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

testConnection();