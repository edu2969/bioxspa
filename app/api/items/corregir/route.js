import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request) {
    try {
        const { id, estado, reubicar } = await request.json();

        if (!id || !estado) {
            return NextResponse.json({ ok: false, error: "id, estado are required" }, { status: 400 });
        }

        // Get authenticated user from Supabase
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Find user's current cargo (active) with dependencia and direccion info
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`
                id,
                usuario_id,
                dependencia_id,
                sucursal_id,
                dependencia:dependencias(
                    id,
                    nombre,
                    direccion_id,
                    direccion:direcciones(
                        id,
                        nombre
                    )
                )
            `)
            .eq("usuario_id", user.id)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo || !cargo.dependencia_id || !cargo.dependencia?.direccion_id) {
            return NextResponse.json({ ok: false, error: "User does not have a valid cargo or dependencia" }, { status: 403 });
        }

        // Prepare update object
        const updateData = { estado };
        if (reubicar) {
            updateData.direccion_id = cargo.dependencia.direccion_id;
        }

        // Update the item
        const { data: updatedItem, error: updateError } = await supabase
            .from("items_catalogo")
            .update(updateData)
            .eq("id", id)
            .select(`
                id,
                codigo,
                estado,
                nombre,
                direccion_id,
                direccion:direcciones(
                    id,
                    nombre
                )
            `)
            .single();

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
            }
            console.error("Error updating item:", updateError);
            return NextResponse.json({ ok: false, error: "Error updating item" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, item: updatedItem });
    } catch (error) {
        console.error("Error in POST /api/items/corregir:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}