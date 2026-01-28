/**
 * BIOX - Supabase Migration Helpers
 * Funciones helper para migración gradual de MongoDB → Supabase
 */

import { supabase, supabaseAdmin } from './supabase';
import { NextRequest, NextResponse } from 'next/server';
import { TIPO_CARGO } from '@/app/utils/constants';
import { MigrationLogger } from './migration-utils';

// Re-export for convenience
export { MigrationLogger } from './migration-utils';

// ===============================================
// REEMPLAZO DE connectMongoDB()
// ===============================================

/**
 * Reemplaza await connectMongoDB()
 * En Supabase no necesitamos conexión explícita
 */
export async function connectSupabase() {
  // No es necesario conectar explícitamente en Supabase
  // Pero podemos hacer una verificación de salud si es necesario
  try {
    const { data, error } = await supabase.auth.getSession();
    return { connected: true, error: null };
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return { connected: false, error };
  }
}

// ===============================================
// REEMPLAZO DE verificarAutorizacion()
// ===============================================

export interface AuthResult {
  authorized: boolean;
  user?: any;
  cargo?: any;
  error?: string;
}

/**
 * Reemplaza la función verificarAutorizacion de MongoDB
 * Utiliza Supabase Auth + RLS policies automáticas
 */
export async function verificarAutorizacionSupabase(
  rolesPermitidos?: number[]
): Promise<AuthResult> {
  try {
    // Obtener usuario actual de Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        authorized: false,
        error: 'No authenticated user'
      };
    }

    // Obtener información del usuario y sus cargos
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select(`
        *,
        cargos (
          tipo,
          sucursal_id,
          dependencia_id,
          desde,
          hasta,
          sucursales (id, nombre, codigo)
        )
      `)
      .eq('id', user.id)
      .is('cargos.hasta', null) // Solo cargos activos
      .single();

    if (userError || !usuario) {
      return {
        authorized: false,
        error: 'Usuario no encontrado en sistema'
      };
    }

    // Si no hay roles específicos requeridos, autorizar
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return {
        authorized: true,
        user,
        cargo: usuario.cargos?.[0]
      };
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const tieneRolPermitido = usuario.cargos?.some(
      (cargo: any) => rolesPermitidos.includes(cargo.tipo)
    );

    if (!tieneRolPermitido) {
      return {
        authorized: false,
        error: 'Usuario no tiene permisos suficientes'
      };
    }

    return {
      authorized: true,
      user,
      cargo: usuario.cargos?.[0]
    };

  } catch (error) {
    console.error('Error en verificarAutorizacionSupabase:', error);
    return {
      authorized: false,
      error: 'Error interno de autorización'
    };
  }
}

// ===============================================
// WRAPPERS PARA OPERACIONES CRUD COMUNES
// ===============================================

/**
 * Wrapper para operaciones SELECT con RLS automático
 */
export class SupabaseQuery {
  
  static async findById(table: string, id: string, select = '*') {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single();
    
    return { data, error };
  }

  static async findMany(
    table: string, 
    filters: Record<string, any> = {}, 
    select = '*',
    orderBy?: { column: string; ascending?: boolean }
  ) {
    let query = supabase.from(table).select(select);
    
    // Aplicar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });

    // Aplicar ordenamiento
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data, error } = await query;
    return { data, error };
  }

  static async create(table: string, data: any) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    return { data: result, error };
  }

  static async update(table: string, id: string, data: any) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    return { data: result, error };
  }

  static async delete(table: string, id: string) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    return { error };
  }
}

// ===============================================
// FUNCIONES ESPECÍFICAS DEL NEGOCIO
// ===============================================

/**
 * Obtener sucursales accesibles para el usuario actual
 */
export async function getSucursalesAccesibles() {
  const auth = await verificarAutorizacionSupabase();
  if (!auth.authorized || !auth.cargo) {
    return { data: [], error: 'No autorizado' };
  }

  // Los gerentes ven todas las sucursales
  if (auth.cargo.tipo === TIPO_CARGO.gerente) {
    return await SupabaseQuery.findMany('sucursales', { activa: true });
  }

  // Otros usuarios solo ven su sucursal
  return await SupabaseQuery.findMany('sucursales', { 
    id: auth.cargo.sucursal_id,
    activa: true 
  });
}

/**
 * Obtener clientes con filtros de autorización
 */
export async function getClientesAutorizados(filtros: any = {}) {
  // RLS automáticamente filtra según permisos del usuario
  return await SupabaseQuery.findMany('clientes', {
    activo: true,
    ...filtros
  });
}

/**
 * Obtener inventario según permisos del usuario
 */
export async function getInventarioAccesible(sucursalId?: string) {
  const filtros: any = { activo: true };
  
  if (sucursalId) {
    filtros.sucursal_id = sucursalId;
  }

  return await SupabaseQuery.findMany('item_catalogo', filtros, `
    *,
    categoria:categorias_catalogo(nombre),
    subcategoria:subcategorias_catalogo(nombre),
    sucursal:sucursales(nombre, codigo)
  `);
}

