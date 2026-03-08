import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clienteId = searchParams.get("id");
        if (!clienteId) {
            return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
        }

        // Buscar documentos tributarios que permiten ventas
        const { data: documentosTributarios, error: documentosError } = await supabase
            .from("documentos_tributarios")
            .select("id")
            .eq("venta", true);

        if (documentosError) {
            console.error("Error fetching documentos tributarios:", documentosError);
            return NextResponse.json({ error: documentosError.message }, { status: 500 });
        }

        const documentoIds = (documentosTributarios || []).map(d => d.id);

        // Buscar ventas por cobrar del cliente que cumplan las condiciones
        const { data: ventas, error: ventasError } = await supabase
            .from("ventas")
            .select("id")
            .eq("cliente_id", clienteId)
            .eq("por_cobrar", true)
            .eq("estado", TIPO_ESTADO_VENTA.entregado)
            .gt("valor_total", 0)
            .in("documento_tributario_id", documentoIds.length ? documentoIds : [null]);

        if (ventasError) {
            console.error("Error fetching ventas:", ventasError);
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        const ventaIds = (ventas || []).map(v => v.id);

        // Buscar pagos asociados a esas ventas con información de forma de pago
        const { data: pagos, error: pagosError } = await supabase
            .from("pagos")
            .select(`
                id,
                venta_id,
                forma_pago_id,
                monto,
                fecha,
                numero_comprobante,
                observaciones,
                usuario_registro_id,
                created_at,
                updated_at,
                forma_pago:formas_pago(
                    id,
                    nombre
                )
            `)
            .in("venta_id", ventaIds.length ? ventaIds : [null])
            .order("fecha", { ascending: false });

        if (pagosError) {
            console.error("Error fetching pagos:", pagosError);
            return NextResponse.json({ error: pagosError.message }, { status: 500 });
        }

        // Adaptar la respuesta para mantener compatibilidad con el frontend
        const pagosFormatted = (pagos || []).map(pago => ({
            ...pago,
            _id: pago.id, // Mantener compatibilidad
            ventaId: pago.venta_id,
            formaPagoId: pago.forma_pago_id ? {
                _id: pago.forma_pago_id,
                nombre: pago.forma_pago?.nombre || null
            } : null,
            numeroComprobante: pago.numero_comprobante,
            usuarioRegistroId: pago.usuario_registro_id,
            createdAt: pago.created_at,
            updatedAt: pago.updated_at
        }));

        return NextResponse.json({
            ok: true,
            pagos: pagosFormatted,
        });

    } catch (error) {
        console.error("Error fetching pagos data:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}