/**
 * BIOX - Migration Constants and Utilities
 * Constantes y utilidades para la migración MongoDB → Supabase
 */

// ===============================================
// CONFIGURACIÓN DE MIGRACIÓN
// ===============================================

export const MIGRATION_CONFIG = {
  // Flag para habilitar Supabase (forzado)
  USE_SUPABASE: true,
  
  // Tablas ya migradas (todas las tablas están migradas)
  MIGRATED_TABLES: [
    'usuarios',
    'sucursales', 
    'clientes',
    'categorias_catalogo',
    'subcategorias_catalogo',
    'item_catalogo',
    'ventas',
    'cargos',
    'rutas_despacho',
    'checklists',
    'vehiculos',
    'dependencias',
    'direcciones',
    'detalles_venta',
    'precios',
    'comisiones'
  ],
  
  // APIs ya migradas (todos los endpoints deben usar Supabase)
  MIGRATED_APIS: [
    '/api/auth/login',
    '/api/auth/session',
    '/api/auth/register',
    '/api/home',
    '/api/users/checklist'
  ],
  
  // Modo debug para logging
  DEBUG_MODE: process.env.NODE_ENV === 'development'
};

// ===============================================
// MAPEO DE CAMPOS MONGODB → POSTGRESQL
// ===============================================

/**
 * Mapeo de nombres de campos entre MongoDB y PostgreSQL
 */
export const FIELD_MAPPING = {
  // Campos comunes
  '_id': 'id',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  
  // Usuarios
  'name': 'nombre',
  'email': 'email',
  
  // Clientes
  'razonSocial': 'razon_social',
  'limiteCredito': 'limite_credito',
  'diasCredito': 'dias_credito',
  
  // Items
  'itemCatalogoId': 'item_catalogo_id',
  'subcategoriaId': 'subcategoria_id',
  'categoriaId': 'categoria_id',
  
  // Ventas
  'clienteId': 'cliente_id',
  'sucursalId': 'sucursal_id',
  'vendedorId': 'vendedor_id',
  'fechaVenta': 'fecha_venta',
  'fechaEntrega': 'fecha_entrega',
  'valorTotal': 'total',
  'valorNeto': 'subtotal',
  'tipoVenta': 'tipo_venta',
  
  // Rutas
  'choferId': 'conductor_id',
  'vehiculoId': 'vehiculo_id'
};

/**
 * Función para mapear campos de MongoDB a PostgreSQL
 */
export function mapFields(mongoDoc: any): any {
  if (!mongoDoc || typeof mongoDoc !== 'object') return mongoDoc;
  
  const mapped: any = {};
  
  for (const [key, value] of Object.entries(mongoDoc)) {
    const mappedKey = (FIELD_MAPPING as any)[key] || key;
    
    if (value && typeof value === 'object' && value.constructor === Object) {
      mapped[mappedKey] = mapFields(value);
    } else if (Array.isArray(value)) {
      mapped[mappedKey] = value.map(item => 
        typeof item === 'object' ? mapFields(item) : item
      );
    } else {
      mapped[mappedKey] = value;
    }
  }
  
  return mapped;
}

// ===============================================
// UTILIDADES DE LOGGING PARA MIGRACIÓN
// ===============================================

export class MigrationLogger {
  private static prefix = '🔄 [MIGRATION]';
  
  static info(message: string, data?: any) {
    if (MIGRATION_CONFIG.DEBUG_MODE) {
      console.log(`${this.prefix} ${message}`, data || '');
    }
  }
  
  static warning(message: string, data?: any) {
    console.warn(`⚠️ ${this.prefix} WARNING: ${message}`, data || '');
  }
  
  static error(message: string, error?: any) {
    console.error(`❌ ${this.prefix} ERROR: ${message}`, error || '');
  }
  
