/**
 * BIOX - API de Login con Supabase Auth
 * Reemplaza NextAuth credentials provider
 */

// Configuración del runtime para Next.js 15
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { ResponseHelper } from "@/lib/supabase-helpers";
import { Session } from "@supabase/supabase-js";

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
    rol: number;
  };
  session: Session;
}

// ===============================================
// OPERACIÓN CON SUPABASE (NUEVO SISTEMA)
// ===============================================

async function loginWithSupabase(email: string, password: string): Promise<LoginResponse> {
  const supabase = await getSupabaseServerClient();
  
  // 1. Autenticar con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error('Email o contraseña incorrectos');
  }

  if (!data.user || !data.session) {
    throw new Error('Error en la autenticación');
  }

  console.log("Usuario autenticado con Supabase:", data.user);

  // 2. Obtener información adicional del usuario y sus cargos
  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select(`*`)
    .eq('id', data.user.id)
    .maybeSingle();

  console.log("Datos adicionales del usuario:", usuario, "Error:", userError);

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
      throw new Error('Error creando registro de usuario');
    }

    return newUser;
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      nombre: usuario.nombre,
      rol: Number(usuario.rol)
    },
    session: data.session
  };
}

// ===============================================
// HANDLER PRINCIPAL
// ===============================================

export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    // Validación de entrada
    if (!email || !password) {
      return ResponseHelper.error("Email y contraseña son requeridos");
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return ResponseHelper.error("Formato de email inválido");
    }

    // Ejecutar login directamente con Supabase
    const result = await loginWithSupabase(email, password);

    // Establecer cookies de sesión si es necesario
    const response = ResponseHelper.success({
      user: result.user,
      message: 'Login exitoso'
    });

    return response;

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error en el login";
    return ResponseHelper.error(
      message,
      401
    );
  }
}

// ===============================================
// ENDPOINT PARA LOGOUT
// ===============================================

export async function DELETE() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Logout con Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      return ResponseHelper.error("Error cerrando sesión", 500);
    }

    return ResponseHelper.success({
      message: 'Logout exitoso'
    });

  } catch {
    return ResponseHelper.error("Error en logout", 500);
  }
}