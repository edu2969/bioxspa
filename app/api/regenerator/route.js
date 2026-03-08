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
        const supabase = await getSupabaseServerClient();
        const BATCH_SIZE = 1000;

        // Get total addresses to process.
        const { count: totalDirecciones, error: totalError } = await supabase
            .from("direcciones")
            .select("id", { count: "exact", head: true });

        if (totalError) throw totalError;

        const total = totalDirecciones || 0;

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

        for (let offset = 0; offset < total; offset += BATCH_SIZE) {
            const end = Math.min(offset + BATCH_SIZE - 1, total - 1);

            // Select a safe chunk to avoid Supabase row limits.
            const { data: direcciones, error: fetchError } = await supabase
                .from("direcciones")
                .select("id, direccion_cliente")
                .order("id", { ascending: true })
                .range(offset, end);

            if (fetchError) throw fetchError;

            if (!direcciones || direcciones.length === 0) {
                continue;
            }

            // Process each address in current chunk.
            for (const dir of direcciones) {
                if (!dir?.direccion_cliente || typeof dir.direccion_cliente !== "string") {
                    skipped++;
                    continue;
                }

                const [calle, comunaName] = dir.direccion_cliente.split(",");
                const comunaNormalized = comunaName?.trim().toLowerCase();

                const comunaId = comunaMap.get(comunaNormalized);

                if (!comunaId || !calle?.trim()) {
                    skipped++;
                    continue;
                }

                // Update address with commune_id and cleaned street.
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
        }

        return { processed, skipped, total };
    } catch (error) {
        console.error("[repararDirecciones] Error:", error);
        throw error;
    }
}