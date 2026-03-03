/**
 * SUPABASE BROWSER CLIENT
 * 
 * Cliente Supabase optimizado para uso en el navegador
 * Maneja estado de sesión del lado del cliente con persistencia automática
 */

'use client';

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cache global para cliente singleton
let clientCache: SupabaseClient | null = null;

interface BrowserClientOptions {
  forceNew?: boolean;
}

interface BrowserClientOptions {
  forceNew?: boolean;
}

/**
 * Crea o retorna instancia singleton del cliente Supabase para el navegador
 * @param options Opciones de configuración del cliente
 */
export function createSupabaseBrowserClient(options: BrowserClientOptions = {}): SupabaseClient {
  // Verificar si estamos en el servidor
  if (typeof window === 'undefined') {
    // Durante build/server-side, retornar un mock que no ejecute nada    
    return createMockClient();
  }

  // Retornar cache existente a menos que se fuerce uno nuevo
  if (!options.forceNew && clientCache) {
    return clientCache;
  }

  // VERIFICACIÓN DE COOKIES DEL NAVEGADOR
  console.log('🍪 Cookies del navegador:', {
    documentCookies: document.cookie,
    supabaseCookies: document.cookie.split(';').filter(c => c.includes('supabase')),
    authCookies: document.cookie.split(';').filter(c => c.includes('auth'))
  });

  try {
    // Obtener configuración de manera segura
    const config = getSupabaseConfig('client');
    
    // Crear cliente browser con configuración simplificada
    const client = createBrowserClient(
      config.url,
      config.anonKey,
      {
        // Configuración de auth optimizada para navegador
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    // Cachear cliente para futuras llamadas
    clientCache = client;

    return client;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    
    // En el browser, fallar claramente - no usar mock
    if (typeof window !== 'undefined') {
      throw new Error(`Error de configuración Supabase: ${message}`);
    }

    // Solo usar mock en server-side
    console.warn(`Error creando cliente Supabase en server, usando mock: ${message}`);
    return createMockClient();
  }
}

/**
 * Crea un cliente mock para contextos donde Supabase no está disponible
 */
function createMockClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: null }, error: null })
    },
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null })
    })
  } as any; // Mock flexible
}

/**
 * Obtiene el cliente existente sin crear uno nuevo
 * @returns Cliente existente o null si no existe
 */
export function getExistingBrowserClient(): SupabaseClient | null {
  return clientCache;
}

/**
 * Destruye el cliente cached (útil para logout o testing)
 */
export function destroyBrowserClient(): void {
  if (clientCache) {
    // No hay método destroy en Supabase client, pero limpiamos cache
    clientCache = null;
  }
}

/**
 * Verifica si hay un cliente activo
 */
export function hasBrowserClient(): boolean {
  return clientCache !== null;
}

/**
 * Alias for backward compatibility
 * @deprecated Use createSupabaseBrowserClient instead
 */
export function getSupabaseBrowserClient(options: BrowserClientOptions = {}): SupabaseClient {
  return createSupabaseBrowserClient(options);
}