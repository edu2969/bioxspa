import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CHECKLIST } from "@/app/utils/constants";

interface Pedido {
    _id: string;
    tipo: string;
    estado: string;
    fecha: string;
    cliente_nombre: string;
    cliente_rut: string;
    comentario: string;
    items: any[]; // Define un tipo más específico si conoces la estructura de los items
}

export async function GET(request: NextRequest) {
    try {
        console.log("[GET /conductores] Starting request...");

        // Obtener sucursalId de los parámetros de la URL
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {
            console.warn("[GET /conductores] Missing sucursalId parameter.");
            return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
        }

        console.log(`[GET /conductores] Fetching conductores for sucursalId: ${sucursalId}`);

        // Obtener choferes en ruta
        const { data: conductoresEnRuta, error: conductoresEnRutaError } = await supabase
            .from("rutas_despacho")
            .select("conductor_id")
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.en_ruta)
            .lt("estado", TIPO_ESTADO_RUTA_DESPACHO.terminado);

        if (conductoresEnRutaError) {
            console.error("[GET /conductores] Error fetching conductores en ruta:", conductoresEnRutaError);
            return NextResponse.json({ ok: false, error: conductoresEnRutaError.message }, { status: 500 });
        }

        const conductoresIds = conductoresEnRuta.map((ruta) => ruta.conductor_id);

        // Obtener sucursal y dependencias
        const { data: sucursal, error: sucursalError } = await supabase
            .from("sucursales")
            .select("id")
            .eq("id", sucursalId)
            .single();

        if (sucursalError || !sucursal) {
            console.error("[GET /conductores] Error fetching sucursal:", sucursalError);
            return NextResponse.json({ ok: false, error: "Sucursal no encontrada" }, { status: 400 });
        }

        console.log("Sucursal encontrada:", sucursal);

        const { data: dependencias, error: dependenciasError } = await supabase
            .from("dependencias")
            .select("id")
            .eq("sucursal_id", sucursal.id);

        if (dependenciasError || !dependencias || dependencias.length === 0) {
            console.error("[GET /conductores] Error fetching dependencias:", dependenciasError);
            return NextResponse.json({ ok: false, error: "No se encontraron dependencias para la sucursal" }, { status: 400 });
        }

        const dependenciaIds = dependencias.map((d) => d.id);

        // Obtener cargos de conductores
        const { data: cargosChoferes, error: cargosError } = await supabase
            .from("cargos")
            .select("usuario_id")
            .eq("tipo", TIPO_CARGO.conductor)
            .or(`sucursal_id.eq.${sucursal.id},dependencia_id.in.(${dependenciaIds.join(",")})`)
            .not("usuario_id", "in", `(${conductoresIds.join(",")})`);

        if (cargosError) {
            console.error("[GET /conductores] Error fetching cargos de conductores:", cargosError);
            return NextResponse.json({ ok: false, error: cargosError.message }, { status: 500 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Obtener datos de los conductores
        const conductores = await Promise.all(
            cargosChoferes.map(async (cargo) => {
                const { data: usuario, error: userError } = await supabase
                    .from("usuarios")
                    .select("id, nombre")
                    .eq("id", cargo.usuario_id)
                    .single();

                if (userError || !usuario) {
                    console.error(`[GET /conductores] Error fetching user for cargo ${cargo.usuario_id}:`, userError);
                    return null;
                }

                // Obtener ruta de despacho para el conductor
                const { data: rutaDespacho } = await supabase
                    .from("rutas_despacho")
                    .select("venta_ids")
                    .eq("chofer_id", usuario.id)
                    .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
                    .lt("estado", TIPO_ESTADO_RUTA_DESPACHO.en_ruta)
                    .single();

                let pedidos: Pedido[] = [];
                if (rutaDespacho && rutaDespacho.venta_ids.length > 0) {
                    const { data: ventas } = await supabase
                        .from("ventas")
                        .select("id, tipo, estado, fecha, comentario, cliente:clientes(id, nombre, rut)")
                        .in("id", rutaDespacho.venta_ids);

                    pedidos = ventas
                        ? ventas.map((venta) => {
                            const cliente = Array.isArray(venta.cliente) && venta.cliente.length > 0
                                ? venta.cliente[0]
                                : { id: null, nombre: "Desconocido", rut: "Desconocido" };
                            return {
                                _id: venta.id,
                                tipo: venta.tipo,
                                estado: venta.estado,
                                fecha: venta.fecha,
                                cliente_nombre: cliente.nombre,
                                cliente_rut: cliente.rut,
                                comentario: venta.comentario || "",
                                items: [] // Puedes agregar lógica para obtener los items si es necesario
                            };
                        })
                        : [];
                }

                // Verificar si existe un checklist para hoy
                const { data: checklistExists } = await supabase
                    .from("checklists")
                    .select("id")
                    .eq("usuario_id", usuario.id)
                    .eq("tipo", TIPO_CHECKLIST.vehiculo)
                    .gte("fecha", today.toISOString())
                    .lt("fecha", new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
                    .single();

                return {
                    _id: usuario.id,
                    nombre: usuario.nombre,
                    pedidos,
                    checklist: !!checklistExists
                };
            })
        );

        return NextResponse.json({
            conductores: conductores.filter((c) => c !== null)
        });
    } catch (error) {
        console.error("[GET /conductores] Internal Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}