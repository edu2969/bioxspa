export async function getActiveDebtScope({ supabase, userId }) {
    if (!supabase) {
        throw new Error("supabase client is required");
    }

    if (!userId) {
        throw new Error("userId is required");
    }

    const nowIso = new Date().toISOString();

    const { data: cargo, error } = await supabase
        .from("cargos")
        .select("id, sucursal_id, dependencia_id")
        .eq("usuario_id", userId)
        .eq("activo", true)
        .lte("desde", nowIso)
        .or(`hasta.is.null,hasta.gte.${nowIso}`)
        .order("desde", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Error fetching active cargo scope: ${error.message}`);
    }

    if (!cargo || !cargo.sucursal_id) {
        throw new Error("Active cargo with sucursal_id not found");
    }

    return {
        sucursalId: cargo.sucursal_id,
        dependenciaId: cargo.dependencia_id || null,
    };
}