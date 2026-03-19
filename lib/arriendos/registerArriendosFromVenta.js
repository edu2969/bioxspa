function normalizeDate(fechaDesde) {
    if (!fechaDesde) {
        return new Date().toISOString();
    }

    const parsed = new Date(fechaDesde);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("fechaDesde is invalid");
    }

    return parsed.toISOString();
}

function uniqueIds(ids = []) {
    return [...new Set((ids || []).filter(Boolean).map((id) => String(id)))];
}

export async function getVentaItemCatalogoIds(supabase, ventaId) {
    const { data: detalles, error } = await supabase
        .from("detalle_ventas")
        .select(`
            id,
            items:detalle_venta_items(item_catalogo_id)
        `)
        .eq("venta_id", ventaId);

    if (error) {
        throw new Error(`Error fetching detalle_venta_items for venta ${ventaId}: ${error.message}`);
    }

    return uniqueIds(
        (detalles || []).flatMap((detalle) =>
            (detalle.items || []).map((item) => item.item_catalogo_id)
        )
    );
}

export async function registerArriendosFromVenta({
    supabase,
    ventaId,
    userId,
    source = "desconocido",
    itemCatalogoIds,
    fechaDesde,
    onlyBioxOwned = true,
}) {
    if (!supabase) {
        throw new Error("supabase client is required");
    }

    if (!ventaId) {
        throw new Error("ventaId is required");
    }

    const fechaDesdeIso = normalizeDate(fechaDesde);

    const { data: venta, error: ventaError } = await supabase
        .from("ventas")
        .select("id, cliente_id, fecha")
        .eq("id", ventaId)
        .single();

    if (ventaError || !venta) {
        throw new Error(ventaError?.message || `Venta ${ventaId} not found`);
    }

    if (!venta.cliente_id) {
        throw new Error(`Venta ${ventaId} does not have cliente_id`);
    }

    const ventaItemCatalogoIds = await getVentaItemCatalogoIds(supabase, ventaId);
    const targetItemCatalogoIds = itemCatalogoIds?.length
        ? uniqueIds(itemCatalogoIds)
        : ventaItemCatalogoIds;

    const invalidos = [];
    const omitidos = [];
    const insertados = [];

    const idsFueraDeVenta = targetItemCatalogoIds.filter(
        (itemId) => !ventaItemCatalogoIds.includes(itemId)
    );

    idsFueraDeVenta.forEach((itemId) => {
        invalidos.push({
            itemCatalogoId: itemId,
            reason: "item_not_in_venta",
        });
    });

    const candidateItemCatalogoIds = targetItemCatalogoIds.filter((itemId) =>
        ventaItemCatalogoIds.includes(itemId)
    );

    if (candidateItemCatalogoIds.length === 0) {
        return {
            ok: true,
            ventaId: venta.id,
            clienteId: venta.cliente_id,
            userId: userId || null,
            source,
            totalItemsEvaluados: targetItemCatalogoIds.length,
            totalInsertados: 0,
            totalOmitidos: 0,
            totalInvalidos: invalidos.length,
            insertados,
            omitidos,
            invalidos,
        };
    }

    const { data: items, error: itemsError } = await supabase
        .from("items_catalogo")
        .select("id, propietario_id")
        .in("id", candidateItemCatalogoIds);

    if (itemsError) {
        throw new Error(`Error fetching items_catalogo for arriendos: ${itemsError.message}`);
    }

    const itemsById = new Map((items || []).map((item) => [String(item.id), item]));
    const insertCandidates = [];

    for (const itemId of candidateItemCatalogoIds) {
        const item = itemsById.get(String(itemId));

        if (!item) {
            invalidos.push({
                itemCatalogoId: itemId,
                reason: "item_not_found",
            });
            continue;
        }

        if (onlyBioxOwned && item.propietario_id) {
            omitidos.push({
                itemCatalogoId: itemId,
                reason: "item_is_not_biox_owned",
            });
            continue;
        }

        insertCandidates.push(String(item.id));
    }

    if (insertCandidates.length === 0) {
        return {
            ok: true,
            ventaId: venta.id,
            clienteId: venta.cliente_id,
            userId: userId || null,
            source,
            totalItemsEvaluados: targetItemCatalogoIds.length,
            totalInsertados: 0,
            totalOmitidos: omitidos.length,
            totalInvalidos: invalidos.length,
            insertados,
            omitidos,
            invalidos,
        };
    }

    const { data: existingArriendos, error: existingArriendosError } = await supabase
        .from("arriendo_cilindros")
        .select("id, venta_id, item_catalogo_id, fecha_hasta")
        .in("item_catalogo_id", insertCandidates)
        .is("fecha_hasta", null);

    if (existingArriendosError) {
        throw new Error(`Error checking existing arriendos: ${existingArriendosError.message}`);
    }

    const activeArriendoByItemId = new Map(
        (existingArriendos || []).map((arriendo) => [String(arriendo.item_catalogo_id), arriendo])
    );

    const rowsToInsert = [];

    for (const itemId of insertCandidates) {
        const activeArriendo = activeArriendoByItemId.get(String(itemId));

        if (!activeArriendo) {
            rowsToInsert.push({
                cliente_id: venta.cliente_id,
                venta_id: venta.id,
                item_catalogo_id: itemId,
                fecha_desde: fechaDesdeIso,
            });
            continue;
        }

        if (String(activeArriendo.venta_id) === String(venta.id)) {
            omitidos.push({
                itemCatalogoId: itemId,
                reason: "already_registered_for_same_venta",
            });
            continue;
        }

        invalidos.push({
            itemCatalogoId: itemId,
            reason: "item_has_active_arriendo_in_other_venta",
            arriendoId: activeArriendo.id,
            ventaId: activeArriendo.venta_id,
        });
    }

    if (rowsToInsert.length > 0) {
        const { data: insertedRows, error: insertError } = await supabase
            .from("arriendo_cilindros")
            .insert(rowsToInsert)
            .select("id, item_catalogo_id, venta_id, cliente_id, fecha_desde");

        if (insertError) {
            throw new Error(`Error inserting arriendo_cilindros: ${insertError.message}`);
        }

        insertados.push(...(insertedRows || []).map((row) => ({
            arriendoId: row.id,
            itemCatalogoId: row.item_catalogo_id,
            ventaId: row.venta_id,
            clienteId: row.cliente_id,
            fechaDesde: row.fecha_desde,
        })));
    }

    return {
        ok: true,
        ventaId: venta.id,
        clienteId: venta.cliente_id,
        userId: userId || null,
        source,
        totalItemsEvaluados: targetItemCatalogoIds.length,
        totalInsertados: insertados.length,
        totalOmitidos: omitidos.length,
        totalInvalidos: invalidos.length,
        insertados,
        omitidos,
        invalidos,
    };
}