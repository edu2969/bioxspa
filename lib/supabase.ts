/**
 * SUPABASE CLIENT LIBRARY
 * 
 * Interfaz principal para todos los clientes y utilidades de Supabase
 * Sistema unificado que proporciona acceso consistente y tipado a la funcionalidad de Supabase
 */

// ===============================================
// CLIENT EXPORTS
// ===============================================

// Clientes principales
export { 
  createSupabaseServerClient,
  createSupabaseServerClientPublic 
} from './supabase/server-client';

export { 
  createSupabaseBrowserClient,
  getExistingBrowserClient,
  destroyBrowserClient,
  hasBrowserClient 
} from './supabase/browser-client';

export { 
  createSupabaseMiddlewareClient,
  hasValidSupabaseSession,
  clearSupabaseCookies 
} from './supabase/middleware-client';

// ===============================================
// AUTHENTICATION EXPORTS
// ===============================================

export {
  getAuthenticatedUser,
  requireAuth,
  getSessionInfo,
  hasRole,
  isSessionValid,
  buildAuthContext
} from './supabase/supabase-auth';

export type {
  AuthResult,
  SessionInfo,
  AuthContext
} from './supabase/supabase-auth';

// ===============================================
// CONFIGURATION EXPORTS  
// ===============================================

export {
  getSupabaseConfig,
  hasSupabaseConfig,
  getSupabaseConfigSafe,
  validateSupabaseConfig
} from './supabase/config';

// ===============================================
// LEGACY COMPATIBILITY
// ===============================================

// Alias para compatibilidad con código existente
export { 
  createSupabaseServerClient as getSupabaseServerClient 
} from './supabase/server-client';

// ===============================================
// BACKWARD COMPATIBILITY EXPORTS
// ===============================================

// Named export para compatibilidad con código que usa
// import { supabase } from "@/lib/supabase"
export { createSupabaseServerClient as supabase } from './supabase/server-client';

// Admin client para operaciones administrativas
export { createSupabaseServerClient as supabaseAdmin } from './supabase/server-client';

// Re-export helpers para compatibilidad con Turbopack
export type { APIResponse } from './supabase-helpers';
export { ResponseHelper, createResponse, createErrorResponse, createSuccessResponse } from './supabase-helpers';

// ===============================================
// VERSION & INFO
// ===============================================

export const SUPABASE_LIB_VERSION = '2.0.0';
export const SUPABASE_LIB_NAME = 'kskin-manager-supabase';

/**
 * Información de la librería de Supabase
 */
export const SupabaseLib = {
  version: SUPABASE_LIB_VERSION,
  name: SUPABASE_LIB_NAME,
  description: 'Sistema unificado de Supabase para kskin-manager'
} as const;