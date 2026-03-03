import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    console.log("[GET /api/regenerator] Starting migration v.191. Disconnected...");
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query === "repararDirecciones") {
        const result = await repararDirecciones();
        return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: "Invalid query parameter" }, { status: 400 });
}

const repararDirecciones = async () => {
    try {
        // Fetch all addresses from Supabase
        const { data: direcciones, error: fetchError } = await supabase
            .from("direcciones")
            .select("*");

        if (fetchError) throw fetchError;

        // Fetch all communes for lookup
        const { data: comunas, error: comunasError } = await supabase
            .from("comunas")
            .select("id, nombre");

        if (comunasError) throw comunasError;

        // Create a map for faster commune lookup
        const comunaMap = new Map(
            comunas.map(c => [c.nombre.toLowerCase(), c.id])
        );

        let processed = 0;
        let skipped = 0;

        // Process each address
        for (const dir of direcciones) {
            const [calle, comunaName] = dir.direccion_cliente.split(",");
            const comunaNormalized = comunaName?.trim().toLowerCase();

            const comunaId = comunaMap.get(comunaNormalized);

            if (!comunaId) {
                skipped++;
                continue;
            }

            // Update address with commune_id and cleaned street
            const { error: updateError } = await supabase
                .from("direcciones")
                .update({
                    comuna_id: comunaId,
                    direccion_cliente: calle.trim()
                })
                .eq("id", dir.id);

            if (updateError) {
                console.warn(`Error updating address ${dir.id}:`, updateError);
            } else {
                processed++;
            }
        }

        return { processed, skipped, total: direcciones.length };
    } catch (error) {
        console.error("[repararDirecciones] Error:", error);
        throw error;
    }
}