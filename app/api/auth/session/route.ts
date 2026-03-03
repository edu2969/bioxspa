/**
 * BIOX - API de Sesión con Supabase Auth
 * Reemplaza /api/auth/session de NextAuth
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface SessionResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
  } | null;
  cargos?: any[];
  authenticated: boolean;
}

// ===============================================
// OPERACIÓN CON SUPABASE AUTH
// ===============================================

async function getSupabaseSession(): Promise<SessionResponse> {
  // 1. Obtener usuario actual de Supabase Auth
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      user: null,
      authenticated: false
    };
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
    .eq('id', user.id)
    .is('cargos.hasta', null) // Solo cargos activos
    .single();

  if (userError || !usuario) {
    // Retornar datos básicos del auth
    return {
      user: {
        id: user.id,
        email: user.email!,
        nombre: user.email!.split('@')[0]
      },
      cargos: [],
      authenticated: true
    };
  }

  return {
    user: {
      id: user.id,
      email: usuario.email,
      nombre: usuario.nombre
    },
    cargos: usuario.cargos || [],
    authenticated: true
  };
}

// ===============================================
// HANDLER PRINCIPAL
// ===============================================

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Obtener sesión directamente de Supabase
    const sessionData = await getSupabaseSession();

    if (!sessionData.authenticated) {
      return NextResponse.json({
        user: null,
        authenticated: false,
        message: 'No active session'
      });
    }

    return NextResponse.json({
      user: sessionData.user,
      cargos: sessionData.cargos,
      authenticated: true,
      message: 'Session active'
    });

  } catch (error: any) {
    
    return NextResponse.json({
      ok: false,
      error: "Error obteniendo sesión",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// ===============================================
// ENDPOINT PARA REFRESH DE SESIÓN
// ===============================================

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      return NextResponse.json({ ok: false, error: "Error refrescando sesión" }, { status: 401 });
    }

    if (!data.session || !data.user) {
      return NextResponse.json({ ok: false, error: "No hay sesión para refrescar" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        nombre: data.user.email!.split('@')[0]
      },
      session: data.session,
      message: 'Sesión refrescada exitosamente'
    });

  } catch {
    return NextResponse.json({ ok: false, error: "Error interno en refresh" }, { status: 500 });
  }
}