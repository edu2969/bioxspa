/**
 * Solución: Crear usuario completo (Auth + Tabla)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usamos service key

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCompleteUser() {
  console.log('=== CREAR USUARIO COMPLETO ===');
  
  const testEmail = 'demo@test.com';
  const testPassword = 'demo123456';
  const testName = 'Usuario Demo';
  
  try {
    // 1. Crear usuario en Supabase Auth usando Admin API
    console.log('1. Creando usuario en Supabase Auth...');
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto confirmar email
      user_metadata: {
        name: testName
      }
    });
    
    if (authError) {
      console.error('❌ Error creando en Auth:', authError.message);
      return;
    }
    
    console.log('✅ Usuario creado en Auth:', authUser.user.id);
    
    // 2. Crear registro en tabla usuarios
    console.log('2. Creando registro en tabla usuarios...');
    
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id, // Usar el mismo ID de Auth
        email: testEmail,
        nombre: testName
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Error creando en tabla:', dbError.message);
      // Si falla, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return;
    }
    
    console.log('✅ Usuario creado en tabla:', dbUser.id);
    console.log('\n🎉 Usuario completo creado exitosamente!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    console.log('👤 ID:', authUser.user.id);
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
  }
}

createCompleteUser();