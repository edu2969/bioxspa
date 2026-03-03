/**
 * BIOX - Componentes de Autorización
 * Componentes React para control de acceso basado en permisos
 */

'use client';

import React from 'react';
import { useAuthorization } from './useAuthorization';
import { PermissionContext } from './permissions';

// ===============================================
// COMPONENTE CONDICIONAL BASADO EN PERMISOS
// ===============================================

interface CanProps {
  resources: string[]; // Cambiado a plural para aceptar múltiples recursos
  actions: string[]; // Cambiado a plural para aceptar múltiples acciones
  context?: PermissionContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ resources, actions, children, fallback = null }: CanProps) {
  const { canAny } = useAuthorization();
  
  // Crear todas las combinaciones de resource/action para verificar
  const permissions = React.useMemo(() => {
    const combinations = [];
    for (const resource of resources) {
      for (const action of actions) {
        combinations.push({ resource, action });
      }
    }
    return combinations;
  }, [resources, actions]);
  
  // Usar canAny para verificar si tiene al menos un permiso
  const hasPermission = canAny(permissions);
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

// ===============================================
// COMPONENTE PARA MÚLTIPLES PERMISOS (OR)
// ===============================================

interface CanAnyProps {
  permissions: Array<{ resource: string; action: string }>;
  context?: PermissionContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAny({ permissions, children, fallback = null }: CanAnyProps) {
  const auth = useAuthorization();
  const hasAnyPermission = auth.canAny(permissions);
  
  return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
}

// ===============================================
// COMPONENTE PARA MÚLTIPLES PERMISOS (AND)
// ===============================================

interface CanAllProps {
  permissions: Array<{ resource: string; action: string }>;
  context?: PermissionContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAll({ permissions, children, fallback = null }: CanAllProps) {
  const auth = useAuthorization();
  const hasAllPermissions = auth.canAll(permissions);
  
  return hasAllPermissions ? <>{children}</> : <>{fallback}</>;
}

// ===============================================
// COMPONENTE PARA VERIFICACIÓN DE ROLES
// ===============================================

interface HasRoleProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const auth = useAuthorization();
  const hasRole = auth.hasRole(roles);
  
  return hasRole ? <>{children}</> : <>{fallback}</>;
}

// ===============================================
// HOC PARA PROTEGER COMPONENTES ENTEROS
// ===============================================

interface WithAuthorizationOptions {
  resource?: string;
  action?: string;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  requireAll?: boolean; // Para permissions array, default false (OR)
  fallback?: React.ComponentType;
  redirect?: string;
}

export function withAuthorization<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthorizationOptions
) {
  return function AuthorizedComponent(props: P) {
    const auth = useAuthorization();
    
    let isAuthorized = false;

    if (options.resource && options.action) {
      isAuthorized = auth.can(options.resource, options.action);
    } else if (options.roles) {
      isAuthorized = auth.hasRole(options.roles);
    } else if (options.permissions) {
      isAuthorized = options.requireAll 
        ? auth.canAll(options.permissions)
        : auth.canAny(options.permissions);
    }

    if (!isAuthorized) {
      if (options.redirect && typeof window !== 'undefined') {
        window.location.href = options.redirect;
        return null;
      }
      
      if (options.fallback) {
        const FallbackComponent = options.fallback;
        return <FallbackComponent />;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// ===============================================
// COMPONENTE DE ERROR DE AUTORIZACIÓN
// ===============================================

export function UnauthorizedError({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg 
            className="h-6 w-6 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" 
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
        <p className="text-gray-600">
          {message || "No tienes los permisos necesarios para realizar esta acción."}
        </p>
      </div>
    </div>
  );
}