// ===============================================
// UTILIDADES PARA MIGRACIÓN GRADUAL
// ===============================================

/**
 * Wrapper que permite usar tanto MongoDB como Supabase
 * durante la transición gradual
 */
export class MigrationHelper {
  private static useSupabase = process.env.USE_SUPABASE === 'true';

  static async executeQuery(
    mongoOperation: () => Promise<any>,
    supabaseOperation: () => Promise<any>
  ) {
    if (this.useSupabase) {
      console.log('🔄 Using Supabase');
      return await supabaseOperation();
    } else {
      console.log('🔄 Using MongoDB (legacy)');
      return await mongoOperation();
    }
  }

  static async withAuth<T>(
    operation: (auth: AuthResult) => Promise<T>,
    rolesPermitidos?: number[]
  ): Promise<{ data?: T; error?: string; status: number }> {
    try {
      const auth = await verificarAutorizacionSupabase(rolesPermitidos);
      
      if (!auth.authorized) {
        return {
          error: auth.error || 'No autorizado',
          status: 401
        };
      }

      const data = await operation(auth);
      return { data, status: 200 };

    } catch (error) {
      console.error('Error in withAuth:', error);
      return {
        error: 'Error interno del servidor',
        status: 500
      };
    }
  }
}

// ===============================================
// HELPERS PARA API ROUTES
// ===============================================

/**
 * Helper para crear API routes con autorización automática
 */
export function createAuthorizedRoute(
  handler: (req: NextRequest, auth: AuthResult) => Promise<NextResponse>,
  rolesPermitidos?: number[]
) {
  return async (req: NextRequest) => {
    const auth = await verificarAutorizacionSupabase(rolesPermitidos);
    
    if (!auth.authorized) {
      return NextResponse.json(
        { ok: false, error: auth.error || 'No autorizado' },
        { status: 401 }
      );
    }

    try {
      return await handler(req, auth);
    } catch (error) {
      console.error('Error in authorized route:', error);
      return NextResponse.json(
        { ok: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper para respuestas consistentes
 */
export class APIResponse {
  static success(data: any, message?: string) {
    return NextResponse.json({
      ok: true,
      data,
      message
    });
  }

  static error(error: string, status = 400, details?: any) {
    return NextResponse.json({
      ok: false,
      error,
      details
    }, { status });
  }

  static unauthorized(error = 'No autorizado') {
    return NextResponse.json({
      ok: false,
      error
    }, { status: 401 });
  }

  static notFound(error = 'Recurso no encontrado') {
    return NextResponse.json({
      ok: false,
      error
    }, { status: 404 });
  }
}

// ===============================================
// QUERIES ESPECÍFICAS DE BIOX
// ===============================================

/**
 * Queries específicas del dominio de BIOX
 */
export const BioxQueries = {
  
  // Obtener resumen de deudas por cliente
  async getResumenDeudas(clienteId?: string, sucursalId?: string) {
    let query = supabase
      .from('mv_resumen_deudas_clientes')
      .select('*');

    if (clienteId) query = query.eq('cliente_id', clienteId);
    if (sucursalId) query = query.eq('sucursal_id', sucursalId);

    return await query;
  },

  // Obtener inventario en tiempo real
  async getInventarioTiempoReal(sucursalId?: string) {
    let query = supabase
      .from('mv_inventario_tiempo_real')
      .select('*');

    if (sucursalId) query = query.eq('sucursal_id', sucursalId);

    return await query;
  },

  // Obtener rutas de despacho activas
  async getRutasDespachoActivas() {
    return await supabase
      .from('rutas_despacho')
      .select(`
        *,
        conductor:usuarios(nombre),
        vehiculo:vehiculos(patente, marca, modelo),
        ventas_ruta:ventas(
          id, numero_venta, total,
          cliente:clientes(nombre, rut)
        )
      `)
      .in('estado', [1, 2, 4]); // Estados activos
  },

  // Obtener pedidos pendientes de despacho
  async getPedidosPendientes(sucursalId?: string) {
    let query = supabase
      .from('ventas')
      .select(`
        *,
        cliente:clientes(nombre, rut, telefono),
        detalles_venta(
          cantidad, precio_unitario,
          item:item_catalogo(nombre, codigo)
        )
      `)
      .eq('estado', 'CONFIRMADA');

    if (sucursalId) query = query.eq('sucursal_id', sucursalId);

    return await query;
  }
};

export default {
  connectSupabase,
  verificarAutorizacionSupabase,
  SupabaseQuery,
  MigrationHelper,
  createAuthorizedRoute,
  APIResponse,
  BioxQueries,
  getSucursalesAccesibles,
  getClientesAutorizados,
  getInventarioAccesible
};