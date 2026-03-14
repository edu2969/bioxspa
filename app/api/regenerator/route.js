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

    if (query === "resetVentas") {
        const result = await resetVentas();
        return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ ok: false, error: "Invalid query parameter" }, { status: 400 });
}

const resetVentas = async () => {
    const supabase = await getSupabaseServerClient();
    const summary = {
        deleted: {},
        skippedMissingTables: [],
        warnings: []
    };

    const isMissingRelationError = (error) => {
        const msg = String(error?.message || "").toLowerCase();
        return error?.code === "42P01" || msg.includes("relation") && msg.includes("does not exist");
    };

    const registerDeletedCount = (tableName, count) => {
        summary.deleted[tableName] = (summary.deleted[tableName] || 0) + (count || 0);
    };

    const deleteAllRows = async (tableName, idColumn = "id") => {
        const { error, count } = await supabase
            .from(tableName)
            .delete({ count: "exact" })
            .not(idColumn, "is", null);

        if (error) {
            if (isMissingRelationError(error)) {
                summary.skippedMissingTables.push(tableName);
                return { ok: false, missing: true };
            }
            throw new Error(`[resetVentas] Error deleting from ${tableName}: ${error.message}`);
        }

        registerDeletedCount(tableName, count);
        return { ok: true, tableName, count: count || 0 };
    };

    const tryNullifyBiDeudasUltimaVenta = async () => {
        const { error } = await supabase
            .from("bi_deudas")
            .update({ ultima_venta_id: null })
            .not("ultima_venta_id", "is", null);

        if (!error) return;

        if (isMissingRelationError(error) || error.code === "42703") {
            summary.warnings.push("No existe bi_deudas.ultima_venta_id en este entorno. Se omite nullify.");
            return;
        }

        throw new Error(`[resetVentas] Error limpiando bi_deudas.ultima_venta_id: ${error.message}`);
    };

    try {
        // 1) Limpiar tablas hijas de detalle de venta e historial de ventas.
        await deleteAllRows("detalle_venta_items");
        await deleteAllRows("detalle_ventas");
        await deleteAllRows("venta_historial_estados");

        // También limpiar entregas locales vinculadas a ventas.
        await deleteAllRows("entrega_local_items");
        await deleteAllRows("venta_entregas_local");

        // También limpiar comentarios de cobro si existen en la tabla actual.
        await deleteAllRows("venta_comentarios_cobro");

        // Limpiar dependencias que referencian ventas sin ON DELETE CASCADE.
        await deleteAllRows("pagos");
        await deleteAllRows("registro_comisiones");
        await tryNullifyBiDeudasUltimaVenta();

        // 2) Limpiar relaciones e historial de rutas.
        await deleteAllRows("ruta_despacho_historial_carga_items_movidos");
        await deleteAllRows("ruta_despacho_historial_carga");
        await deleteAllRows("ruta_despacho_historial_estados");
        await deleteAllRows("ruta_despacho_destinos");
        await deleteAllRows("ruta_despacho_ventas");

        // 3) Eliminar ventas.
        const ventasEliminadasResult = await deleteAllRows("ventas");
        const ventasEliminadas = ventasEliminadasResult.count || 0;

        // 4) Finalmente borrar rutas de despacho.
        try {
            await deleteAllRows("rutas_despacho");
        } catch (error) {
            const isFkError = error?.message?.includes("23503") || error?.message?.toLowerCase?.().includes("foreign key");
            if (!isFkError) {
                throw error;
            }

            // Reintentar una vez más tras limpiar relaciones de ruta.
            await deleteAllRows("ruta_despacho_ventas");
            await deleteAllRows("rutas_despacho");
        }

        return {
            message: "Reset completo de ventas y rutas finalizado.",
            ventasEliminadas,
            ...summary
        };
    } catch (error) {
        console.error("[resetVentas] Error:", error);
        throw error;
    }
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