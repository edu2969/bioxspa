/**
 * BIOX - API de Registro con Supabase Auth
 * Reemplaza el registro tradicional con MongoDB
 */

import { NextRequest } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { APIResponse, MigrationLogger } from "@/lib/supabase-helpers";

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  telefono?: string;
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
  };
  message: string;
}

// ===============================================
// OPERACIÓN CON SUPABASE (NUEVO SISTEMA)
// ===============================================

async function registerWithSupabase(userData: RegisterRequest): Promise<RegisterResponse> {
  const { name, email, password, telefono } = userData;
  
  MigrationLogger.info('Attempting registration with Supabase Auth', { email });

  // 1. Crear usuario en Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
        telefono: telefono || null
      }
    }
  });

  if (error) {
    MigrationLogger.error('Supabase registration failed', error);
    
    if (error.message.includes('already registered')) {
      throw new Error('El email ya está registrado');
    }
    
    throw new Error(error.message || 'Error en el registro');
  }

  if (!data.user) {
    throw new Error('Error creando usuario');
  }

  // 2. Crear registro en tabla usuarios
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .insert({
      id: data.user.id,
      email: email,
      nombre: name,
      telefono: telefono || null,
      activo: true
    })
    .select()
    .single();

  if (userError) {
    MigrationLogger.error('Failed to create user record', userError);
    
    // Limpiar usuario de Auth si falla la inserción
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    
    throw new Error('Error creando perfil de usuario');
  }

  MigrationLogger.success('Supabase registration successful', { userId: data.user.id });

  return {
    user: {
      id: data.user.id,
      email: email,
      nombre: name
    },
    message: 'Usuario registrado exitosamente'
  };
}

// ===============================================
// ===============================================
// HANDLER PRINCIPAL
// ===============================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: RegisterRequest = await req.json();
    const { name, email, password, telefono } = body;

    // Validación de entrada
    if (!name || !email || !password) {
      return APIResponse.error("Nombre, email y contraseña son requeridos");
    }

    if (password.length < 6) {
      return APIResponse.error("La contraseña debe tener al menos 6 caracteres");
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return APIResponse.error("Formato de email inválido");
    }

    // Ejecutar registro directamente con Supabase
    const result = await registerWithSupabase({ name, email, password, telefono });

    MigrationLogger.performance('Registration operation', startTime);

    return APIResponse.success({
      user: result.user,
      message: result.message
    });

  } catch (error: any) {
    MigrationLogger.error('Registration failed', error);
    
    return APIResponse.error(
      error.message || "Error en el registro",
      400
    );
  }
}

// ===============================================
// ===============================================
// ENDPOINT PARA VERIFICAR SI USUARIO EXISTE
// ===============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return APIResponse.error("Email es requerido");
    }

    MigrationLogger.info('Checking if user exists', { email });

    // Verificar directamente en Supabase
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();
    
    const exists = !error && data;

    return APIResponse.success({
      exists: !!exists,
      email
    });

  } catch (error) {
    MigrationLogger.error('Error checking user existence', error);
    return APIResponse.error("Error verificando usuario", 500);
  }
}