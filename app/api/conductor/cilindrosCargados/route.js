import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get("rutaId");
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        
        const authResult = await getAuthenticatedUser({ requireAuth: true });        
        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }

        const { user, userData } = authResult.data;
        const userId = user.id;
        const userCargoTypes = (userData.cargos || []).map((cargo) => cargo.tipo);
        const hasCargo = (allowedCargoTypes) =>
            userCargoTypes.some((cargoType) => allowedCargoTypes.includes(cargoType));

        if (!hasCargo([TIPO_CARGO.conductor, TIPO_CARGO.cobranza])) {
            console.warn(`User ${userId} is not a conductor o encargado. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }
        
        const supabase = await getSupabaseServerClient();
        const { data: ruta, error: rutaErr } = await supabase
            .from("rutas_despacho")
            .select("id, conductor_id")
            .eq("id", rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error("Error fetching ruta:", rutaErr);
            return NextResponse.json({ ok: false, error: "Error fetching ruta" }, { status: 500 });
        }
        if (!ruta) return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });        

        // Recalcular cilindros actualmente cargados:
        // +1 por movimiento de carga, -1 por movimiento de descarga.
        // El resultado neto > 0 representa cilindros que siguen en el camión.
        const { data: historialList, error: historialErr } = await supabase
            .from("ruta_despacho_historial_carga")
            .select("id, es_carga, fecha")
            .eq("ruta_despacho_id", rutaId)
            .order("fecha", { ascending: true });

        if (historialErr) {
            console.error("Error fetching historial carga:", historialErr);
            return NextResponse.json({ ok: false, error: "Error fetching historial" }, { status: 500 });
        }

        if (!historialList || historialList.length === 0) {
            return NextResponse.json({ ok: true, cilindrosCargados: [], total: 0 });
        }

        const historialIds = historialList.map((h) => h.id);
        const tipoPorHistorial = new Map(historialList.map((h) => [String(h.id), !!h.es_carga]));

        const { data: historialMovimientos, error: historialMovErr } = await supabase
            .from("ruta_despacho_historial_carga_items_movidos")
            .select("ruta_despacho_historial_carga_id, item_catalogo_id")
            .in("ruta_despacho_historial_carga_id", historialIds);

        if (historialMovErr) {
            console.error("Error fetching moved items:", historialMovErr);
            return NextResponse.json({ ok: false, error: "Error fetching moved items" }, { status: 500 });
        }

        const balancePorItem = new Map();
        for (const mov of historialMovimientos || []) {
            const itemId = mov.item_catalogo_id;
            const historialId = String(mov.ruta_despacho_historial_carga_id);
            if (!itemId) continue;

            const esCarga = tipoPorHistorial.get(historialId);
            const delta = esCarga ? 1 : -1;
            balancePorItem.set(itemId, (balancePorItem.get(itemId) || 0) + delta);
            console.log("itemId", itemId, "esCarga", esCarga);
        }

        const itemIds = [...balancePorItem.entries()]
            .filter(([, balance]) => balance > 0)
            .map(([id]) => id);

        if (itemIds.length === 0) {
            return NextResponse.json({ ok: true, cilindrosCargados: [], total: 0 });
        }

        // Fetch items with subcategory and category info
        const { data: items, error: itemsErr } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                subcategoria:subcategorias_catalogo(
                    id,
                    cantidad,
                    unidad,
                    nombre,
                    sin_sifon,
                    categoria:categorias_catalogo(
                        id,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                )
            `)
            .in("id", itemIds);

        if (itemsErr) {
            console.error("Error fetching items:", itemsErr);
            return NextResponse.json({ ok: false, error: "Error fetching items" }, { status: 500 });
        }

        const cilindrosCargados = (items || []).map((row) => {
            const sub = row.subcategoria || null;
            const cat = sub?.categoria || null;
            return {
                id: row.id,
                subcategoria_catalogo_id: sub?.id || "",
                cantidad: sub?.cantidad || 0,
                unidad: sub?.unidad || "",
                nombre_gas: sub?.nombre || "",
                sin_sifon: sub?.sin_sifon || false,
                elemento: cat?.elemento || "",
                es_industrial: cat?.es_industrial || false,
                es_medicinal: cat?.es_medicinal || false,
                vencido: false
            };
        });

        return NextResponse.json({ ok: true, cilindrosCargados, total: cilindrosCargados.length });

    } catch (error) {
        console.error("ERROR in cilindrosCargados route:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}