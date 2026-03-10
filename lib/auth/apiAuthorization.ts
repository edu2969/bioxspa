/**
 * BIOX - Middleware de Autorización para APIs
 * Implementa defense-in-depth para endpoints de API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { TIPO_CARGO } from '@/app/utils/constants';
import { hasPermission } from './permissions';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface CargoData {
  tipo: number;
}

interface UserData {
  id: string;
  email: string;
  nombre: string;
}

interface AuthorizedUser {
  id: string;
  email: string;
  cargos: number[]; // Valores numéricos de TIPO_CARGO
  hasCargoType: (cargoType: number) => boolean;
  hasCargo: (cargoTypes: number[]) => boolean;
  can: (resource: string, action: string) => boolean;
}

interface AuthorizedRequest extends NextRequest {
  user?: AuthorizedUser;
}

// ===============================================
// FUNCIÓN PRINCIPAL DE AUTORIZACIÓN
// ===============================================

interface AuthorizeResult {
  authorized: boolean;
  user?: AuthorizedUser;
  error?: string;
}

export async function authorize(
  request: NextRequest
): Promise<AuthorizeResult> {
  
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

    // 3. Obtener información del usuario y sus cargos activos
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .eq('id', user.id)
      .single();

    const { data: cargosData, error: cargosError } = await supabase
      .from('cargos')
      .select('tipo')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .is('hasta', null);

    if (userError || !userData) {
      return { authorized: false, error: 'Usuario no encontrado en el sistema' };
    }

    // Asegurar que userData es del tipo correcto
    const typedUserData = userData as UserData;
    const typedCargosData = (cargosData || []) as CargoData[];

    const authorizedUser: AuthorizedUser = {
      id: typedUserData.id,
      email: typedUserData.email,
      cargos: typedCargosData.map(cargo => cargo.tipo),
      hasCargoType: (cargoType: number): boolean => {
        return typedCargosData.some(cargo => cargo.tipo === cargoType);
      },
      hasCargo: (cargoTypes: number[]): boolean => {
        return cargoTypes.some(cargoType => 
          typedCargosData.some(cargo => cargo.tipo === cargoType)
        );
      },
      can: (resource: string, action: string): boolean => {
        const userCargos = typedCargosData.map(cargo => cargo.tipo);
        return hasPermission(userCargos, resource, action);
      }
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
  handler: (req: NextRequest, user: AuthorizedUser) => Promise<Response>,
  options?: {
    resource?: string;
    action?: string;
    allowedRoles?: number[];
  }
): (req: NextRequest) => Promise<Response> {
  return async function authorizedHandler(req: NextRequest): Promise<Response> {
    const authResult: AuthorizeResult = await authorize(req);
    
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

    const authorizedUser = authResult.user!;

    if (options?.allowedRoles && options.allowedRoles.length > 0) {
      const hasAllowedCargo = authorizedUser.hasCargo(options.allowedRoles);
      if (!hasAllowedCargo) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Cargo insuficiente para esta operación',
            code: 'INSUFFICIENT_CARGO'
          },
          { status: 403 }
        );
      }
    }

    if (options?.resource && options?.action) {
      const hasRequiredPermission = authorizedUser.can(options.resource, options.action);
      if (!hasRequiredPermission) {
        return NextResponse.json(
          {
            ok: false,
            error: `Permisos insuficientes para ${options.action} en ${options.resource}`,
            code: 'INSUFFICIENT_PERMISSION'
          },
          { status: 403 }
        );
      }
    }
    
    try {
      return await handler(req, authorizedUser);
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

// ===============================================
// FUNCIONES HELPER PARA API ROUTES
// ===============================================

/**
 * Middleware para proteger rutas que requieren cargo específico
 */
export function withCargo(
  allowedCargos: number[],
  handler: (req: NextRequest, user: AuthorizedUser) => Promise<Response>
): (req: NextRequest) => Promise<Response> {
  return withAuthorization(async (req: NextRequest, user: AuthorizedUser): Promise<Response> => {
    const hasRequiredCargo: boolean = user.hasCargo(allowedCargos);
    
    if (!hasRequiredCargo) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Cargo insuficiente para esta operación',
          code: 'INSUFFICIENT_CARGO' 
        }, 
        { status: 403 }
      );
    }
    
    return handler(req, user);
  });
}

/**
 * Middleware para proteger rutas que requieren permisos específicos
 */
export function withPermission(
  resource: string,
  action: string,
  handler: (req: NextRequest, user: AuthorizedUser) => Promise<Response>
): (req: NextRequest) => Promise<Response> {
  return withAuthorization(async (req: NextRequest, user: AuthorizedUser): Promise<Response> => {
    const hasRequiredPermission: boolean = user.can(resource, action);
    
    if (!hasRequiredPermission) {
      return NextResponse.json(
        { 
          ok: false, 
          error: `Permisos insuficientes para ${action} en ${resource}`,
          code: 'INSUFFICIENT_PERMISSION' 
        }, 
        { status: 403 }
      );
    }
    
    return handler(req, user);
  });
}

/**
 * Alias para withCargo para mantener compatibilidad con ejemplos
 */
export const withRole = withCargo;

/**
 * Middleware simple que solo requiere autenticación
 */
export function withAuth(
  handler: (user: AuthorizedUser) => Promise<Response>
): (req: NextRequest) => Promise<Response> {
  return withAuthorization(async (req: NextRequest, user: AuthorizedUser): Promise<Response> => {
    return handler(user);
  });
}