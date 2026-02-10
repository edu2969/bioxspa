import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {
            return NextResponse.json({ error: "sucursalId es requerido" }, { status: 400 });
        }

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
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        const ventaIds = ventasActivas.map((venta) => venta.id);

        if (ventaIds.length === 0) {
            return NextResponse.json({ enTransito: [] });
        }

        // Fetch rutas en transito using the intermediate table ruta_ventas
        const { data: rutasRelacionadas, error: rutasRelacionadasError } = await supabase
            .from("ruta_ventas")
            .select("ruta_id")
            .in("venta_id", ventaIds);

        if (rutasRelacionadasError) {
            return NextResponse.json({ error: rutasRelacionadasError.message }, { status: 500 });
        }

        const rutaIds = rutasRelacionadas.map((relacion) => relacion.ruta_id);

        if (rutaIds.length === 0) {
            return NextResponse.json({ enTransito: [] });
        }


        // Fetch details of the rutas en transito
        const { data: enTransito, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select("id, estado")
            .in("id", rutaIds)
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
            .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.regreso);

        if (rutasError) {
            return NextResponse.json({ error: rutasError.message }, { status: 500 });
        }

        const enTransitoResponse = enTransito.map((ruta) => ({
            ruta_id: ruta.id,
            estado: ruta.estado
        }));

        return NextResponse.json({ enTransito: enTransitoResponse });
    } catch (error) {
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}