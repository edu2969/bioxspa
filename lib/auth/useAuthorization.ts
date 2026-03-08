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
  ComponentPermissions
} from './permissions';
import { useMemo } from 'react';
import { TIPO_CARGO } from '@/app/utils/constants';

// ===============================================
// HOOK PRINCIPAL DE AUTORIZACIÓN
// ===============================================

export function useAuthorization() {
  const { user, cargos, hasCargoType, hasCargo } = useAuth();  

  const userRoles = useMemo(() => {
    if (!cargos || cargos.length === 0) {
      return [] as number[];
    }

    // Retornar directamente los valores numéricos de los TIPO_CARGO del usuario
    return cargos.map(cargo => cargo.tipo);
  }, [cargos]);

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

    // Verificaciones de rol específicas usando valores numéricos
    isRole: (roleValue: number) => userRoles.includes(roleValue),
    hasRole: (roleValues: number[]) => roleValues.some(role => userRoles.includes(role)),
    hasCargoType: (cargoType: number) => hasCargoType(cargoType),
    hasCargo: (cargoTypes: number[]) => hasCargo(cargoTypes),

    // Helpers específicos para roles comunes
    isGerente: () => userRoles.includes(TIPO_CARGO.gerente),
    isNeo: () => userRoles.includes(TIPO_CARGO.neo),
    isConductor: () => userRoles.includes(TIPO_CARGO.conductor),
    isDespacho: () => userRoles.includes(TIPO_CARGO.despacho),
    isCobranza: () => userRoles.includes(TIPO_CARGO.cobranza),
    isEncargado: () => userRoles.includes(TIPO_CARGO.encargado),
    isResponsable: () => userRoles.includes(TIPO_CARGO.responsable),
    isProveedor: () => userRoles.includes(TIPO_CARGO.proveedor),

    // Helper para obtener todos los cargos del usuario
    getUserCargos: () => cargos || []
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