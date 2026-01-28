import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    try {
        console.log("[GET /rutasEnTransito] Starting request...");

        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {
            console.warn("[GET /rutasEnTransito] Missing sucursalId parameter.");
            return NextResponse.json({ error: "sucursalId es requerido" }, { status: 400 });
        }

        console.log(`[GET /rutasEnTransito] Fetching active ventas for sucursalId: ${sucursalId}`);

        // Fetch active ventas for the specified sucursal
        const { data: ventasActivas, error: ventasError } = await supabase
            .from("ventas")
            .select("id")
            .eq("sucursal_id", sucursalId)
            .in("estado", [
                TIPO_ESTADO_VENTA.reparto,
                TIPO_ESTADO_VENTA.preparacion,
                TIPO_ESTADO_VENTA.entregado
            ]);

        if (ventasError) {
            console.error("[GET /rutasEnTransito] Error fetching ventas:", ventasError);
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        const ventaIds = ventasActivas.map((venta) => venta.id);

        if (ventaIds.length === 0) {
            console.log("[GET /rutasEnTransito] No active ventas found.");
            return NextResponse.json({ enTransito: [] });
        }

        console.log(`[GET /rutasEnTransito] Found ${ventaIds.length} active ventas. Fetching rutas en transito...`);

        // Fetch rutas en transito using the intermediate table ruta_ventas
        const { data: rutasRelacionadas, error: rutasRelacionadasError } = await supabase
            .from("ruta_ventas")
            .select("ruta_id")
            .in("venta_id", ventaIds);

        if (rutasRelacionadasError) {
            console.error("[GET /rutasEnTransito] Error fetching rutas relacionadas:", rutasRelacionadasError);
            return NextResponse.json({ error: rutasRelacionadasError.message }, { status: 500 });
        }

        const rutaIds = rutasRelacionadas.map((relacion) => relacion.ruta_id);

        if (rutaIds.length === 0) {
            console.log("[GET /rutasEnTransito] No rutas found for the active ventas.");
            return NextResponse.json({ enTransito: [] });
        }

        console.log(`[GET /rutasEnTransito] Found ${rutaIds.length} rutas. Fetching details...`);

        // Fetch details of the rutas en transito
        const { data: enTransito, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select("id, estado")
            .in("id", rutaIds)
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
            .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.regreso);

        if (rutasError) {
            console.error("[GET /rutasEnTransito] Error fetching rutas en transito:", rutasError);
            return NextResponse.json({ error: rutasError.message }, { status: 500 });
        }

        console.log(`[GET /rutasEnTransito] Found ${enTransito.length} rutas en transito.`);

        const enTransitoResponse = enTransito.map((ruta) => ({
            rutaId: ruta.id,
            estado: ruta.estado
        }));

        return NextResponse.json({ enTransito: enTransitoResponse });
    } catch (error) {
        console.error("[GET /rutasEnTransito] Internal Server Error:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}