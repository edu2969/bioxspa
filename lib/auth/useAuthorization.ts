/**
 * BIOX - Hooks de Autorización
 * React hooks para manejo de permisos siguiendo mejores prácticas
 */

'use client';

import { useAuth } from '@/context/AuthContext';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  getComponentPermissions,
  ComponentPermissions,
  ROLES
} from './permissions';
import { useMemo } from 'react';
import { USER_ROLE } from '@/app/utils/constants';

const ROLE_BY_USER_ROLE: Record<number, string> = {
  [USER_ROLE.neo]: ROLES.SUPER_ADMIN,
  [USER_ROLE.gerente]: ROLES.MANAGER,
  [USER_ROLE.cobranza]: ROLES.COLLECTIONS,
  [USER_ROLE.despacho]: ROLES.DISPATCHER,
  [USER_ROLE.conductor]: ROLES.DRIVER,
  [USER_ROLE.proveedor]: ROLES.SUPPLIER
};

// ===============================================
// HOOK PRINCIPAL DE AUTORIZACIÓN
// ===============================================

export function useAuthorization() {
  const { user } = useAuth();  

  const userRoles = useMemo(() => {
    if (!user || typeof user.rol !== 'number') {
      return [] as string[];
    }

    const mappedRole = ROLE_BY_USER_ROLE[user.rol];
    return mappedRole ? [mappedRole] : [];
  }, [user]);

  return {
    user,

    // Función principal de verificación de permisos
    can: (resource: string, action: string) => 
      hasPermission(userRoles, resource, action),

    // Verificaciones múltiples
    canAny: (permissions: Array<{ resource: string; action: string }>) =>
      hasAnyPermission(userRoles, permissions),

    canAll: (permissions: Array<{ resource: string; action: string }>) =>
      hasAllPermissions(userRoles, permissions),

    // Helper para obtener permisos de componente
    getPermissions: (resource: string): ComponentPermissions =>
      getComponentPermissions(userRoles, resource),

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

export function useResourcePermissions(resource: string) {
  const auth = useAuthorization();
  
  return useMemo(() => 
    auth.getPermissions(resource), 
    [auth, resource]
  );
}

// ===============================================
// HOOK PARA VERIFICACIÓN SIMPLE
// ===============================================

export function usePermission(resource: string, action: string) {
  const auth = useAuthorization();
  
  return useMemo(() => 
    auth.can(resource, action),
    [auth, resource, action]
  );
}