/**
 * BIOX - Hooks de Autorización
 * React hooks para manejo de permisos siguiendo mejores prácticas
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  getComponentPermissions,
  ComponentPermissions,
  PermissionContext,
  ROLES,
  ROLE_MAPPING
} from './permissions';
import { useMemo } from 'react';

// ===============================================
// HOOK PRINCIPAL DE AUTORIZACIÓN
// ===============================================

export function useAuthorization() {
  const { user, cargos } = useAuth();  

  const userRoles = useMemo(() => {
    if (!cargos || cargos.length === 0) return [ROLES.GUEST];
    
    // Convertir roles legacy a roles semánticos
    return cargos.map(cargo => {
      const roleEntry = Object.entries(ROLE_MAPPING).find(([_, value]) => value === cargo.tipo);
      return roleEntry ? roleEntry[0] : ROLES.GUEST;
    });
  }, [cargos]);  

  const context: PermissionContext = useMemo(() => ({
    userId: user?.id || '',
    sucursalId: cargos?.[0]?.sucursal?.id,
    dependenciaId: cargos?.[0]?.dependenciaId,
  }), [user, cargos]);

  return {
    userRoles,
    context,
    user,
    cargos,

    // Función principal de verificación de permisos
    can: (resource: string, action: string, customContext?: PermissionContext) => 
      hasPermission(userRoles, resource, action, customContext || context),

    // Verificaciones múltiples
    canAny: (permissions: Array<{ resource: string; action: string }>, customContext?: PermissionContext) =>
      hasAnyPermission(userRoles, permissions, customContext || context),

    canAll: (permissions: Array<{ resource: string; action: string }>, customContext?: PermissionContext) =>
      hasAllPermissions(userRoles, permissions, customContext || context),

    // Helper para obtener permisos de componente
    getPermissions: (resource: string, customContext?: PermissionContext): ComponentPermissions =>
      getComponentPermissions(userRoles, resource, customContext || context),

    // Verificaciones de rol específicas (para casos especiales)
    isRole: (role: string) => userRoles.includes(role),
    hasRole: (roles: string[]) => roles.some(role => userRoles.includes(role)),

    // Helpers legacy para compatibilidad temporal
    isManager: () => userRoles.includes(ROLES.MANAGER) || userRoles.includes(ROLES.SUPER_ADMIN),
    isSuperAdmin: () => userRoles.includes(ROLES.SUPER_ADMIN),
    isDriver: () => userRoles.includes(ROLES.DRIVER),
    isDispatcher: () => userRoles.includes(ROLES.DISPATCHER)
  };
}

// ===============================================
// HOOK PARA PERMISOS DE RECURSO ESPECÍFICO
// ===============================================

export function useResourcePermissions(resource: string, customContext?: PermissionContext) {
  const auth = useAuthorization();
  
  return useMemo(() => 
    auth.getPermissions(resource, customContext), 
    [auth, resource, customContext]
  );
}

// ===============================================
// HOOK PARA VERIFICACIÓN SIMPLE
// ===============================================

export function usePermission(resource: string, action: string, customContext?: PermissionContext) {
  const auth = useAuthorization();
  
  return useMemo(() => 
    auth.can(resource, action, customContext),
    [auth, resource, action, customContext]
  );
}