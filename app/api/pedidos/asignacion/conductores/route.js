import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CHECKLIST } from "@/app/utils/constants";

function mapPedidoConductor(venta) {
    const cliente = Array.isArray(venta?.cliente)
        ? venta.cliente[0]
        : venta?.cliente;

    const items = Array.isArray(venta?.detalles)
        ? venta.detalles.map((detalle) => {
            const subcategoria = detalle?.subcategoria;
            const categoria = subcategoria?.categoria;

            return {
                id: String(detalle?.id || ""),
                ventaId: String(venta?.id || ""),
                subcategoriaCatalogoId: String(subcategoria?.id || ""),
                cantidad: Number(detalle?.cantidad || 0),
                precio: Number(detalle?.neto || 0),
                nombre: `${categoria?.nombre || ""} - ${subcategoria?.nombre || ""}`.trim()
            };
        })
        : [];

    return {
        id: String(venta?.id || ""),
        tipo: Number(venta?.tipo || 0),
        estado: Number(venta?.estado || 0),
        fecha: venta?.fecha || null,
        nombreCliente: String(cliente?.nombre || ""),
        rutCliente: String(cliente?.rut || ""),
        comentario: String(venta?.comentario || ""),
        retiroEnLocal: venta?.direccion_despacho_id == null,
        items: items.filter((item) => item.id && item.ventaId)
    };
}

function mapConductor(conductor) {
    return {
        id: String(conductor?.id || ""),
        nombre: String(conductor?.nombre || ""),
        pedidos: Array.isArray(conductor?.pedidos) ? conductor.pedidos : [],
        checklist: Boolean(conductor?.checklist)
    };
}

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        
        if (!authResult || !authResult.userData) {
            console.warn(`[GET /sucursales] No authenticated user found.`);
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {
            return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
        }

        const { data: sucursal, error: sucursalError } = await supabase
            .from("sucursales")
            .select("id")
            .eq("id", sucursalId)
            .single();

        if (sucursalError || !sucursal) {
            return NextResponse.json({ ok: false, error: "Sucursal no encontrada" }, { status: 400 });
        }

        const { data: dependencias, error: dependenciasError } = await supabase
            .from("dependencias")
            .select("id")
            .eq("sucursal_id", sucursal.id);

        if (dependenciasError || !dependencias || dependencias.length === 0) {
            return NextResponse.json({ ok: false, error: "No se encontraron dependencias para la sucursal" }, { status: 400 });
        }

        const dependenciaIds = dependencias.map((d) => d.id);

        const { data: rutasActivas, error: rutasError } = await supabase
            .from("rutas_despacho")
            .select("id, conductor_id")
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada)
            .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.regreso)
            .in("dependencia_id", dependenciaIds);

        if(rutasError) {
            console.error("Error fetching active routes:", rutasError);
            return NextResponse.json({ ok: false, error: "Error fetching active routes" }, { status: 500 });
        }

        const conductoresActivos = rutasActivas ? rutasActivas.map((ruta) => String(ruta.conductor_id)) : [];
        const { data: cargosChoferes, error: cargosError } = await supabase
            .from("cargos")
            .select("usuario_id")
            .eq("tipo", TIPO_CARGO.conductor)
            .not("usuario_id", "in", `(${conductoresActivos.length > 0 ? conductoresActivos.join(",") : ""})`);

        if (cargosError) {
            console.log("Error fetching cargos de conductores:", cargosError);
            return NextResponse.json({ ok: false, error: cargosError.message }, { status: 500 });
        }

        // Obtener datos de los conductores
        const conductores = await Promise.all(
            (cargosChoferes || []).map(async (cargo) => {
                const { data: usuario, error: userError } = await supabase
                    .from("usuarios")
                    .select("id, nombre")
                    .eq("id", cargo.usuario_id)
                    .single();

                if (userError || !usuario) {
                    return null;
                }

                const userId = usuario.id;

                // Obtener ruta de despacho para el conductor
                const { data: rutaDespacho } = await supabase
                    .from("rutas_despacho")
                    .select("id")
                    .eq("conductor_id", userId)
                    .in("estado", [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.orden_cargada])
                    .single();

                let pedidos = [];
                if (rutaDespacho) {
                    // Obtener las ventas asociadas a la ruta desde la tabla intermedia `ruta_despacho_ventas`
                    const { data: rutaVentas, error: rutaVentasError } = await supabase
                        .from("ruta_despacho_ventas")
                        .select("venta_id")
                        .eq("ruta_despacho_id", rutaDespacho.id);

                    if (rutaVentasError) {
                        console.error(`[GET /api/pedidos/asignacion/conductores] Error fetching ventas for ruta ID ${rutaDespacho.id}:`, rutaVentasError);
                    } else {
                        const ventaIds = rutaVentas.map((rv) => rv.venta_id);                        

                        if (ventaIds.length > 0) {
                            const { data: ventas } = await supabase
                                .from("ventas")
                                .select(`
                                    id, tipo, estado, fecha, comentario,
                                    direccion_despacho_id,
                                    cliente:clientes(id, nombre, rut),
                                    detalles:detalle_ventas(
                                        id, tipo, cantidad, neto, iva, total,
                                        subcategoria:subcategorias_catalogo(
                                            id, nombre, unidad,
                                            categoria:categorias_catalogo(id, nombre, tipo)
                                        )
                                    )
                                `)
                                .in("id", ventaIds); // Ensure ventaIds is passed as an array

                            pedidos = Array.isArray(ventas)
                                ? ventas.map(mapPedidoConductor)
                                : [];

                        }
                    }
                }

                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const startOfTomorrow = new Date(startOfToday);
                startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        
                // Verificar si existe un checklist para hoy
                const { data: checklistExists } = await supabase
                    .from("checklists")
                    .select("id")
                    .eq("usuario_id", userId)
                    .eq("tipo", TIPO_CHECKLIST.vehiculo)
                    .gte("created_at", startOfToday.toISOString())
                    .lt("created_at", startOfTomorrow.toISOString())
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                return {
                    id: userId,
                    nombre: usuario.nombre,
                    pedidos,
                    checklist: !!checklistExists
                };
            })
        );

        return NextResponse.json({
            conductores: conductores
                .filter((c) => c !== null)
                .map(mapConductor)
                .filter((c) => c.id)
        });
    } catch (error) {
        console.error("[GET /conductores] Internal Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}