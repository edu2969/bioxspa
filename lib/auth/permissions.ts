/**
 * BIOX - Sistema de Permisos y Autorización
 * Implementación de mejores prácticas de clase mundial
 */

// ===============================================
// DEFINICIÓN DE RECURSOS Y ACCIONES
// ===============================================

export const RESOURCES = {
  PEDIDOS: 'pedidos',
  CLIENTES: 'clientes',
  INVENTARIO: 'inventario',
  RUTAS: 'rutas',
  REPORTES: 'reportes',
  CONFIGURACION: 'configuracion',
  USUARIOS: 'usuarios',
  FACTURACION: 'facturacion',
  PRECIOS: 'precios',
  FLOTA: 'flota'
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  ASSIGN: 'assign',
  EXECUTE: 'execute'
} as const;

// ===============================================
// ROLES SEMÁNTICOS (Reemplaza números mágicos)
// ===============================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',      // NeO - acceso total
  MANAGER: 'manager',              // Gerente
  COLLECTIONS: 'collections',      // Cobranza
  BRANCH_MANAGER: 'branch_manager', // Encargado
  SUPERVISOR: 'supervisor',        // Responsable
  DISPATCHER: 'dispatcher',        // Despacho
  DRIVER: 'driver',               // Conductor
  SUPPLIER: 'supplier',           // Proveedor
  GUEST: 'guest'                  // Invitado
} as const;

// ===============================================
// MAPEO LEGACY (Para compatibilidad temporal)
// ===============================================

export const ROLE_MAPPING = {
  [ROLES.SUPER_ADMIN]: 2969,
  [ROLES.MANAGER]: 1,
  [ROLES.COLLECTIONS]: 2,
  [ROLES.BRANCH_MANAGER]: 8,
  [ROLES.SUPERVISOR]: 9,
  [ROLES.DISPATCHER]: 16,
  [ROLES.DRIVER]: 32,
  [ROLES.SUPPLIER]: 64,
  [ROLES.GUEST]: 128
} as const;

// ===============================================
// DEFINICIÓN DE PERMISOS POR ROL
// ===============================================

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // Acceso total a todo
    `${RESOURCES.PEDIDOS}:*`,
    `${RESOURCES.CLIENTES}:*`,
    `${RESOURCES.INVENTARIO}:*`,
    `${RESOURCES.RUTAS}:*`,
    `${RESOURCES.REPORTES}:*`,
    `${RESOURCES.CONFIGURACION}:*`,
    `${RESOURCES.USUARIOS}:*`,
    `${RESOURCES.FACTURACION}:*`,
    `${RESOURCES.PRECIOS}:*`
  ],

  [ROLES.MANAGER]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.APPROVE}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.READ}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.UPDATE}`,
    `${RESOURCES.REPORTES}:${ACTIONS.READ}`,
    `${RESOURCES.CONFIGURACION}:${ACTIONS.READ}`,
    `${RESOURCES.USUARIOS}:${ACTIONS.READ}`,
    `${RESOURCES.PRECIOS}:${ACTIONS.READ}` // Permitir que MANAGER lea precios
  ],

  [ROLES.COLLECTIONS]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.CREATE}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.UPDATE}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.READ}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.UPDATE}`,
    `${RESOURCES.REPORTES}:${ACTIONS.READ}`,
    `${RESOURCES.PRECIOS}:${ACTIONS.READ}`,
  ],

  [ROLES.BRANCH_MANAGER]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.CREATE}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.UPDATE}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.ASSIGN}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.READ}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.CREATE}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.UPDATE}`,
    `${RESOURCES.INVENTARIO}:${ACTIONS.READ}`,
    `${RESOURCES.RUTAS}:${ACTIONS.READ}`,
    `${RESOURCES.RUTAS}:${ACTIONS.ASSIGN}`
  ],

  [ROLES.SUPERVISOR]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.CREATE}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.UPDATE}`,
    `${RESOURCES.CLIENTES}:${ACTIONS.READ}`,
    `${RESOURCES.INVENTARIO}:${ACTIONS.READ}`
  ],

  [ROLES.DISPATCHER]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.ASSIGN}`,
    `${RESOURCES.RUTAS}:${ACTIONS.READ}`,
    `${RESOURCES.RUTAS}:${ACTIONS.CREATE}`,
    `${RESOURCES.RUTAS}:${ACTIONS.ASSIGN}`,
    `${RESOURCES.INVENTARIO}:${ACTIONS.READ}`
  ],

  [ROLES.DRIVER]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.PEDIDOS}:${ACTIONS.EXECUTE}`,
    `${RESOURCES.RUTAS}:${ACTIONS.READ}`,
    `${RESOURCES.RUTAS}:${ACTIONS.EXECUTE}`,
    `${RESOURCES.FLOTA}:${ACTIONS.READ}`,
  ],

  [ROLES.SUPPLIER]: [
    `${RESOURCES.PEDIDOS}:${ACTIONS.READ}`,
    `${RESOURCES.INVENTARIO}:${ACTIONS.READ}`
  ],

  [ROLES.GUEST]: [
    // Solo lectura muy limitada
  ]
} as const;

