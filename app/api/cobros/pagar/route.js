import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/cobros/pagar/route.js

export async function POST(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log("Usuario autenticado:", user.id);

        const body = await request.json();
        console.log("Body recibido:", body);

        const { ventas, formaPagoId, numeroDocumento, fecha, adjuntoUrls = [] } = body;

        if (!Array.isArray(ventas) || !formaPagoId || !fecha || !numeroDocumento) {
            console.error("Datos inválidos:", { ventas, formaPagoId, fecha, numeroDocumento });
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        let pagosCreados = [];
        let ventasActualizadas = [];
        let historialEstados = [];

        for (const ventaObj of ventas) {
            const ventaId = ventaObj._id;
            const pagoMonto = parseFloat(ventaObj.monto);

            console.log(`Procesando venta: ${ventaId}, monto: ${pagoMonto}`);

            // Obtener la venta actual
            const { data: venta, error: ventaError } = await supabase
                .from("ventas")
                .select("id, saldo, valor_total, estado, por_cobrar")
                .eq("id", ventaId)
                .single();

            if (ventaError || !venta) {
                console.warn(`Venta no encontrada: ${ventaId}`, ventaError);
                continue;
            }

            // Ajustar saldo
            const saldoActual = parseFloat(venta.saldo) || parseFloat(venta.valor_total) || 0;
            let nuevoSaldo = saldoActual - pagoMonto;
            if (nuevoSaldo < 0) nuevoSaldo = 0;

            // Determinar estado y porCobrar
            let nuevoEstado = venta.estado;
            let nuevoPorCobrar = venta.por_cobrar;

            if (nuevoSaldo === 0) {
                nuevoEstado = TIPO_ESTADO_VENTA.pagado;
                nuevoPorCobrar = false;
            } else if (nuevoSaldo > 0) {
                nuevoEstado = venta.estado; // Mantener estado actual
                nuevoPorCobrar = true;
            }

            console.log(`Actualizando venta ${ventaId}: saldo=${nuevoSaldo}, estado=${nuevoEstado}, porCobrar=${nuevoPorCobrar}`);

            // Actualizar la venta
            const { error: updateError } = await supabase
                .from("ventas")
                .update({
                    saldo: nuevoSaldo,
                    estado: nuevoEstado,
                    por_cobrar: nuevoPorCobrar,
                    updated_at: new Date().toISOString()
                })
                .eq("id", ventaId);

            if (updateError) {
                console.error(`Error actualizando venta ${ventaId}:`, updateError);
                continue;
            }

            ventasActualizadas.push({
                id: ventaId,
                saldo: nuevoSaldo,
                estado: nuevoEstado,
                por_cobrar: nuevoPorCobrar
            });

            // Agregar historial de estado si cambió
            if (nuevoEstado !== venta.estado) {
                historialEstados.push({
                    venta_id: ventaId,
                    estado: nuevoEstado,
                    usuario_id: user.id,
                    comentario: `Pago registrado - Documento: ${numeroDocumento}`
                });
            }

            // Preparar registro de pago
            pagosCreados.push({
                venta_id: ventaId,
                forma_pago_id: formaPagoId,
                monto: pagoMonto,
                fecha: fecha,
                numero_comprobante: numeroDocumento,
                observaciones: adjuntoUrls.length > 0 ? `Adjuntos: ${adjuntoUrls.join(', ')}` : null,
                usuario_registro_id: user.id
            });
        }

        // Insertar todos los pagos
        if (pagosCreados.length > 0) {
            console.log("Insertando pagos:", pagosCreados);
            const { data: pagosInsertados, error: pagosError } = await supabase
                .from("pagos")
                .insert(pagosCreados)
                .select();

            if (pagosError) {
                console.error("Error insertando pagos:", pagosError);
                return NextResponse.json({ error: "Error al registrar pagos" }, { status: 500 });
            }

            console.log("Pagos insertados:", pagosInsertados);
        }

        // Insertar historial de estados
        if (historialEstados.length > 0) {
            const { error: historialError } = await supabase
                .from("venta_historial_estados")
                .insert(historialEstados);

            if (historialError) {
                console.error("Error insertando historial de estados:", historialError);
                // No retornamos error aquí porque el pago ya se procesó
            }
        }

        console.log("Pagos registrados correctamente");
        return NextResponse.json({ 
            ok: true,
            message: "Pagos registrados", 
            pagos: pagosCreados,
            ventasActualizadas 
        });

    } catch (error) {
        console.error("Error en endpoint pagar:", error);
        return NextResponse.json({ 
            ok: false,
            error: "Error interno del servidor" 
        }, { status: 500 });
    }
}