  static success(message: string, data?: any) {
    if (MIGRATION_CONFIG.DEBUG_MODE) {
      console.log(`✅ ${this.prefix} SUCCESS: ${message}`, data || '');
    }
  }
  
  static performance(operation: string, startTime: number) {
    const duration = Date.now() - startTime;
    this.info(`${operation} completed in ${duration}ms`);
  }
}

// ===============================================
// VALIDADORES PARA DATOS MIGRADOS
// ===============================================

export class MigrationValidators {
  
  /**
   * Validar que un ID sea válido (UUID para Supabase, ObjectId para MongoDB)
   */
  static isValidId(id: any, isSupabase = false): boolean {
    if (!id) return false;
    
    if (isSupabase) {
      // UUID v4 pattern
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    } else {
      // MongoDB ObjectId pattern
      return /^[0-9a-f]{24}$/i.test(id);
    }
  }
  
  /**
   * Validar estructura de usuario
   */
  static validateUser(user: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!user.email) errors.push('Email es requerido');
    if (!user.nombre) errors.push('Nombre es requerido');
    if (user.email && !/\S+@\S+\.\S+/.test(user.email)) {
      errors.push('Email debe tener formato válido');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validar estructura de cliente
   */
  static validateClient(client: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!client.rut) errors.push('RUT es requerido');
    if (!client.razon_social) errors.push('Razón social es requerida');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validar estructura de venta
   */
  static validateSale(sale: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!sale.cliente_id) errors.push('Cliente ID es requerido');
    if (!sale.sucursal_id) errors.push('Sucursal ID es requerida');
    if (!sale.total || sale.total <= 0) errors.push('Total debe ser mayor a 0');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ===============================================
// HELPERS PARA TRANSICIONES GRADUALES
// ===============================================

export class GradualMigration {
  
  /**
   * Ejecutar operación con fallback automático
   */
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      MigrationLogger.info(`Attempting ${operationName} with primary system`);
      const result = await primaryOperation();
      MigrationLogger.success(`${operationName} successful with primary system`);
      return result;
    } catch (error) {
      MigrationLogger.warning(`${operationName} failed with primary system, using fallback`, error);
      try {
        const result = await fallbackOperation();
        MigrationLogger.success(`${operationName} successful with fallback system`);
        return result;
      } catch (fallbackError) {
        MigrationLogger.error(`${operationName} failed with both systems`, {
          primaryError: error,
          fallbackError
        });
        throw fallbackError;
      }
    }
  }
  
  /**
   * Verificar si una tabla/API debe usar Supabase
   */
  static shouldUseSupabase(tableName: string, apiPath?: string): boolean {
    // Forzar uso de Supabase para todas las operaciones
    return true;
  }
  
  /**
   * Wrap para decisiones de routing entre sistemas
   */
  static async routeOperation<T>(
    tableName: string,
    supabaseOperation: () => Promise<T>,
    mongoOperation: () => Promise<T>,
    apiPath?: string
  ): Promise<T> {
    const useSupabase = this.shouldUseSupabase(tableName, apiPath);
    
    if (useSupabase) {
      MigrationLogger.info(`Using Supabase for ${tableName}${apiPath ? ` (${apiPath})` : ''}`);
      return await supabaseOperation();
    } else {
      MigrationLogger.info(`Using MongoDB for ${tableName}${apiPath ? ` (${apiPath})` : ''}`);
      return await mongoOperation();
    }
  }
}

// ===============================================
// CONSTANTES DE ESTADO DE MIGRACIÓN
// ===============================================

export const MIGRATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLBACK: 'rollback'
} as const;

export type MigrationStatus = typeof MIGRATION_STATUS[keyof typeof MIGRATION_STATUS];

// ===============================================
// EXPORT DEFAULT
// ===============================================

export default {
  MIGRATION_CONFIG,
  FIELD_MAPPING,
  mapFields,
  MigrationLogger,
  MigrationValidators,
  GradualMigration,
  MIGRATION_STATUS
};