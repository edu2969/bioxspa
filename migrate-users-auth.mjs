/**
 * Script para migrar usuarios de la tabla usuarios a Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

// Cliente admin para crear usuarios
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateUsersToAuth() {
  console.log('🚀 Iniciando migración de usuarios a Supabase Auth...');
  
  try {
    // 1. Obtener todos los usuarios de la tabla usuarios
    const { data: usuarios, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nombre')
      .limit(50);

    if (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return;
    }

    console.log(`📋 Encontrados ${usuarios.length} usuarios`);

    // 2. Crear cuenta de Auth para cada usuario
    for (const usuario of usuarios) {
      console.log(`\n👤 Procesando: ${usuario.email}`);
      
      try {
        // Verificar si ya existe en Auth
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(usuario.id);
        
        if (existingUser.user) {
          console.log(`   ✅ Ya existe en Auth`);
          continue;
        }

        // Crear usuario en Auth con la contraseña "test"
        const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: usuario.id, // Usar el mismo ID
          email: usuario.email,
          password: 'test',
          email_confirm: true, // Confirmar email automáticamente
          user_metadata: {
            name: usuario.nombre
          }
        });

        if (createError) {
          console.error(`   ❌ Error creando Auth:`, createError.message);
          
          // Si el usuario ya existe con otro ID, intentar por email
          if (createError.message.includes('already registered')) {
            console.log(`   ⚠️  Usuario ya registrado, buscando por email...`);
            
            const { data: existingByEmail } = await supabaseAdmin.auth.admin.listUsers();
            const existing = existingByEmail.users.find(u => u.email === usuario.email);
            
            if (existing) {
              console.log(`   📍 Encontrado con ID: ${existing.id}`);
              // Actualizar el ID en la tabla usuarios si es diferente
              if (existing.id !== usuario.id) {
                console.log(`   🔄 Actualizando ID en tabla usuarios...`);
                const { error: updateError } = await supabaseAdmin
                  .from('usuarios')
                  .update({ id: existing.id })
                  .eq('id', usuario.id);
                
                if (updateError) {
                  console.error(`   ❌ Error actualizando ID:`, updateError.message);
                } else {
                  console.log(`   ✅ ID actualizado correctamente`);
                }
              }
            }
          }
        } else {
          console.log(`   ✅ Cuenta Auth creada correctamente`);
        }

      } catch (err) {
        console.error(`   ❌ Error procesando usuario:`, err.message);
      }
    }

    console.log('\n🎉 Migración completada!');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

migrateUsersToAuth();