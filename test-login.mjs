/**
 * Test del endpoint de login
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testLogin() {
  console.log('=== TEST ENDPOINT LOGIN ===');
  
  const testCredentials = [
    { email: 'demo@test.com', password: 'demo123456' },
    { email: 'neo@yopmail.com', password: 'test123' },
    { email: 'miguel@bioxspa.cl', password: 'test123' }
  ];
  
  for (const creds of testCredentials) {
    console.log(`\nProbando login con ${creds.email}...`);
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(creds)
      });
      
      console.log('Status:', response.status);
      
      const result = await response.json();
      console.log('Respuesta:', JSON.stringify(result, null, 2));
      
      if (result.ok) {
        console.log('✅ Login exitoso');
        break;
      } else {
        console.log('❌ Login falló:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error en request:', error.message);
    }
  }
}

testLogin();