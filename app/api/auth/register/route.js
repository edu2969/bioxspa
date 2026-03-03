import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

// ===============================================
// OPERACIÓN CON SUPABASE (NUEVO SISTEMA)
// ===============================================

async function registerWithSupabase(userData) {
  const { name, email, password, telefono } = userData;
  
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
    if (error.message.includes('already registered')) {
      throw new Error('El email ya está registrado');
    }
    
    throw new Error(error.message || 'Error en el registro');
  }

  if (!data.user) {
    throw new Error('Error creando usuario');
  }

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

export async function POST(req) {
  const startTime = Date.now();

  try {
    const body = await req.json();
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

    return APIResponse.success({
      user: result.user,
      message: result.message
    });

  } catch (error) {
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return APIResponse.error("Email es requerido");
    }

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
    return APIResponse.error("Error verificando usuario", 500);
  }
}