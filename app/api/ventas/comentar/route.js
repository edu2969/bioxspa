import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function POST(request) {
    try {
        // Get ventaId and comentario from request body
        const { ventaId, comentario } = await request.json();

        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
        }

        console.log("VENTAID", ventaId, comentario);

        const authResult = await getAuthenticatedUser({ requireAuth: true });
        
        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }
        const supabase = await getSupabaseServerClient();

        // Update the comentario field of the venta using Supabase
        const { error } = await supabase
            .from('ventas')
            .update({ comentario })
            .eq('id', ventaId);

        if (error) {
            console.error('Error updating venta comentario:', error);
            return NextResponse.json({ ok: false, error: "Venta not found or update failed" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error in POST /ventas/comentar:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}