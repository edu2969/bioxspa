import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request) {
    try {
        // Get ventaId and comentario from request body
        const { ventaId, comentario } = await request.json();

        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
        }

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Update the comentario field of the venta using Supabase
        const { data: venta, error } = await supabase
            .from('ventas')
            .update({ comentario })
            .eq('id', ventaId)
            .select('*')
            .single();

        if (error || !venta) {
            console.error('Error updating venta comentario:', error);
            return NextResponse.json({ ok: false, error: "Venta not found or update failed" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, message: "Comentario actualizado", venta });
    } catch (error) {
        console.error("Error in POST /ventas/comentar:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}