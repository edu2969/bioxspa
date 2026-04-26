import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import dayjs from "dayjs";

const OWNER_BIOX_CLIENTE_ID = "bc914ef3-283b-451b-820e-0e86e111c6ba";
const FETCH_BATCH_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;

const PERIOD_CONFIG = [
    { code: "D", date: () => dayjs().startOf("day").format("YYYY-MM-DD") },
    { code: "S", date: () => dayjs().startOf("week").format("YYYY-MM-DD") },
    { code: "M", date: () => dayjs().startOf("month").format("YYYY-MM-DD") },
    { code: "A", date: () => dayjs().startOf("year").format("YYYY-MM-DD") },
];

function normalizeId(value) {
    return value ? String(value) : null;
}

function getBucketKey(sucursalId, dependenciaId, categoriaId) {
    return `${sucursalId}|${dependenciaId || "NULL"}|${categoriaId}`;
}

function ensureBucket(buckets, sucursalId, dependenciaId, categoriaId) {
    if (!sucursalId || !categoriaId) return null;

    const key = getBucketKey(sucursalId, dependenciaId, categoriaId);

    if (!buckets.has(key)) {
        buckets.set(key, {
            sucursal_id: sucursalId,
            dependencia_id: dependenciaId,
            categoria_catalogo_id: categoriaId,
            cantidad_prestados: 0,
            cantidad_vendidos: 0,
            cantidad_retornados: 0,
        });
    }

    return buckets.get(key);
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
            throw new Error(`[bi_cilindros:init] Error leyendo ${tableName}: ${error.message}`);
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

async function insertInBatches(supabase, records) {
    let inserted = 0;

    for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
        const batch = records.slice(i, i + INSERT_BATCH_SIZE);
        const { error } = await supabase.from("bi_cilindros").insert(batch);

        if (error) {
            throw new Error(`[bi_cilindros:init] Error insertando bi_cilindros: ${error.message}`);
        }

        inserted += batch.length;
    }

    return inserted;
}

async function loadSubcategoriaCategoriaMap(supabase) {
    const map = new Map();

    // Esquema preferido (actual en SQL): categoria_catalogo_id
    const preferred = await supabase
        .from("subcategorias_catalogo")
        .select("id, categoria_catalogo_id")
        .not("categoria_catalogo_id", "is", null);

    if (!preferred.error && Array.isArray(preferred.data)) {
        for (const row of preferred.data) {
            const subcategoriaId = normalizeId(row.id);
            const categoriaId = normalizeId(row.categoria_catalogo_id);
            if (subcategoriaId && categoriaId) {
                map.set(subcategoriaId, categoriaId);
            }
        }
        return map;
    }

    // Fallback para entornos legacy donde la FK pueda llamarse distinto.
    const legacy = await supabase
        .from("subcategorias_catalogo")
        .select("id, categoria_catalogo_id")
        .not("categoria_catalogo_id", "is", null);

    if (legacy.error) {
        throw new Error(`[bi_cilindros:init] Error leyendo subcategorias_catalogo: ${legacy.error.message}`);
    }

    for (const row of legacy.data || []) {
        const subcategoriaId = normalizeId(row.id);
        const categoriaId = normalizeId(row.categoria_catalogo_id);
        if (subcategoriaId && categoriaId) {
            map.set(subcategoriaId, categoriaId);
        }
    }

    return map;
}

function buildLocationMaps(sucursales, dependencias) {
    const dependenciaToSucursal = new Map();
    const sucursalToDirecciones = new Map();
    const direccionToSucursales = new Map();
    const direccionToDependencias = new Map();

    for (const sucursal of sucursales || []) {
        const sucursalId = normalizeId(sucursal.id);
        const dirId = normalizeId(sucursal.direccion_id);

        if (!sucursalId) continue;

        if (!sucursalToDirecciones.has(sucursalId)) {
            sucursalToDirecciones.set(sucursalId, new Set());
        }

        if (dirId) {
            sucursalToDirecciones.get(sucursalId).add(dirId);
        }
    }

    for (const dependencia of dependencias || []) {
        const dependenciaId = normalizeId(dependencia.id);
        const sucursalId = normalizeId(dependencia.sucursal_id);
        const direccionId = normalizeId(dependencia.direccion_id);

        if (!dependenciaId) continue;
        if (!sucursalId) continue;

        dependenciaToSucursal.set(dependenciaId, sucursalId);

        if (!sucursalToDirecciones.has(sucursalId)) {
            sucursalToDirecciones.set(sucursalId, new Set());
        }

        if (direccionId) {
            sucursalToDirecciones.get(sucursalId).add(direccionId);
        }

        if (direccionId) {
            if (!direccionToDependencias.has(direccionId)) {
                direccionToDependencias.set(direccionId, new Set());
            }

            direccionToDependencias.get(direccionId).add(dependenciaId);
        }
    }

    for (const [sucursalId, direcciones] of sucursalToDirecciones.entries()) {
        for (const direccionId of direcciones) {
            if (!direccionToSucursales.has(direccionId)) {
                direccionToSucursales.set(direccionId, new Set());
            }
            direccionToSucursales.get(direccionId).add(sucursalId);
        }
    }

    return {
        dependenciaToSucursal,
        sucursalToDirecciones,
        direccionToSucursales,
        direccionToDependencias,
    };
}

function buildRecordsByPeriod(buckets) {
    const records = [];

    for (const bucket of buckets.values()) {
        for (const period of PERIOD_CONFIG) {
            records.push({
                sucursal_id: bucket.sucursal_id,
                dependencia_id: bucket.dependencia_id,
                cliente_id: OWNER_BIOX_CLIENTE_ID,
                categoria_catalogo_id: bucket.categoria_catalogo_id,
                fecha: period.date(),
                periodo: period.code,
                cantidad_prestados: bucket.cantidad_prestados,
                cantidad_vendidos: bucket.cantidad_vendidos,
                cantidad_retornados: bucket.cantidad_retornados,
                updated_at: new Date().toISOString(),
            });
        }
    }

    return records;
}

