import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { items } = await request.json();

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid payload format. 'items' should be an array." }, { status: 400 });
        }

        const updatePromises = items.map(async ({ codigo, nuevoEstado }) => {
            if (!codigo || nuevoEstado === undefined || !(nuevoEstado in TIPO_ESTADO_VENTA)) {
                throw new Error(`Invalid item data: { codigo: ${codigo}, nuevoEstado: ${nuevoEstado} }`);
            }

            const { error } = await supabase
                .from("items_catalogo")
                .update({ estado: nuevoEstado })
                .eq("codigo", codigo);

            if (error) {
                throw new Error(`Error updating item with codigo ${codigo}: ${error.message}`);
            }

            return { codigo, updated: true };
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ message: "Estados actualizados correctamente." });

    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}