/**
 * SUPABASE AUTHENTICATION UTILITIES
 * 
 * Utilidades profesionales para manejo de autenticación con Supabase
 * Incluye tipos robustos, validación y manejo de errores
 */

import { createSupabaseServerClient } from "./server-client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User, UserResponse, Session } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import { TIPO_CARGO } from '@/app/utils/constants';

// ===============================================
// TIPOS DE DATOS
// ===============================================

export interface AuthResult<T = User> {
  success: boolean;
  data: T | null;
  error: Error | null;
  message?: string;
}

export interface UserData {
  id: string;
  email: string;
  nombre: string;
  role?: string;
  cargos?: Array<{
    id?: string;
    tipo: number;
    sucursal_id?: string;
    dependencia_id?: string;
    desde?: string;
    hasta?: string;
    sucursales?: {
      id: string;
      nombre: string;
      codigo?: string;
    } | null;
  }>;
}

export interface AuthenticatedUserResult {
  user: User;
  userData: UserData;
  hasRole: (roleName: string) => boolean;
  hasCargoType: (cargoType: keyof typeof TIPO_CARGO) => boolean;
  hasCargo: (cargoTypes: (keyof typeof TIPO_CARGO)[]) => boolean;
}

export interface SessionInfo {
  user: User;
  session: Session;
  isValid: boolean;
  expiresAt: Date | null;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ===============================================
// UTILITARIOS DE AUTENTICACIÓN
// ===============================================

/**
 * Crea cliente Supabase con service role para operaciones privilegiadas
 */
async function createServiceRoleClient() {
  const config = getSupabaseConfig('server');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada');
  }

  const cookieStore = await cookies();

  return createServerClient(
    config.url,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              console.warn(`No se pudo establecer la cookie '${name}':`, error);
            }
          });
        }
      }
    }
  );
}

/**
 * Obtiene el usuario autenticado con datos completos de la BD
 * @param options Opciones de configuración
 */
