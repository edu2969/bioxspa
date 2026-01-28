/**
 * Script de prueba de login con Supabase
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

async function waitForServer() {
  console.log('⏳ Esperando que el servidor esté listo...');
  
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch('http://localhost:3000/');
      if (response.status === 200) {
        console.log('✅ Servidor listo');
        return true;
      }
    } catch (error) {
      console.log(`   Intento ${i + 1}/10 - Servidor no listo`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
}

async function testSupabaseLogin() {
  console.log('🧪 Probando login con Supabase...');
  
  // Esperar que el servidor esté listo
  if (!(await waitForServer())) {
    console.error('❌ Servidor no responde después de 20 segundos');
    return;
  }
  
  const testUser = {
    email: 'karen@bioxspa.cl',
    password: 'test'
  };
  
  try {
    console.log(`\n📧 Probando con: ${testUser.email}`);
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    const result = await response.json();
    
    console.log('📊 Respuesta del servidor:');
    console.log('   Status:', response.status);
    console.log('   OK:', result.ok);
    
    if (result.ok) {
      console.log('✅ Login exitoso!');
      console.log('👤 Usuario:', result.data?.user?.email);
      console.log('🏢 Cargos:', result.data?.cargos?.length || 0);
    } else {
      console.log('❌ Login falló:', result.error);
    }
    
    // Test adicional con usuario demo
    console.log(`\n📧 Probando con usuario demo...`);
    const demoResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@test.com',
        password: 'demo123456'
      })
    });
    
    const demoResult = await demoResponse.json();
    console.log('📊 Respuesta demo:');
    console.log('   Status:', demoResponse.status);
    console.log('   OK:', demoResult.ok);
    
    if (demoResult.ok) {
      console.log('✅ Login demo exitoso!');
    } else {
      console.log('❌ Login demo falló:', demoResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

testSupabaseLogin();