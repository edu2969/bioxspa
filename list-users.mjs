/**
 * Script para listar usuarios existentes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('=== USUARIOS EXISTENTES ===');
  
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('Usuarios encontrados:', usuarios.length);
    usuarios.forEach((usuario, index) => {
      console.log(`${index + 1}. ${usuario.email} (${usuario.nombre}) - ${usuario.activo ? 'Activo' : 'Inactivo'}`);
    });
    
  } catch (err) {
    console.error('❌ Error general:', err);
  }
}

listUsers();