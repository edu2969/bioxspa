import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET(req) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const vehiculoId = searchParams.get("vehiculoId");

        console.log("Received vehiculoId:", vehiculoId);

        if (!vehiculoId) {
            return NextResponse.json({ error: "Missing vehiculoId parameter" }, { status: 400 });
        }

        // Verificar que el vehículo existe y tiene conductores asignados
        const { data: vehiculo, error: vehiculoError } = await supabase
            .from("vehiculos")
            .select(`
                id,
                conductores:vehiculo_conductores(conductor_id)
            `)
            .eq("id", vehiculoId)
            .single();
        
        if (vehiculoError || !vehiculo) {
            return NextResponse.json({ error: "Vehiculo not found" }, { status: 404 });
        }

        if (!vehiculo.conductores || vehiculo.conductores.length === 0) {
            return NextResponse.json({ error: "No conductores asignados al vehiculo" }, { status: 400 });
        }

        // Buscar la ruta de despacho activa para el vehículo
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select("id")
            .eq("vehiculo_id", vehiculoId)
            .not("estado", "in", `(${TIPO_ESTADO_RUTA_DESPACHO.a_reasignar},${TIPO_ESTADO_RUTA_DESPACHO.cancelado},${TIPO_ESTADO_RUTA_DESPACHO.anulado},${TIPO_ESTADO_RUTA_DESPACHO.terminado})`)
            .single();

        if (rutaError || !rutaDespacho) {
            return NextResponse.json({ ok: true, cilindros: [] });
        }

        // Obtener los items cargados en la ruta más reciente (es_carga = true)
        const { data: cargaHistorial, error: cargaError } = await supabase
            .from("ruta_despacho_historial_carga")
            .select(`
                items:ruta_despacho_items_movidos(
                    item_catalogo:items_catalogo(
                        id,
                        estado,
                        subcategoria:subcategorias_catalogo(
                            cantidad,
                            sin_sifon,
                            categoria:categorias_catalogo(
                                elemento,
                                es_industrial,
                                es_medicinal
                            )
                        )
                    )
                )
            `)
            .eq("ruta_despacho_id", rutaDespacho.id)
            .eq("es_carga", true)
            .order("fecha", { ascending: false })
            .limit(1);

        if (cargaError) {
            console.error("Error fetching carga historial:", cargaError);
            return NextResponse.json({ error: cargaError.message }, { status: 500 });
        }

        // Mapear los items a cilindros
        const cilindros = [];
        
        if (cargaHistorial && cargaHistorial.length > 0) {
            const latestCarga = cargaHistorial[0];
            
            if (latestCarga.items) {
                cilindros.push(...latestCarga.items.map(itemMovido => {
                    const item = itemMovido.item_catalogo;
                    return {
                        elementos: item.subcategoria?.categoria?.elemento || "",
                        peso: item.subcategoria?.cantidad || 0,
                        altura: 0, // No disponible en el modelo actual
                        radio: 0,  // No disponible en el modelo actual
                        sinSifon: item.subcategoria?.sin_sifon || false,
                        esIndustrial: item.subcategoria?.categoria?.es_industrial || false,
                        esMedicinal: item.subcategoria?.categoria?.es_medicinal || false,
                        estado: item.estado || 0
                    };
                }));
            }
        }

        return NextResponse.json({ ok: true, cilindros });

    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}