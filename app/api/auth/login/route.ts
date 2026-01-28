/**
 * BIOX - API de Login con Supabase Auth
 * Reemplaza NextAuth credentials provider
 */

import { NextRequest } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { APIResponse, MigrationLogger } from "@/lib/supabase-helpers";

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
  };
  session: any;
  cargos?: any[];
}

// ===============================================
// OPERACIÓN CON SUPABASE (NUEVO SISTEMA)
// ===============================================

async function loginWithSupabase(email: string, password: string): Promise<LoginResponse> {
  MigrationLogger.info('Attempting login with Supabase Auth', { email });

  // 1. Autenticar con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    MigrationLogger.error('Supabase auth failed', error);
    throw new Error('Email o contraseña incorrectos');
  }

  if (!data.user || !data.session) {
    throw new Error('Error en la autenticación');
  }

  // 2. Obtener información adicional del usuario y sus cargos
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select(`
      *,
      cargos (
        tipo,
        sucursal_id,
        dependencia_id,
        desde,
        hasta,
        sucursales (nombre, codigo),
        dependencias (nombre)
      )
    `)
    .eq('id', data.user.id)
    .is('cargos.hasta', null) // Solo cargos activos
    .single();

  if (userError || !usuario) {
    // Si no existe en usuarios, crearlo (primera vez)
    const { data: newUser, error: createError } = await supabase
      .from('usuarios')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        nombre: data.user.email!.split('@')[0], // Nombre por defecto
        telefono: null,
        activo: true
      })
      .select()
      .single();

    if (createError) {
      MigrationLogger.error('Failed to create user record', createError);
      throw new Error('Error creando registro de usuario');
    }

    MigrationLogger.success('User record created successfully');
    return newUser;
  }

  MigrationLogger.success('Supabase login successful', { userId: data.user.id });

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      nombre: usuario.nombre
    },
    session: data.session,
    cargos: usuario.cargos || []
  };
}

// ===============================================
// HANDLER PRINCIPAL
// ===============================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    // Validación de entrada
    if (!email || !password) {
      return APIResponse.error("Email y contraseña son requeridos");
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return APIResponse.error("Formato de email inválido");
    }

    // Ejecutar login directamente con Supabase
    const result = await loginWithSupabase(email, password);

    MigrationLogger.performance('Login operation', startTime);

    // Establecer cookies de sesión si es necesario
    const response = APIResponse.success({
      user: result.user,
      cargos: result.cargos,
      message: 'Login exitoso'
    });

    return response;

  } catch (error: any) {
    MigrationLogger.error('Login failed', error);
    
    return APIResponse.error(
      error.message || "Error en el login",
      401
    );
  }
}

// ===============================================
// ENDPOINT PARA LOGOUT
// ===============================================

export async function DELETE(req: NextRequest) {
  try {
    MigrationLogger.info('Processing logout request');

    // Logout con Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      MigrationLogger.error('Supabase logout error', error);
      return APIResponse.error("Error cerrando sesión", 500);
    }

    MigrationLogger.success('Logout successful');

    return APIResponse.success({
      message: 'Logout exitoso'
    });

  } catch (error) {
    MigrationLogger.error('Logout failed', error);
    return APIResponse.error("Error en logout", 500);
  }
}