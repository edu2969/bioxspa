/**
 * EJEMPLO DE MIGRACIÓN: API para actualizar crédito disponible de cliente
 * ANTES: MongoDB + Mongoose
 * DESPUÉS: Supabase + RLS automático
 */

import { NextRequest } from "next/server";
import { 
  verificarAutorizacionSupabase, 
  SupabaseQuery, 
  createAuthorizedRoute,
  APIResponse,
  MigrationHelper
} from "@/lib/supabase-helpers";
import { connectMongoDB } from "@/lib/mongodb";
import { TIPO_CARGO } from "@/app/utils/constants";
import { MigrationLogger, GradualMigration } from "@/lib/migration-utils";
import Cliente from "@/models/cliente"; // MongoDB model (para fallback)

// ===============================================
// VERSIÓN MIGRADA CON SUPABASE
// ===============================================

/**
 * Operación con Supabase (nuevo sistema)
 */
async function updateCreditoSupabase(clienteId: string, credito: number) {
  MigrationLogger.info('Updating cliente credit with Supabase', { clienteId, credito });
  
  // RLS automáticamente verifica permisos
  const { data, error } = await SupabaseQuery.update('clientes', clienteId, {
    limite_credito: credito,
    updated_at: new Date().toISOString()
  });

  if (error) {
    MigrationLogger.error('Failed to update credit in Supabase', error);
    throw new Error(error.message);
  }

  MigrationLogger.success('Credit updated successfully in Supabase');
  return data;
}

/**
 * Operación con MongoDB (sistema legacy)
 */
async function updateCreditoMongoDB(clienteId: string, credito: number) {
  MigrationLogger.info('Updating cliente credit with MongoDB', { clienteId, credito });
  
  await connectMongoDB();
  
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) {
    throw new Error("Cliente no encontrado");
  }

  cliente.credito = credito;
  await cliente.save();

  MigrationLogger.success('Credit updated successfully in MongoDB');
  return cliente;
}

// ===============================================
// HANDLER PRINCIPAL CON MIGRACIÓN GRADUAL
// ===============================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { clienteId, credito } = body;

    // Validación de entrada
    if (!clienteId || typeof credito !== "number") {
      return APIResponse.error("Datos inválidos: clienteId y credito son requeridos");
    }

    if (credito < 0) {
      return APIResponse.error("El crédito no puede ser negativo");
    }

    // Verificar autorización (solo gerentes y encargados pueden modificar créditos)
    const auth = await verificarAutorizacionSupabase([
      TIPO_CARGO.gerente,
      TIPO_CARGO.encargado
    ]);

    if (!auth.authorized) {
      return APIResponse.unauthorized(auth.error);
    }

    // Ejecutar operación con migración gradual
    const cliente = await GradualMigration.routeOperation(
      'clientes',
      () => updateCreditoSupabase(clienteId, credito),
      () => updateCreditoMongoDB(clienteId, credito),
      '/api/clientes/creditos/nuevoDisponible'
    );

    MigrationLogger.performance('Update cliente credit', startTime);
    
    return APIResponse.success({
      cliente_id: clienteId,
      nuevo_credito: credito,
      timestamp: new Date().toISOString()
    }, 'Crédito actualizado exitosamente');

  } catch (error) {
    MigrationLogger.error('Error updating cliente credit', error);
    
    return APIResponse.error(
      "Error interno del servidor",
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
}

// ===============================================
// VERSIÓN ALTERNATIVA CON HELPER SIMPLIFICADO
// ===============================================

/**
 * Versión más simple usando createAuthorizedRoute
 */
export const POSTSimple = createAuthorizedRoute(
  async (req: NextRequest, auth) => {
    const { clienteId, credito } = await req.json();
    
    if (!clienteId || typeof credito !== "number") {
      return APIResponse.error("Datos inválidos");
    }

    // Usar MigrationHelper para transición gradual
    const result = await MigrationHelper.executeQuery(
      // Operación MongoDB
      async () => {
        await connectMongoDB();
        const cliente = await Cliente.findById(clienteId);
        if (!cliente) throw new Error("Cliente no encontrado");
        cliente.credito = credito;
        await cliente.save();
        return cliente;
      },
      // Operación Supabase
      async () => {
        const { data, error } = await SupabaseQuery.update('clientes', clienteId, {
          limite_credito: credito
        });
        if (error) throw new Error(error.message);
        return data;
      }
    );

    return APIResponse.success({
      cliente_id: clienteId,
      nuevo_credito: credito
    });
  },
  [TIPO_CARGO.gerente, TIPO_CARGO.encargado] // Roles permitidos
);

// ===============================================
// EJEMPLO DE USO DESDE EL FRONTEND
// ===============================================

/**
 * Ejemplo de cómo llamar esta API desde el frontend:
 * 
 * const actualizarCredito = async (clienteId: string, credito: number) => {
 *   try {
 *     const response = await fetch('/api/clientes/creditos/nuevoDisponible', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify({ clienteId, credito })
 *     });
 * 
 *     const result = await response.json();
 * 
 *     if (!result.ok) {
 *       throw new Error(result.error);
 *     }
 * 
 *     return result.data;
 *   } catch (error) {
 *     console.error('Error actualizando crédito:', error);
 *     throw error;
 *   }
 * };
 */