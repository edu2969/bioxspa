/**
 * BIOX - Middleware de Autorización para APIs
 * Implementa defense-in-depth para endpoints de API
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hasPermission, ROLES, ROLE_MAPPING } from './permissions';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface AuthorizedUser {
  id: string;
  email: string;
  roles: string[];
  context: {
    sucursalId?: string;
    dependenciaId?: string;
  };
}

interface AuthorizationOptions {
  resource: string;
  action: string;
  allowedRoles?: string[];
  requireContext?: boolean;
}

// ===============================================
// FUNCIÓN PRINCIPAL DE AUTORIZACIÓN
// ===============================================

export async function authorize(
  request: NextRequest,
  options: AuthorizationOptions
): Promise<{ authorized: boolean; user?: AuthorizedUser; error?: string }> {
  
  try {
    // 1. Verificar token de autorización
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return { authorized: false, error: 'Token de autorización requerido' };
    }

    // 2. Validar token con Supabase
    const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !user) {
      return { authorized: false, error: 'Token inválido o expirado' };
    }

    // 3. Obtener información del usuario y sus roles
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
          hasta,
          sucursales (id, nombre)
        )
      `)
      .eq('id', user.id)
      .is('cargos.hasta', null) // Solo cargos activos
      .single();

    if (userError || !userData) {
      return { authorized: false, error: 'Usuario no encontrado en el sistema' };
    }

    // 4. Convertir roles legacy a roles semánticos
    const userRoles = userData.cargos?.map((cargo: any) => {
      const roleEntry = Object.entries(ROLE_MAPPING).find(([_, value]) => value === cargo.tipo);
      return roleEntry ? roleEntry[0] : ROLES.GUEST;
    }) || [ROLES.GUEST];

    // 5. Crear contexto del usuario
    const userContext = {
      sucursalId: userData.cargos?.[0]?.sucursal_id,
      dependenciaId: userData.cargos?.[0]?.dependencia_id
    };

    const authorizedUser: AuthorizedUser = {
      id: userData.id,
      email: userData.email,
      roles: userRoles,
      context: userContext
    };

    // 6. Verificar roles específicos si se especifican
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      const hasAllowedRole = options.allowedRoles.some(role => userRoles.includes(role));
      if (!hasAllowedRole) {
        return { 
          authorized: false, 
          user: authorizedUser,
          error: `Acceso denegado. Roles requeridos: ${options.allowedRoles.join(', ')}` 
        };
      }
    }

    // 7. Verificar permisos específicos
    const hasRequiredPermission = hasPermission(
      userRoles, 
      options.resource, 
      options.action,
      {
        userId: authorizedUser.id,
        ...userContext
      }
    );

    if (!hasRequiredPermission) {
      return { 
        authorized: false, 
        user: authorizedUser,
        error: `Acceso denegado. Permiso requerido: ${options.resource}:${options.action}` 
      };
    }

    // 8. Verificar contexto requerido si es necesario
    if (options.requireContext && (!userContext.sucursalId && !userContext.dependenciaId)) {
      return { 
        authorized: false, 
        user: authorizedUser,
        error: 'Usuario debe estar asignado a una sucursal o dependencia' 
      };
    }

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
  options: AuthorizationOptions
) {
  return async function authorizedHandler(req: NextRequest) {
    const authResult = await authorize(req, options);
    
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
    (req as any).user = authResult.user;
    
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

// ===============================================
// UTILIDADES PARA VERIFICACIONES ESPECÍFICAS
// ===============================================

/**
 * Verificar si el usuario puede acceder a un recurso específico por ID
 */
export async function canAccessResource(
  user: AuthorizedUser,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  
  // Implementar lógica específica según el tipo de recurso
  switch (resourceType) {
    case 'pedido':
      // Verificar si el pedido pertenece a la sucursal del usuario
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('sucursal_id')
        .eq('id', resourceId)
        .single();
      
      return pedido?.sucursal_id === user.context.sucursalId;
      
    case 'cliente':
      // Lógica para clientes...
      return true;
      
    default:
      return true;
  }
}

/**
 * Obtener filtros de base de datos basados en el contexto del usuario
 */
export function getUserDataFilters(user: AuthorizedUser, resourceType: string): object {
  const filters: any = {};
  
  // Super admin no necesita filtros
  if (user.roles.includes(ROLES.SUPER_ADMIN)) {
    return filters;
  }
  
  // Aplicar filtros según el contexto del usuario
  if (user.context.sucursalId) {
    filters.sucursal_id = user.context.sucursalId;
  }
  
  if (user.context.dependenciaId) {
    filters.dependencia_id = user.context.dependenciaId;
  }
  
  return filters;
}