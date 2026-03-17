import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();
        const { ventaId, nombreRecibe, rutRecibe } = await request.json();
        const nombreRecibeNormalizado = String(nombreRecibe || "").trim();
        const rutRecibeNormalizado = String(rutRecibe || "").trim();

        if (!ventaId || !nombreRecibeNormalizado || !rutRecibeNormalizado) {
            return NextResponse.json(
                { ok: false, error: "ventaId, nombreRecibe y rutRecibe son requeridos" },
                { status: 400 }
            );
        }

        // Verificar que la venta exista.
        const { data: venta, error: fetchError } = await supabase
            .from('ventas')
            .select('id')
            .eq('id', ventaId)
            .single();

        if (fetchError || !venta) {
            return NextResponse.json(
                { ok: false, error: "Venta no encontrada" + (fetchError ? `: ${fetchError.message}` : "") },
                { status: 404 }
            );
        }

        // Actualizar la entrega local más reciente si existe; si no, insertar una nueva.
        const { data: entregaExistente, error: entregaExistenteError } = await supabase
            .from('venta_entregas_local')
            .select('id')
            .eq('venta_id', ventaId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (entregaExistenteError) {
            console.error('Error fetching venta_entregas_local:', entregaExistenteError);
            return NextResponse.json(
                { ok: false, error: "Error interno del servidor" },
                { status: 500 }
            );
        }

        let updated;
        let updateError;

        if (entregaExistente?.id) {
            const result = await supabase
                .from('venta_entregas_local')
                .update({
                    nombre_recibe: nombreRecibeNormalizado,
                    rut_recibe: rutRecibeNormalizado,
                })
                .eq('id', entregaExistente.id)
                .select('id, venta_id, nombre_recibe, rut_recibe, created_at')
                .single();

            updated = result.data;
            updateError = result.error;
        } else {
            const result = await supabase
                .from('venta_entregas_local')
                .insert({
                    venta_id: ventaId,
                    nombre_recibe: nombreRecibeNormalizado,
                    rut_recibe: rutRecibeNormalizado,
                })
                .select('id, venta_id, nombre_recibe, rut_recibe, created_at')
                .single();

            updated = result.data;
            updateError = result.error;
        }

        if (updateError || !updated) {
            console.error('Error upserting venta_entregas_local:', updateError);
            return NextResponse.json(
                { ok: false, error: "Error interno del servidor" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Entrega en local actualizada exitosamente",
            entrega: updated
        });

    } catch (error) {
        console.error("Error al actualizar entrega en local:", error);
        return NextResponse.json(
            { ok: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}