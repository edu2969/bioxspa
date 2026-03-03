/**
 * CONFIGURACIÓN SUPABASE
 * Manejo seguro de variables de entorno para diferentes contextos
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function clearConfigCache() {
  // No-op - cache removed
}

export function getSupabaseConfig(context: 'server' | 'client' | 'middleware' = 'client'): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay variables de entorno
  if (!url || !anonKey) {
    // Solo para build time en server-side
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn('Using mock config for production build');
      return {
        url: 'https://mock.supabase.co',
        anonKey: 'mock-anon-key'
      };
    }
    
    throw new Error(`Variables de entorno faltantes para Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY`);
  }

  // Validar formato de URL
  try {
    new URL(url);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL no es una URL válida: ${url}`);
  }

  // Retornar configuración válida
  return { url, anonKey };
}

export function hasSupabaseConfig(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

export function getSupabaseConfigSafe(context: 'server' | 'client' | 'middleware' = 'client'): SupabaseConfig | null {
  try {
    return getSupabaseConfig(context);
  } catch {
    return null;
  }
}

export function validateSupabaseConfig() {
  try {
    const config = getSupabaseConfig();
    return {
      isValid: true,
      config,
      errors: []
    };
  } catch (error) {
    return {
      isValid: false,
      config: null,
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    };
  }
}