/**
 * BIOX - Ejemplo de API con Autorización
 * Demuestra cómo usar el nuevo sistema de permisos en endpoints
 */

import { NextRequest } from 'next/server';
import { withAuthorization } from '@/lib/auth/apiAuthorization';
import { RESOURCES, ACTIONS } from '@/lib/auth/permissions';
import { supabase } from '@/lib/supabase';

// ===============================================
// HANDLER CON AUTORIZACIÓN
// ===============================================

async function pedidosHandler(req: NextRequest, user: any) {
  const method = req.method;

  switch (method) {
    case 'GET':
      return await getPedidos(req, user);
    case 'POST':
      return await createPedido(req, user);
    default:
      return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }
}

// ===============================================
// OBTENER PEDIDOS CON FILTROS CONTEXTUALES
// ===============================================

async function getPedidos(req: NextRequest, user: any) {
  try {
    let query = supabase.from('pedidos').select(`
      id,
      numero,
      fecha_pedido,
      estado,
      total,
      cliente:clientes(id, razon_social),
      sucursal:sucursales(id, nombre)
    `);

    // Aplicar filtros según el rol del usuario
    if (!user.roles.includes('super_admin') && !user.roles.includes('manager')) {
      // Usuarios no-administrativos solo ven pedidos de su sucursal
      if (user.context.sucursalId) {
        query = query.eq('sucursal_id', user.context.sucursalId);
      }
    }

    // Filtros adicionales desde query params
    const url = new URL(req.url);
    const estado = url.searchParams.get('estado');
    const clienteId = url.searchParams.get('cliente_id');
    
    if (estado) {
      query = query.eq('estado', estado);
    }
    
    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data: pedidos, error } = await query.order('fecha_pedido', { ascending: false });

    if (error) {
      console.error('Error fetching pedidos:', error);
      return Response.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

    return Response.json({ 
      ok: true, 
      data: pedidos,
      meta: {
        userContext: {
          canCreate: user.roles.some((role: string) => ['manager', 'branch_manager', 'supervisor'].includes(role)),
          canApprove: user.roles.some((role: string) => ['manager', 'branch_manager'].includes(role)),
          sucursalId: user.context.sucursalId
        }
      }
    });

  } catch (error) {
    console.error('Error in getPedidos:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ===============================================
// CREAR PEDIDO
// ===============================================

async function createPedido(req: NextRequest, user: any) {
  try {
    const body = await req.json();
    
    // Validaciones de negocio
    if (!body.cliente_id || !body.items || body.items.length === 0) {
      return Response.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Forzar sucursal del usuario si no es admin
    if (!user.roles.includes('super_admin') && !user.roles.includes('manager')) {
      body.sucursal_id = user.context.sucursalId;
    }

    // Agregar datos de auditoría
    body.created_by = user.id;
    body.created_at = new Date().toISOString();

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Error creating pedido:', error);
      return Response.json({ error: 'Error al crear pedido' }, { status: 500 });
    }

    return Response.json({ 
      ok: true, 
      data: pedido,
      message: 'Pedido creado exitosamente'
    });

  } catch (error) {
    console.error('Error in createPedido:', error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ===============================================
// EXPORTS CON AUTORIZACIÓN
// ===============================================

// GET - Leer pedidos
export const GET = withAuthorization(pedidosHandler, {
  resource: RESOURCES.PEDIDOS,
  action: ACTIONS.READ,
  requireContext: true
});

// POST - Crear pedidos  
export const POST = withAuthorization(pedidosHandler, {
  resource: RESOURCES.PEDIDOS,
  action: ACTIONS.CREATE,
  requireContext: true
});