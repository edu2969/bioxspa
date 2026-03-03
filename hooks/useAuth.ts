/**
 * BIOX - Hook de Autenticación
 * Re-exporta las funciones del contexto de autenticación y los nuevos hooks de autorización
 */

export { useAuth, useRequireAuth, AuthProvider } from '@/context/AuthContext';
export { useAuthorization, useResourcePermissions, usePermission } from '@/lib/auth/useAuthorization';
export * from '@/lib/auth/AuthorizationComponents';