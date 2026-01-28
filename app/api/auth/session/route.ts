/**
 * BIOX - API de Sesión con Supabase Auth
 * Reemplaza /api/auth/session de NextAuth
 */

import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { APIResponse, MigrationLogger } from "@/lib/supabase-helpers";

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
  MigrationLogger.info('Getting session from Supabase Auth');

  // 1. Obtener usuario actual de Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    MigrationLogger.info('No active Supabase session found');
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
    MigrationLogger.warning('User found in auth but not in usuarios table', { userId: user.id });
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

  MigrationLogger.success('Supabase session retrieved successfully', { userId: user.id });

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
    MigrationLogger.info('Processing session request');

    // Obtener sesión directamente de Supabase
    const sessionData = await getSupabaseSession();

    MigrationLogger.performance('Session retrieval', startTime);

    if (!sessionData.authenticated) {
      return APIResponse.success({
        user: null,
        authenticated: false,
        message: 'No active session'
      });
    }

    return APIResponse.success({
      user: sessionData.user,
      cargos: sessionData.cargos,
      authenticated: true,
      message: 'Session active'
    });

  } catch (error: any) {
    MigrationLogger.error('Session retrieval failed', error);
    
    return APIResponse.error(
      "Error obteniendo sesión",
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
}

// ===============================================
// ENDPOINT PARA REFRESH DE SESIÓN
// ===============================================

export async function POST(req: NextRequest) {
  try {
    MigrationLogger.info('Processing session refresh request');

    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      MigrationLogger.error('Session refresh failed', error);
      return APIResponse.error("Error refrescando sesión", 401);
    }

    if (!data.session || !data.user) {
      return APIResponse.error("No hay sesión para refrescar", 401);
    }

    MigrationLogger.success('Session refreshed successfully');

    return APIResponse.success({
      user: {
        id: data.user.id,
        email: data.user.email!,
        nombre: data.user.email!.split('@')[0]
      },
      session: data.session,
      message: 'Sesión refrescada exitosamente'
    });

  } catch (error) {
    MigrationLogger.error('Session refresh error', error);
    return APIResponse.error("Error interno en refresh", 500);
  }
}