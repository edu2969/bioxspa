import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get("rutaId");
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        // Verify ruta exists and basic access: conductor or staff (cargos)
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

        let allowed = false;
        if (String(ruta.conductor_id) === String(user.id)) allowed = true;
        if (!allowed) {
            const { data: cargos } = await supabase.from("cargos").select("id").eq("usuario_id", user.id).limit(1);
            if (cargos && cargos.length > 0) allowed = true;
        }
        if (!allowed) return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });

        // Get latest carga (es_carga = true) historial
        const { data: lastHist, error: lastHistErr } = await supabase
            .from("ruta_historial_carga")
            .select("id, fecha")
            .eq("ruta_id", rutaId)
            .eq("es_carga", true)
            .order("fecha", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastHistErr) {
            console.error("Error fetching historial carga:", lastHistErr);
            return NextResponse.json({ ok: false, error: "Error fetching historial" }, { status: 500 });
        }

        if (!lastHist) {
            return NextResponse.json({ ok: true, cilindrosCargados: [], total: 0 });
        }

        // Get moved items for that historial
        const { data: movedItems, error: movedErr } = await supabase
            .from("ruta_items_movidos")
            .select("item_catalogo_id")
            .eq("historial_carga_id", lastHist.id);

        if (movedErr) {
            console.error("Error fetching moved items:", movedErr);
            return NextResponse.json({ ok: false, error: "Error fetching moved items" }, { status: 500 });
        }

        const itemIds = (movedItems || []).map((r) => r.item_catalogo_id).filter(Boolean);
        if (itemIds.length === 0) return NextResponse.json({ ok: true, cilindrosCargados: [], total: 0 });

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
                _id: row.id,
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

        return NextResponse.json({ ok: true, cilindrosCargados, total: cilindrosCargados.length });

    } catch (error) {
        console.error("ERROR in cilindrosCargados route:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}