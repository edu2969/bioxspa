/**
 * BIOX - Middleware de Migración para APIs NextAuth → Supabase
 * Helper para migrar endpoints que usan getServerSession
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ROLE_MAPPING } from '@/lib/auth/permissions';

// ===============================================
// TIPOS COMPATIBLES CON NEXTAUTH
// ===============================================

interface LegacyUser {
  id: string;
  email: string;
  role: number;
  name: string;
}

interface LegacySession {
  user: LegacyUser;
}

// ===============================================
// FUNCIÓN DE MIGRACIÓN DE SESIONES
// ===============================================

/**
 * Reemplazo directo para getServerSession(authOptions)
 * Mantiene la misma interfaz pero usa Supabase
 */
export async function getSupabaseSession(req: NextRequest): Promise<LegacySession | null> {
  try {
    // Obtener token del header de autorización
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Si no hay token, intentar obtenerlo de cookies
    let actualToken = token;
    if (!actualToken) {
      // En el contexto de Next.js, las cookies de Supabase se manejan automáticamente
      // pero para esta migración, usaremos una verificación de sesión directa
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      
      // Obtener información del usuario desde la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nombre,
          cargos (
            tipo,
            sucursal_id,
            dependencia_id,
            desde,
            hasta
          )
        `)
        .eq('id', user.id)
        .is('cargos.hasta', null) // Solo cargos activos
        .single();

      if (userError || !userData) return null;

      // Obtener el primer rol para compatibilidad
      const primaryRole = userData.cargos?.[0]?.tipo || 128; // Default: invitado

      return {
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.nombre || userData.email,
          role: primaryRole
        }
      };
    }

    // Si hay token, validarlo
    const { data: { user }, error } = await supabase.auth.getUser(actualToken);
    if (error || !user) return null;

    // Resto del código igual...
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre,
        cargos (
          tipo,
          sucursal_id,
          dependencia_id,
          desde,
          hasta
        )
      `)
      .eq('id', user.id)
      .is('cargos.hasta', null)
      .single();

    if (userError || !userData) return null;

    const primaryRole = userData.cargos?.[0]?.tipo || 128;

    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.nombre || userData.email,
        role: primaryRole
      }
    };

  } catch (error) {
    console.error('Error in getSupabaseSession:', error);
    return null;
  }
}

// ===============================================
// WRAPPER PARA MIGRACIÓN GRADUAL
// ===============================================

/**
 * Wrapper que reemplaza el patrón:
 * const session = await getServerSession(authOptions);
 * if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export function withSupabaseAuth(
  handler: (req: NextRequest, session: LegacySession) => Promise<Response>
) {
  return async function(req: NextRequest) {
    try {
      const session = await getSupabaseSession(req);
      
      if (!session) {
        return NextResponse.json(
          { error: "No autorizado", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      return await handler(req, session);
    } catch (error) {
      console.error('Error in withSupabaseAuth:', error);
      return NextResponse.json(
        { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}

// ===============================================
// HELPER PARA VERIFICACIÓN DE ROLES
// ===============================================

export function hasRequiredRole(session: LegacySession | null, requiredRoles: number[]): boolean {
  if (!session?.user?.role) return false;
  return requiredRoles.includes(session.user.role);
}

// ===============================================
// FUNCIÓN DE MIGRACIÓN AUTOMÁTICA
// ===============================================

/**
 * Migra automáticamente un endpoint que usa getServerSession
 * Ejemplo de uso:
 * 
 * export const GET = migrateAuthEndpoint(async (req, session) => {
 *   // El código original que usaba session
 *   return NextResponse.json({ data: "success" });
 * });
 */
export function migrateAuthEndpoint(
  originalHandler: (req: NextRequest, session: LegacySession) => Promise<Response>
) {
  return withSupabaseAuth(originalHandler);
}

// ===============================================
// UTILIDADES ADICIONALES
// ===============================================

/**
 * Obtener ID de sucursal del usuario (para filtros)
 */
export async function getUserSucursalId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('cargos(sucursal_id)')
      .eq('id', userId)
      .is('cargos.hasta', null)
      .single();

    if (error || !data?.cargos?.[0]) return null;
    return data.cargos[0].sucursal_id;
  } catch (error) {
    console.error('Error getting user sucursal:', error);
    return null;
  }
}