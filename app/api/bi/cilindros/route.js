import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

const FETCH_BATCH_SIZE = 1000;

function normalizeId(value) {
    return value ? String(value) : null;
}

async function fetchAllInBatches({ supabase, tableName, selectClause, orderColumn = "id", queryBuilder }) {
    const rows = [];
    let offset = 0;

    while (true) {
        let query = supabase
            .from(tableName)
            .select(selectClause)
            .order(orderColumn, { ascending: true })
            .range(offset, offset + FETCH_BATCH_SIZE - 1);

        if (typeof queryBuilder === "function") {
            query = queryBuilder(query);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`[bi/cilindros] Error leyendo ${tableName}: ${error.message}`);
        }

        if (!data || data.length === 0) {
            break;
        }

        rows.push(...data);

        if (data.length < FETCH_BATCH_SIZE) {
            break;
        }

        offset += FETCH_BATCH_SIZE;
    }

    return rows;
}

function resolveCantidad(row, { propiosBool, llenosBool }) {
    if (!llenosBool) {
        return Number(row.cantidad_retornados || 0);
    }

    if (propiosBool) {
        return Number(row.cantidad_prestados || 0);
    }

    return Number(row.cantidad_vendidos || 0);
}

export async function GET(req) {
    try {
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.data) {
            return NextResponse.json({ ok: false, error: authResult.message || "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const categoriaIds = (searchParams.get("categorias") || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
        const llenos = searchParams.get("llenos");
        const propios = searchParams.get("propios");

        const llenosBool = llenos === null ? true : llenos === "true";
        const propiosBool = propios === "true";
        const categoriaIdsSet = new Set(categoriaIds.map(String));

        const [biRows, sucursales, dependencias] = await Promise.all([
            fetchAllInBatches({
                supabase,
                tableName: "bi_cilindros",
                selectClause: "id, sucursal_id, dependencia_id, cliente_id, categoria_catalogo_id, periodo, cantidad_prestados, cantidad_vendidos, cantidad_retornados",
                queryBuilder: (query) => query.eq("periodo", "M"),
            }),
            fetchAllInBatches({
                supabase,
                tableName: "sucursales",
                selectClause: "id, nombre, direccion:direcciones(id, direccion_cliente, latitud, longitud)",
            }),
            fetchAllInBatches({
                supabase,
                tableName: "dependencias",
                selectClause: "id, sucursal_id, nombre, direccion:direcciones(id, direccion_cliente, latitud, longitud)",
            }),
        ]);

        const categoriaIdList = Array.from(new Set(
            biRows
                .map((row) => normalizeId(row.categoria_catalogo_id))
                .filter(Boolean)
        ));

        const categoriasMap = new Map();
        for (let i = 0; i < categoriaIdList.length; i += FETCH_BATCH_SIZE) {
            const batch = categoriaIdList.slice(i, i + FETCH_BATCH_SIZE);
            const { data: categoriasData, error: categoriasError } = await supabase
                .from("categorias_catalogo")
                .select("id, nombre")
                .in("id", batch);

            if (categoriasError) {
                throw new Error(`[bi/cilindros] Error leyendo categorias_catalogo: ${categoriasError.message}`);
            }

            for (const categoria of categoriasData || []) {
                const id = normalizeId(categoria.id);
                if (id) {
                    categoriasMap.set(id, categoria.nombre || "Categoria");
                }
            }
        }

        const sucursalesMap = new Map();
        for (const sucursal of sucursales || []) {
            const sucursalId = normalizeId(sucursal.id);
            if (sucursalId) {
                sucursalesMap.set(sucursalId, sucursal);
            }
        }

        const dependenciasMap = new Map();
        for (const dependencia of dependencias || []) {
            const dependenciaId = normalizeId(dependencia.id);
            if (dependenciaId) {
                dependenciasMap.set(dependenciaId, dependencia);
            }
        }

        const grupos = new Map();

        for (const row of biRows || []) {
            const categoriaId = normalizeId(row.categoria_catalogo_id);
            if (!categoriaId) continue;

            if (categoriaIdsSet.size > 0 && !categoriaIdsSet.has(categoriaId)) {
                continue;
            }

            const cantidad = resolveCantidad(row, { propiosBool, llenosBool });
            if (cantidad <= 0) {
                continue;
            }

            const dependenciaId = normalizeId(row.dependencia_id);
            const sucursalId = normalizeId(row.sucursal_id);
            if (!sucursalId) continue;

            const dependencia = dependenciaId ? dependenciasMap.get(dependenciaId) : null;
            const sucursal = sucursalesMap.get(sucursalId);
            const direccion = dependencia?.direccion || sucursal?.direccion || null;

            if (!direccion?.id) {
                continue;
            }

            const locationKey = `${sucursalId}:${dependenciaId || "NULL"}:${direccion.id}`;
            const clienteId = normalizeId(row.cliente_id) || (propiosBool ? "BIOX" : "CLIENTES");
            const clienteNombre = propiosBool ? "BIOX" : "CLIENTES";

            if (!grupos.has(locationKey)) {
                grupos.set(locationKey, {
                    id: locationKey,
                    clienteId: {
                        id: clienteId,
                        nombre: clienteNombre,
                    },
                    direccionId: {
                        id: direccion.id,
                        nombre: direccion.direccion_cliente,
                        latitud: Number(direccion.latitud),
                        longitud: Number(direccion.longitud),
                    },
                    llenos: 0,
                    categorias: [],
                    _categoriasMap: new Map(),
                });
            }

            const grupo = grupos.get(locationKey);
            grupo.llenos += cantidad;

            if (!grupo._categoriasMap.has(categoriaId)) {
                const categoriaPayload = {
                    categoriaCatalogoId: {
                        id: categoriaId,
                        nombre: categoriasMap.get(categoriaId) || "Categoria",
                    },
                    llenos: 0,
                };
                grupo._categoriasMap.set(categoriaId, categoriaPayload);
                grupo.categorias.push(categoriaPayload);
            }

            grupo._categoriasMap.get(categoriaId).llenos += cantidad;
        }

        const cilindros = Array.from(grupos.values()).map((grupo) => {
            const { _categoriasMap, ...publicGroup } = grupo;
            return publicGroup;
        });

        return NextResponse.json({
            ok: true,
            cilindros
        }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
        console.error("[GET /api/bi/cilindros] Error:", err);
        return NextResponse.json({
            ok: false,
            error: "Internal Server Error"
        }, { status: 500 });
    }
}