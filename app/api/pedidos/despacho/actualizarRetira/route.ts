import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const { ventaId, nombreRecibe, rutRecibe } = await request.json();

        if (!ventaId || !nombreRecibe || !rutRecibe) {
            return NextResponse.json(
                { ok: false, error: "ventaId, nombreRecibe y rutRecibe son requeridos" },
                { status: 400 }
            );
        }

        // Fetch current entregas_en_local
        const { data: venta, error: fetchError } = await supabase
            .from('ventas')
            .select('id, entregas_en_local')
            .eq('id', ventaId)
            .single();

        if (fetchError || !venta) {
            return NextResponse.json(
                { ok: false, error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        const nuevaEntrega = {
            nombre_recibe: nombreRecibe,
            rut_recibe: rutRecibe
        };

        const entregas = Array.isArray(venta.entregas_en_local)
            ? [...venta.entregas_en_local, nuevaEntrega]
            : [nuevaEntrega];

        const { data: updated, error: updateError } = await supabase
            .from('ventas')
            .update({ entregas_en_local: entregas })
            .eq('id', ventaId)
            .select('id, entregas_en_local')
            .single();

        if (updateError || !updated) {
            console.error('Error updating venta:', updateError);
            return NextResponse.json(
                { ok: false, error: "Error interno del servidor" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "Entrega en local agregada exitosamente",
            venta: updated
        });

    } catch (error) {
        console.error("Error al actualizar entrega en local:", error);
        return NextResponse.json(
            { ok: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}