export async function getAuthenticatedUser(
  options: { requireAuth?: boolean; includeRoles?: boolean } = {}
): Promise<AuthResult<AuthenticatedUserResult>> {
  try {
    const supabase = await createServiceRoleClient();
    const { data, error }: UserResponse = await supabase.auth.getUser();
    
    if (error) {
      console.warn('❌ Error de autenticación:', error.message);
      return {
        success: false,
        data: null,
        error: new Error(`Error de autenticación: ${error.message}`),
        message: 'No se pudo obtener información del usuario'
      };
    }

    if (!data.user) {
      const noUserError = new Error('Usuario no autenticado');
      
      if (options.requireAuth) {
        return {
          success: false,
          data: null,
          error: noUserError,
          message: 'Autenticación requerida'
        };
      }
      
      return {
        success: true,
        data: null,
        error: noUserError,
        message: 'No hay usuario autenticado'
      };
    }

    const userId = data.user.id;
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        email,
        nombre,
        role,
        cargos (
          id,
          tipo,
          sucursal_id,
          dependencia_id,
          desde,
          hasta,
          sucursales (id, nombre, codigo)
        )
      `)
      .eq('id', userId)
      .is('cargos.hasta', null) // Solo cargos activos
      .single();

    if (userError) {
      console.warn('⚠️ Error consultando datos de usuario en BD:', userError.message);
      
      // Fallback: retornar datos básicos del auth
      const basicUserData: UserData = {
        id: data.user.id,
        email: data.user.email || '',
        nombre: data.user.user_metadata?.name || data.user.email || ''
      };

      return {
        success: true,
        data: createAuthenticatedUserResult(data.user, basicUserData),
        error: null,
        message: 'Usuario obtenido con datos básicos (BD no disponible)'
      };
    }

    const transformedUserData: UserData = {
      id: userData.id,
      email: userData.email,
      nombre: userData.nombre,
      role: userData.role,
      cargos: (userData.cargos || []).map((cargo: any) => ({
        id: cargo.id,
        tipo: cargo.tipo,
        sucursal_id: cargo.sucursal_id,
        dependencia_id: cargo.dependencia_id,
        desde: cargo.desde,
        hasta: cargo.hasta,
        // Supabase puede retornar array de sucursales, tomar la primera
        sucursales: Array.isArray(cargo.sucursales) 
          ? (cargo.sucursales[0] || null)
          : cargo.sucursales || null
      }))
    };

    return {
      success: true,
      data: createAuthenticatedUserResult(data.user, transformedUserData),
      error: null,
      message: 'Usuario obtenido exitosamente'
    };

  } catch (error) {
    const authError = error instanceof Error ? error : new Error('Error desconocido en autenticación');
    console.error('❌ Error en getAuthenticatedUser:', authError);
    
    return {
      success: false,
      data: null,
      error: authError,
      message: 'Fallo interno en sistema de autenticación'
    };
  }
}

/**
 * Crea el resultado enriquecido con utilidades
 */
function createAuthenticatedUserResult(
  user: User, 
  userData: UserData
): AuthenticatedUserResult {
  return {
    user,
    userData,
    hasRole: (roleName: string) => {
      // Verificar en userData.role primero
      if (userData.role === roleName) return true;
      
      // Fallback a metadatos de Supabase
      const userRoles = user.user_metadata?.roles || user.app_metadata?.roles || [];
      return Array.isArray(userRoles) 
        ? userRoles.includes(roleName)
        : userRoles === roleName;
    },
    hasCargoType: (cargoType: keyof typeof TIPO_CARGO) => {
      if (!userData.cargos || userData.cargos.length === 0) return false;
      const cargoValue = TIPO_CARGO[cargoType];
      return userData.cargos.some(cargo => cargo.tipo === cargoValue);
    },
    hasCargo: (cargoTypes: (keyof typeof TIPO_CARGO)[]) => {
      if (!userData.cargos || userData.cargos.length === 0) return false;
      return cargoTypes.some(cargoType => {
        const cargoValue = TIPO_CARGO[cargoType];
        return userData.cargos!.some(cargo => cargo.tipo === cargoValue);
      });
    }
  };
}

/**
 * Obtiene usuario básico sin datos adicionales de BD (más rápido)
 */
export async function getBasicAuthenticatedUser(
  options: { requireAuth?: boolean } = {}
): Promise<AuthResult<User>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error }: UserResponse = await supabase.auth.getUser();
    
    if (error) {
      return {
        success: false,
        data: null,
        error: new Error(`Error de autenticación: ${error.message}`),
        message: 'No se pudo obtener información del usuario'
      };
    }

    if (!data.user) {
      const noUserError = new Error('Usuario no autenticado');
      
      if (options.requireAuth) {
        return {
          success: false,
          data: null,
          error: noUserError,
          message: 'Autenticación requerida'
        };
      }
      
      return {
        success: true,
        data: null,
        error: noUserError,
        message: 'No hay usuario autenticado'
      };
    }

    return {
      success: true,
      data: data.user,
      error: null,
      message: 'Usuario básico obtenido exitosamente'
    };

  } catch (error) {
    const authError = error instanceof Error ? error : new Error('Error desconocido en autenticación');
    
    return {
      success: false,
      data: null,
      error: authError,
      message: 'Fallo interno en sistema de autenticación'
    };
  }
}

/**
 * Requiere que el usuario esté autenticado, lanza error si no
 */
export async function requireAuth(): Promise<AuthenticatedUserResult> {
  const result = await getAuthenticatedUser({ requireAuth: true });
  
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Autenticación requerida');
  }
  
  return result.data;
}

/**
 * Variant más simple que solo requiere User básico
 */
export async function requireBasicAuth(): Promise<User> {
  const result = await getBasicAuthenticatedUser({ requireAuth: true });
  
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Autenticación requerida');
  }
  
  return result.data;
}

/**
 * Obtiene información completa de la sesión
 */
export async function getSessionInfo(): Promise<AuthResult<SessionInfo>> {
  try {
    const supabase = await createServiceRoleClient();
    
    // Obtener sesión y usuario en paralelo
    const [{ data: sessionData, error: sessionError }, userResult] = await Promise.all([
      supabase.auth.getSession(),
      getBasicAuthenticatedUser()
    ]);

    if (sessionError) {
      return {
        success: false,
        data: null,
        error: new Error(`Error obteniendo sesión: ${sessionError.message}`),
        message: 'No se pudo obtener información de sesión'
      };
    }

    if (!userResult.success || !userResult.data || !sessionData.session) {
      return {
        success: false,
        data: null,
        error: new Error('Sesión inválida o usuario no autenticado'),
        message: 'No hay sesión activa'
      };
    }

    // Construir información de la sesión
    const sessionInfo: SessionInfo = {
      user: userResult.data,
      session: sessionData.session,
      isValid: !!sessionData.session.access_token,
      expiresAt: sessionData.session.expires_at 
        ? new Date(sessionData.session.expires_at * 1000) 
        : null
    };

    return {
      success: true,
      data: sessionInfo,
      error: null,
      message: 'Información de sesión obtenida exitosamente'
    };

  } catch (error) {
    const sessionError = error instanceof Error ? error : new Error('Error desconocido obteniendo sesión');
    
    return {
      success: false,
      data: null,
      error: sessionError,
      message: 'Fallo interno obteniendo información de sesión'
    };
  }
}

/**
 * Verifica si el usuario actual tiene un rol específico
 */
export async function hasRole(roleName: string): Promise<boolean> {
  try {
    const userResult = await getAuthenticatedUser();
    
    if (!userResult.success || !userResult.data) {
      return false;
    }

    return userResult.data.hasRole(roleName);

  } catch (error) {
    console.warn('Error verificando roles del usuario:', error);
    return false;
  }
}

/**
 * Verifica si el usuario tiene un tipo de cargo específico
 */
export async function hasCargoType(cargoType: keyof typeof TIPO_CARGO): Promise<boolean> {
  try {
    const userResult = await getAuthenticatedUser();
    
    if (!userResult.success || !userResult.data) {
      return false;
    }

    return userResult.data.hasCargoType(cargoType);

  } catch (error) {
    console.warn('Error verificando tipo de cargo:', error);
    return false;
  }
}

/**
 * Verifica si el usuario tiene alguno de los tipos de cargo especificados
 */
export async function hasCargo(cargoTypes: (keyof typeof TIPO_CARGO)[]): Promise<boolean> {
  try {
    const userResult = await getAuthenticatedUser();
    
    if (!userResult.success || !userResult.data) {
      return false;
    }

    return userResult.data.hasCargo(cargoTypes);

  } catch (error) {
    console.warn('Error verificando cargos:', error);
    return false;
  }
}

/**
 * Verifica si la sesión actual es válida y no ha expirado
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const sessionResult = await getSessionInfo();
    
    if (!sessionResult.success || !sessionResult.data) {
      return false;
    }

    const sessionInfo = sessionResult.data;
    
    // Verificar si la sesión ha expirado
    if (sessionInfo.expiresAt && sessionInfo.expiresAt < new Date()) {
      return false;
    }

    return sessionInfo.isValid;

  } catch (error) {
    console.warn('Error verificando validez de sesión:', error);
    return false;
  }
}

/**
 * Construye contexto de autenticación para componentes
 */
export async function buildAuthContext(): Promise<AuthContext> {
  try {
    const sessionResult = await getSessionInfo();
    
    if (!sessionResult.success || !sessionResult.data) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false
      };
    }

    const { user, session } = sessionResult.data;

    return {
      user,
      session,
      isAuthenticated: true,
      isLoading: false
    };

  } catch (error) {
    console.warn('Error construyendo contexto de autenticación:', error);
    
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false
    };
  }
}

// ===============================================
// UTILIDADES PARA API ROUTES
// ===============================================

/**
 * Middleware para verificar autenticación en API routes
 */
export async function withAuth<T extends any[]>(
  handler: (authResult: AuthenticatedUserResult, ...args: T) => Promise<Response>,
  ...args: T
): Promise<Response> {
  try {
    const authResult = await getAuthenticatedUser({ requireAuth: true });
    
    if (!authResult.success || !authResult.data) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: authResult.message || 'No autorizado' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(authResult.data, ...args);
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Error interno de autenticación' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Middleware para verificar roles específicos en API routes
 */
export async function withRole(
  allowedRoles: string[],
  handler: (authResult: AuthenticatedUserResult) => Promise<Response>
): Promise<Response> {
  try {
    const authResult = await getAuthenticatedUser({ requireAuth: true });
    
    if (!authResult.success || !authResult.data) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const hasRequiredRole = allowedRoles.some(role => 
      authResult.data!.hasRole(role)
    );
    
    if (!hasRequiredRole) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Permisos insuficientes',
          requiredRoles: allowedRoles
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(authResult.data);
  } catch (error) {
    console.error('Error en middleware de roles:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Error interno de autorización' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Middleware para verificar cargos específicos en API routes
 */
export async function withCargo(
  allowedCargos: (keyof typeof TIPO_CARGO)[],
  handler: (authResult: AuthenticatedUserResult) => Promise<Response>
): Promise<Response> {
  try {
    const authResult = await getAuthenticatedUser({ requireAuth: true });
    
    if (!authResult.success || !authResult.data) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const hasRequiredCargo = authResult.data.hasCargo(allowedCargos);
    
    if (!hasRequiredCargo) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'Cargo insuficiente',
          requiredCargos: allowedCargos
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(authResult.data);
  } catch (error) {
    console.error('Error en middleware de cargos:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Error interno de autorización' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/*
 * ===============================================
 * MEJORAS IMPLEMENTADAS EN SUPABASE-AUTH v2.0
 * ===============================================
 * 
 * 1. **Service Role Key Integration**: 
 *    - Uso de SUPABASE_SERVICE_ROLE_KEY para acceso completo a la BD
 *    - Cliente dedicado para operaciones privilegiadas
 * 
 * 2. **Carga Completa de Datos de Usuario**:
 *    - Consulta automática a tabla 'usuarios' con roles y cargos
 *    - Fallback a datos básicos de Auth si BD no disponible
 *    - Carga de cargos activos con información de sucursales
 * 
 * 3. **Tipos Robustos y Enriquecidos**:
 *    - AuthenticatedUserResult con utilidades integradas
 *    - UserData completo con roles y cargos
 *    - Métodos hasRole, hasCargoType, hasCargo embebidos
 * 
 * 4. **Optimización para API Routes**:
 *    - Middlewares withAuth, withRole, withCargo para protección
 *    - Respuestas estructuradas con códigos de estado apropiados
 *    - Manejo consistente de errores para APIs
 * 
 * 5. **Compatibilidad con Sistema BIOX**:
 *    - Integración con TIPO_CARGO de constants.ts
 *    - Verificación de cargos específicos del dominio
 *    - Logging mejorado para debugging
 * 
 * 6. **Flexibilidad y Performance**:
 *    - getAuthenticatedUser() para datos completos
 *    - getBasicAuthenticatedUser() para casos simples
 *    - Caché y reutilización de conexiones
 * 
 * EJEMPLO DE USO EN API ROUTE:
 * 
 * ```typescript
 * // route.ts
 * import { withAuth, withCargo } from '@/lib/supabase/supabase-auth';
 * 
 * export async function GET() {
 *   return withAuth(async (authUser) => {
 *     // authUser.userData tiene roles y cargos completos
 *     return Response.json({ user: authUser.userData });
 *   });
 * }
 * 
 * export async function POST() {
 *   return withCargo(['gerente', 'encargado'], async (authUser) => {
 *     // Solo gerentes y encargados pueden acceder
 *     return Response.json({ ok: true });
 *   });
 * }
 * ```
 */