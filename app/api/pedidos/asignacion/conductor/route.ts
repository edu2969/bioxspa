import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    try {
        // Fetch the authenticated user
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
                ruta_ventas(venta_id),
                ruta_historial_estados(estado, fecha, usuario_id)
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
            rutaDespacho.ruta_ventas.map(async (venta) => {
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
            hora_inicio: rutaDespacho.hora_inicio,
            hora_destino: rutaDespacho.hora_destino,
            dependencia_id: rutaDespacho.dependencia_id,
            vehiculo,
            ventas: ventas.filter(Boolean), // Remove null entries
            historial_estados: rutaDespacho.ruta_historial_estados
        };

        return NextResponse.json({ ok: true, ruta_despacho: response });
    } catch (error) {
        console.error("GET /conductor - Internal Server Error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
