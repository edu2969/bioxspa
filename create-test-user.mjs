/**
 * Script para crear usuario de prueba en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  console.log('=== CREAR USUARIO DE PRUEBA ===');
  
  const testEmail = 'test@gmail.com';
  const testPassword = 'test123456';
  
  try {
    // 1. Intentar crear el usuario en Supabase Auth
    console.log('Creando usuario en Supabase Auth...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Usuario de Prueba'
        }
      }
    });
    
    if (error) {
      console.error('❌ Error creando usuario:', error.message);
      
      // Si el usuario ya existe, intentar hacer login
      if (error.message.includes('User already registered')) {
        console.log('Usuario ya existe, intentando login...');
        
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (loginError) {
          console.error('❌ Error en login:', loginError.message);
          return;
        }
        
        console.log('✅ Login exitoso');
        console.log('Usuario ID:', loginData.user.id);
        
        // Verificar si existe en tabla usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', loginData.user.id)
          .single();
          
        if (userError) {
          console.log('Usuario no existe en tabla usuarios, creándolo...');
          
          const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
              id: loginData.user.id,
              email: loginData.user.email,
              nombre: 'Usuario de Prueba',
              activo: true
            })
            .select()
            .single();
            
          if (createError) {
            console.error('❌ Error creando en tabla usuarios:', createError);
          } else {
            console.log('✅ Usuario creado en tabla usuarios');
          }
        } else {
          console.log('✅ Usuario ya existe en tabla usuarios');
        }
      }
    } else {
      console.log('✅ Usuario creado exitosamente');
      console.log('Usuario ID:', data.user?.id);
      console.log('Verificar email:', data.user?.email_confirmed_at ? 'Confirmado' : 'Pendiente confirmación');
    }
    
  } catch (err) {
    console.error('❌ Error general:', err);
  }
}

createTestUser();