// ===============================================
// CONTEXTO PARA PERMISOS DINÁMICOS
// ===============================================

export interface PermissionContext {
  userId: string;
  resourceId?: string;
  metadata?: Record<string, string>;
}

// ===============================================
// FUNCIONES DE VERIFICACIÓN DE PERMISOS
// ===============================================

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(
  userRoles: string[],
  resource: string,
  action: string
): boolean {
  if (!resource || !action) {
    console.warn("Resource or action is undefined", { resource, action });
    return false; // Retornar falso si los valores son inválidos
  }

  // Verificar permisos por rol
  const hasRolePermission = userRoles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    return rolePermissions.some(permission => {
      const [permResource, permAction] = permission.split(':');
      return (permResource === resource && (permAction === action || permAction === '*'));
    });
  });

  return hasRolePermission;
}

/**
 * Obtiene todos los permisos de un usuario
 */
export function getUserPermissions(userRoles: string[]): string[] {
  const permissions = new Set<string>();
  
  userRoles.forEach(role => {
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    rolePermissions.forEach(permission => permissions.add(permission));
  });

  return Array.from(permissions);
}

/**
 * Verifica múltiples permisos
 */
export function hasAnyPermission(
  userRoles: string[],
  requiredPermissions: Array<{ resource: string; action: string }>
): boolean {
  return requiredPermissions.some(({ resource, action }) => 
    hasPermission(userRoles, resource, action)
  );
}

/**
 * Verifica todos los permisos requeridos
 */
export function hasAllPermissions(
  userRoles: string[],
  requiredPermissions: Array<{ resource: string; action: string }>
): boolean {
  return requiredPermissions.every(({ resource, action }) => 
    hasPermission(userRoles, resource, action)
  );
}

// ===============================================
// HELPERS PARA COMPONENTES
// ===============================================

/**
 * Hook para componentes React que necesitan verificar permisos
 */
export interface ComponentPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canAssign: boolean;
  canExecute: boolean;
}

export function getComponentPermissions(
  userRoles: string[],
  resource: string
): ComponentPermissions {
  return {
    canView: hasPermission(userRoles, resource, ACTIONS.READ),
    canCreate: hasPermission(userRoles, resource, ACTIONS.CREATE),
    canEdit: hasPermission(userRoles, resource, ACTIONS.UPDATE),
    canDelete: hasPermission(userRoles, resource, ACTIONS.DELETE),
    canApprove: hasPermission(userRoles, resource, ACTIONS.APPROVE),
    canAssign: hasPermission(userRoles, resource, ACTIONS.ASSIGN),
    canExecute: hasPermission(userRoles, resource, ACTIONS.EXECUTE)
  };
}