/**
 * BIOX - Middleware de Autorización para APIs
 * Implementa defense-in-depth para endpoints de API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface AuthorizedUser {
  id: string;
  email: string;
  roles: string[];
}

interface AuthorizedRequest extends NextRequest {
  user?: AuthorizedUser;
}

// ===============================================
// FUNCIÓN PRINCIPAL DE AUTORIZACIÓN
// ===============================================

export async function authorize(
  request: NextRequest
): Promise<{ authorized: boolean; user?: AuthorizedUser; error?: string }> {
  
  try {
    const supabase = await getSupabaseServerClient();
    
    // 1. Verificar token de autorización
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return { authorized: false, error: 'Token de autorización requerido' };
    }

    // 2. Validar token con Supabase
    const { data: { user }, error: tokenError } = await supabase.auth.getUser();
    
    if (tokenError || !user) {
      return { authorized: false, error: 'Token inválido o expirado' };
    }

    // 3. Obtener información del usuario y sus roles
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre
      `)
      .eq('id', user.id)
      .is('cargos.hasta', null) // Solo cargos activos
      .single();

    if (userError || !userData) {
      return { authorized: false, error: 'Usuario no encontrado en el sistema' };
    }

    const authorizedUser: AuthorizedUser = {
      id: userData.id,
      email: userData.email,
      roles: []
    };    

    return { authorized: true, user: authorizedUser };
  } catch (error) {
    console.error('Error en autorización:', error);
    return { 
      authorized: false, 
      error: 'Error interno en verificación de autorización' 
    };
  }
}

// ===============================================
// MIDDLEWARE WRAPPER PARA ENDPOINTS
// ===============================================

export function withAuthorization(
  handler: (req: NextRequest, user: AuthorizedUser) => Promise<Response>
) {
  return async function authorizedHandler(req: NextRequest) {
    const authResult = await authorize(req);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { 
          ok: false, 
          error: authResult.error || 'Acceso denegado',
          code: 'UNAUTHORIZED' 
        }, 
        { status: 401 }
      );
    }
    
    // Agregar información del usuario al request para uso en el handler
    (req as AuthorizedRequest).user = authResult.user;
    
    try {
      return await handler(req, authResult.user!);
    } catch (error) {
      console.error('Error en handler autorizado:', error);
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        }, 
        { status: 500 }
      );
    }
  };
}