/**
 * BIOX - Supabase Client Configuration
 * Configuración centralizada del cliente de Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
}

// Cliente principal (client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    },
    global: {
        headers: {
            'x-client-info': 'biox-spa'
        }
    },
    db: {
        schema: 'public'
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Cliente con service role para operaciones administrativas (solo server-side)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin should only be used on the server side');
  }
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// For backwards compatibility, but only initialize on server-side
export const supabaseAdmin = typeof window === 'undefined' ? getSupabaseAdmin() : (null as any);

// Tipos TypeScript para las tablas principales
export interface Usuario {
    id: string;
    email: string;
    nombre: string;
    telefono?: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Cliente {
    id: string;
    rut: string;
    razon_social: string;
    email?: string;
    telefono?: string;
    direccion_facturacion: string;
    ciudad: string;
    region_id: string;
    limite_credito?: number;
    dias_credito?: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Sucursal {
    id: string;
    codigo: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    region_id: string;
    telefono?: string;
    email?: string;
    activa: boolean;
    created_at: string;
    updated_at: string;
}

export interface ItemCatalogo {
    id: string;
    codigo: string;
    nombre: string;
    categoria_id: string;
    subcategoria_id?: string;
    precio_base: number;
    stock_actual: number;
    stock_minimo: number;
    ubicacion?: string;
    sucursal_id: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Venta {
    id: string;
    numero_venta: number;
    cliente_id: string;
    sucursal_id: string;
    vendedor_id: string;
    fecha_venta: string;
    subtotal: number;
    impuestos: number;
    descuentos: number;
    total: number;
    estado: 'PENDIENTE' | 'CONFIRMADA' | 'EN_PREPARACION' | 'DESPACHADA' | 'ENTREGADA' | 'CANCELADA';
    tipo_venta: 'CONTADO' | 'CREDITO' | 'CONSIGNACION';
    observaciones?: string;
    created_at: string;
    updated_at: string;
}

export interface BIDeuda {
    id: string;
    tipo_periodo: 'D' | 'S' | 'M' | 'A';
    periodo: string;
    sucursal_id: string;
    cliente_id?: string;
    total_deuda: number;
    dias_promedio_atraso: number;
    ventas_involucradas: number;
    fecha_vencimiento_mas_antigua: string;
    deuda_0_30: number;
    deuda_31_60: number;
    deuda_61_90: number;
    deuda_90_mas: number;
    created_at: string;
    updated_at: string;
}

export interface Cargo {
    id: string;
    usuario_id: string;
    tipo: number;
    sucursal_id?: string;
    dependencia_id?: string;
    desde: string;
    hasta?: string;
    created_at: string;
    updated_at: string;
}

export interface RutaDespacho {
    id: string;
    codigo: string;
    fecha: string;
    conductor_id: string;
    vehiculo_id?: string;
    estado: number;
    origen_id: string;
    destino_id?: string;
    created_at: string;
    updated_at: string;
}

export interface DetalleVenta {
    id: string;
    venta_id: string;
    item_id: string;
    cantidad: number;
    precio_unitario: number;
    descuento: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
}

// Utilidades para queries comunes
export const supabaseQueries = {
    // Obtener usuario actual con sus cargos
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select(`
                *,
                cargos (
                    tipo,
                    sucursal_id,
                    dependencia_id,
                    desde,
                    hasta,
                    sucursales (nombre, codigo)
                )
            `)
            .eq('id', user.id)
            .is('cargos.hasta', null)
            .single();

        return { user, usuario, error };
    },

    // Verificar permisos de usuario
    async checkUserPermissions(requiredRoles: number[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('cargos')
            .select('tipo')
            .eq('usuario_id', user.id)
            .in('tipo', requiredRoles)
            .is('hasta', null);

        return data && data.length > 0;
    },

    // Obtener sucursales accesibles para el usuario actual
    async getAccessibleSucursales() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // RLS automáticamente filtra según permisos
        const { data } = await supabase
            .from('sucursales')
            .select('*')
            .eq('activa', true);

        return data || [];
    },

    // Función para refresh de vistas materializadas
    async refreshMaterializedViews() {
        const { data, error } = await supabaseAdmin.rpc('refresh_materialized_views');
        return { data, error };
    },

    // Verificar estado de la conexión
    async checkConnection() {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id')
                .limit(1);
            return { connected: !error, error };
        } catch (error) {
            return { connected: false, error };
        }
    }
};

export default supabase;