export async function GET() {
    const startedAt = Date.now();

    try {
        const supabase = await getSupabaseServerClient();
        const summary = {
            ownerClienteId: OWNER_BIOX_CLIENTE_ID,
            source: {
                sucursales: 0,
                dependencias: 0,
                items: 0,
                detalleVentas: 0,
            },
            generated: {
                buckets: 0,
                records: 0,
            },
            deletedBiCilindros: 0,
            insertedBiCilindros: 0,
            elapsedMs: 0,
        };

        const [sucursales, dependencias] = await Promise.all([
            fetchAllInBatches({
                supabase,
                tableName: "sucursales",
                selectClause: "id, direccion_id, visible",
            }),
            fetchAllInBatches({
                supabase,
                tableName: "dependencias",
                selectClause: "id, sucursal_id, direccion_id, activa",
            }),
        ]);

        summary.source.sucursales = sucursales.length;
        summary.source.dependencias = dependencias.length;

        const {
            dependenciaToSucursal,
            direccionToSucursales,
            direccionToDependencias,
        } = buildLocationMaps(sucursales, dependencias);

        const subcategoriaCategoriaMap = await loadSubcategoriaCategoriaMap(supabase);

        const buckets = new Map();

        // 1) Prestados iniciales: cilindros BIOX ubicados en direcciones de dependencias/sucursales.
        const items = await fetchAllInBatches({
            supabase,
            tableName: "items_catalogo",
            selectClause: `
                id,
                propietario_id,
                direccion_id,
                subcategoria_catalogo_id
            `,
            queryBuilder: (query) => query
                .eq("propietario_id", OWNER_BIOX_CLIENTE_ID)
                .not("direccion_id", "is", null),
        });

        summary.source.items = items.length;

        for (const item of items) {
            const direccionId = normalizeId(item.direccion_id);
            const subcategoriaId = normalizeId(item.subcategoria_catalogo_id);
            const categoriaId = subcategoriaId ? normalizeId(subcategoriaCategoriaMap.get(subcategoriaId)) : null;

            if (!direccionId || !categoriaId) continue;

            const sucursalIds = direccionToSucursales.get(direccionId) || new Set();
            const dependenciaIds = direccionToDependencias.get(direccionId) || new Set();

            for (const sucursalId of sucursalIds) {
                const bucketSucursal = ensureBucket(buckets, sucursalId, null, categoriaId);
                if (bucketSucursal) {
                    bucketSucursal.cantidad_prestados += 1;
                }
            }

            for (const dependenciaId of dependenciaIds) {
                const sucursalId = dependenciaToSucursal.get(dependenciaId);
                if (!sucursalId) continue;

                const bucketDependencia = ensureBucket(buckets, sucursalId, dependenciaId, categoriaId);
                if (bucketDependencia) {
                    bucketDependencia.cantidad_prestados += 1;
                }
            }
        }

        // 2) Vendidos: sumar detalle de ventas por categoría y por sucursal/dependencia.
        const detalleVentas = await fetchAllInBatches({
            supabase,
            tableName: "detalle_ventas",
            selectClause: `
                id,
                cantidad,
                subcategoria_catalogo_id,
                venta:ventas(sucursal_id, dependencia_id)
            `,
        });

        summary.source.detalleVentas = detalleVentas.length;

        for (const detalle of detalleVentas) {
            const cantidad = Number(detalle.cantidad || 0);
            if (!cantidad) continue;

            const subcategoriaId = normalizeId(detalle.subcategoria_catalogo_id);
            const categoriaId = subcategoriaId ? normalizeId(subcategoriaCategoriaMap.get(subcategoriaId)) : null;
            let sucursalId = normalizeId(detalle.venta?.sucursal_id);
            const dependenciaId = normalizeId(detalle.venta?.dependencia_id);

            if (!sucursalId && dependenciaId) {
                sucursalId = dependenciaToSucursal.get(dependenciaId) || null;
            }

            if (!sucursalId || !categoriaId) continue;

            const bucketSucursal = ensureBucket(buckets, sucursalId, null, categoriaId);
            if (bucketSucursal) {
                bucketSucursal.cantidad_vendidos += cantidad;
            }

            if (dependenciaId) {
                const bucketDependencia = ensureBucket(buckets, sucursalId, dependenciaId, categoriaId);
                if (bucketDependencia) {
                    bucketDependencia.cantidad_vendidos += cantidad;
                }
            }
        }

        const records = buildRecordsByPeriod(buckets);

        summary.generated.buckets = buckets.size;
        summary.generated.records = records.length;

        const { count: deletedCount, error: deleteError } = await supabase
            .from("bi_cilindros")
            .delete({ count: "exact" })
            .not("id", "is", null);

        if (deleteError) {
            throw new Error(`[bi_cilindros:init] Error limpiando bi_cilindros: ${deleteError.message}`);
        }

        summary.deletedBiCilindros = deletedCount || 0;

        if (records.length > 0) {
            summary.insertedBiCilindros = await insertInBatches(supabase, records);
        }

        summary.elapsedMs = Date.now() - startedAt;

        return NextResponse.json({
            ok: true,
            message: "Inicializacion de bi_cilindros completada.",
            summary,
        });
    } catch (error) {
        console.error("[GET /api/bi/cilindros/init] Error:", error);
        return NextResponse.json({
            ok: false,
            error: error?.message || "Internal Server Error",
        }, { status: 500 });
    }
}
