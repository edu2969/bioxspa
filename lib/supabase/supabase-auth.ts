/**
 * SUPABASE AUTHENTICATION UTILITIES
 * 
 * Utilidades profesionales para manejo de autenticación con Supabase
 * Incluye tipos robustos, validación y manejo de errores
 */

import { createSupabaseServerClient } from "./server-client";
import type { User, UserResponse, Session } from "@supabase/supabase-js";

// ===============================================
// TIPOS DE DATOS
// ===============================================

export interface AuthResult<T = User> {
  success: boolean;
  data: T | null;
  error: Error | null;
  message?: string;
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
 * Obtiene el usuario autenticado del servidor
 * @param options Opciones de configuración
 */
export async function getAuthenticatedUser(
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
      message: 'Usuario obtenido exitosamente'
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
export async function requireAuth(): Promise<User> {
  const result = await getAuthenticatedUser({ requireAuth: true });
  
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
    const supabase = await createSupabaseServerClient();
    
    // Obtener sesión y usuario en paralelo
    const [{ data: sessionData, error: sessionError }, userResult] = await Promise.all([
      supabase.auth.getSession(),
      getAuthenticatedUser()
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

    // Verificar rol en los metadatos del usuario
    const userRoles = userResult.data.user_metadata?.roles || 
                     userResult.data.app_metadata?.roles || 
                     [];

    return Array.isArray(userRoles) 
      ? userRoles.includes(roleName)
      : userRoles === roleName;

  } catch (error) {
    console.warn('Error verificando roles del usuario:', error);
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

    const { sessionInfo } = sessionResult.data as any;
    
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