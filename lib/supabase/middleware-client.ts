/**
 * SUPABASE MIDDLEWARE CLIENT
 * 
 * Cliente Supabase optimizado para uso en Next.js middleware
 * Maneja autenticación y cookies entre requests sin bloquear el pipeline
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigSafe } from "./config";

interface MiddlewareClientOptions {
  skipAuth?: boolean;
  cookiePrefix?: string;
  onAuthError?: (error: Error) => void;
}

/**
 * Crea cliente Supabase optimizado para middleware de Next.js
 * @param request Request object de Next.js
 * @param response Response object de Next.js  
 * @param options Opciones de configuración
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
  options: MiddlewareClientOptions = {}
) {
  try {
    // Obtener configuración de manera segura (sin lanzar errores en build)
    const config = getSupabaseConfigSafe('middleware');
    
    if (!config) {
      console.warn('⚠️ Configuración de Supabase no disponible en middleware');
      // Retornar un cliente mock que no hará nada pero no fallará
      return createMockMiddlewareClient();
    }

    const { skipAuth = false, cookiePrefix = 'sb' } = options;

    // Crear cliente con manejo avanzado de cookies
    const client = createServerClient(
      config.url,
      config.anonKey,
      {
        cookies: {
          getAll() {
            // Obtener todas las cookies del request
            return request.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value
            }));
          },
          setAll(cookiesToSet) {
            // Establecer cookies de manera segura
            cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
              try {
                // Solo procesar cookies relacionadas con Supabase
                if (name.startsWith(cookiePrefix)) {
                  response.cookies.set({
                    name,
                    value,
                    ...cookieOptions,
                    // Configuraciones de seguridad para middleware
                    httpOnly: cookieOptions?.httpOnly ?? true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: cookieOptions?.sameSite ?? 'lax'
                  });
                }
              } catch (error) {
                console.warn(`No se pudo establecer cookie '${name}' en middleware:`, error);
                if (options.onAuthError) {
                  options.onAuthError(error as Error);
                }
              }
            });
          }
        }
      }
    );

    return client;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`Error en middleware Supabase: ${message}`);
    
    if (options.onAuthError) {
      options.onAuthError(error as Error);
    }

    // Retornar cliente mock en caso de error
    return createMockMiddlewareClient();
  }
}

/**
 * Crea un cliente mock que no falla pero tampoco hace nada
 * Útil para contextos donde Supabase no está disponible
 */
function createMockMiddlewareClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null })
    },
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null })
    })
  } as any; // Tipo flexible para compatibilidad
}

/**
 * Utilidad para verificar si un request tiene sesión válida de Supabase
 */
export async function hasValidSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<boolean> {
  try {
    const client = createSupabaseMiddlewareClient(request, response, {
      skipAuth: false
    });
    
    const { data: { user } } = await client.auth.getUser();
    return user !== null;
    
  } catch (error) {
    console.warn('Error verificando sesión en middleware:', error);
    return false;
  }
}

/**
 * Utilidad para limpiar cookies de Supabase en logout
 */
export function clearSupabaseCookies(response: NextResponse, cookiePrefix = 'sb'): void {
  try {
    // Lista de cookies típicas de Supabase que necesitan ser limpiadas
    const cookiesToClear = [
      `${cookiePrefix}-access-token`,
      `${cookiePrefix}-refresh-token`,
      `${cookiePrefix}-auth-token`,
      `${cookiePrefix}-auth.token`
    ];

    cookiesToClear.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });

  } catch (error) {
    console.warn('Error limpiando cookies de Supabase:', error);
  }
}