import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = user.user.id;

        // Fetch the active dispatch route for the driver
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                hora_inicio,
                hora_destino,
                dependencia_id,
                vehiculo_id,
                ruta_despacho_ventas(venta_id),
                ruta_despacho_historial_estados(estado, usuario_id, created_at)
            `)
            .eq("conductor_id", choferId)
            .gt("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
            .lt("estado", TIPO_ESTADO_RUTA_DESPACHO.terminado)
            .single();

        if (rutaError) {
            return NextResponse.json({ ok: false, error: rutaError.message }, { status: 500 });
        }

        if (!rutaDespacho) {
            return NextResponse.json({ ok: true, ruta_despacho: null });
        }

        // Fetch vehicle details if a vehicle is assigned
        let vehiculo = null;
        if (rutaDespacho.vehiculo_id) {
            const { data: vehiculoData, error: vehiculoError } = await supabase
                .from("vehiculos")
                .select("id, patente, modelo, marca")
                .eq("id", rutaDespacho.vehiculo_id)
                .single();

            if (vehiculoError) {
                return NextResponse.json({ ok: false, error: vehiculoError.message }, { status: 500 });
            }

            vehiculo = vehiculoData;
        }

        // Fetch sales details for the route
        const ventas = await Promise.all(
            rutaDespacho.ruta_despacho_ventas.map(async (venta: { venta_id: string }) => {
                const { data: ventaData, error: ventaError } = await supabase
                    .from("ventas")
                    .select(`
                        id,
                        cliente:clientes(id, nombre, rut),
                        direccion_despacho_id,
                        estado,
                        tipo,
                        comentario
                    `)
                    .eq("id", venta.venta_id)
                    .single();

                if (ventaError) {
                    return null;
                }

                return ventaData;
            })
        );

        // Format the response
        const response = {
            id: rutaDespacho.id,
            estado: rutaDespacho.estado,
            horaInicio: rutaDespacho.hora_inicio,
            horaDestino: rutaDespacho.hora_destino,
            dependenciaId: rutaDespacho.dependencia_id,
            vehiculo,
            ventas: ventas.filter(Boolean), // Remove null entries
            historialEstados: rutaDespacho.ruta_despacho_historial_estados.map((hist: { 
                estado: number; usuario_id: string; created_at: string 
            }) => ({
                estado: hist.estado,
                usuarioId: hist.usuario_id,
                timestamp: hist.created_at
            }))
        };

        return NextResponse.json({ ok: true, rutaDespacho: response });
    } catch (error) {
        console.error("GET /conductor - Internal Server Error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
