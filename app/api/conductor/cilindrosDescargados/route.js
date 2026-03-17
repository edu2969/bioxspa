import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

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
            console.warn(`User ${userId} is not a conductor. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }

        const supabase = await getSupabaseServerClient();
        const { data: ruta, error: rutaErr } = await supabase
            .from("rutas_despacho")
            .select("id, estado, conductor_id")
            .eq("id", rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error("Error fetching ruta:", rutaErr);
            return NextResponse.json({ ok: false, error: "Error fetching ruta" }, { status: 500 });
        }
        if (!ruta) return NextResponse.json({ ok: true, cilindrosDescargados: [], total: 0 });

        if(ruta.estado !== TIPO_ESTADO_RUTA_DESPACHO.descarga) {
            return NextResponse.json({ ok: true, cilindrosDescargados: [], total: 0 });
        }

        // Get latest descarga (es_carga = false) historial
        const { data: lastHist, error: lastHistErr } = await supabase
            .from("ruta_despacho_historial_carga")
            .select("id, fecha")
            .eq("ruta_despacho_id", rutaId)
            .eq("es_carga", false)
            .order("fecha", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastHistErr) {
            console.error("Error fetching historial carga:", lastHistErr);
            return NextResponse.json({ ok: false, error: "Error fetching historial" }, { status: 500 });
        }
        if (!lastHist) {
            return NextResponse.json({ ok: true, cilindrosDescargados: [], total: 0 });
        }

        // Get moved items for that historial
        const { data: movedItems, error: movedErr } = await supabase
            .from("ruta_despacho_historial_carga_items_movidos")
            .select("item_catalogo_id")
            .eq("ruta_despacho_historial_carga_id", lastHist.id);

        if (movedErr) {
            console.error("Error fetching moved items:", movedErr);
            return NextResponse.json({ ok: false, error: "Error fetching moved items" }, { status: 500 });
        }

        const itemIds = (movedItems || []).map((r) => r.item_catalogo_id).filter(Boolean);
        if (itemIds.length === 0) return NextResponse.json({ ok: true, cilindrosDescargados: [], total: 0 });

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

        const cilindrosDescargados = (items || []).map((row) => {
            const sub = row.subcategoria || null;
            const cat = sub?.categoria || null;
            return {
                id: row.id,
                subcategoriaCatalogoId: sub?.id || "",
                cantidad: sub?.cantidad || 0,
                unidad: sub?.unidad || "",
                nombreGas: sub?.nombre || "",
                sinSifon: sub?.sin_sifon || false,
                elemento: cat?.elemento || "",
                esIndustrial: cat?.es_industrial || false,
                esMedicinal: cat?.es_medicinal || false,
                vencido: false
            };
        });

        return NextResponse.json({ ok: true, cilindrosDescargados, total: cilindrosDescargados.length });

    } catch (error) {
        console.error("ERROR in cilindrosDescargados route:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}