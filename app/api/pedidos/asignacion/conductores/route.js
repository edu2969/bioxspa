import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CHECKLIST } from "@/app/utils/constants";

export async function GET(request) {
    try {
        // Obtener sucursalId de los parámetros de la URL
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {
            return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
        }

        // Obtener choferes en ruta
        const { data: conductoresEnEspera, error: conductoresEnEsperaError } = await supabase
            .from("rutas_despacho")
            .select("conductor_id")
            .eq("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion);

        if (conductoresEnEsperaError) {
            return NextResponse.json({ ok: false, error: conductoresEnEsperaError.message }, { status: 500 });
        }

        const conductoresIds = conductoresEnEspera.map((ruta) => ruta.conductor_id);

        // Obtener sucursal y dependencias
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

        // Obtener cargos de conductores
        const { data: cargosChoferes, error: cargosError } = await supabase
            .from("cargos")
            .select("usuario_id")
            .eq("tipo", TIPO_CARGO.conductor)
            .or(`sucursal_id.eq.${sucursal.id},dependencia_id.in.(${dependenciaIds.join(",")})`);

        if (cargosError) {
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
                    return null;
                }

                // Obtener ruta de despacho para el conductor
                const { data: rutaDespacho } = await supabase
                    .from("rutas_despacho")
                    .select("id")
                    .eq("conductor_id", usuario.id)
                    .eq("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
                    .single();

                let pedidos = [];
                if (rutaDespacho) {
                    // Obtener las ventas asociadas a la ruta desde la tabla intermedia `ruta_ventas`
                    const { data: rutaVentas, error: rutaVentasError } = await supabase
                        .from("ruta_ventas")
                        .select("venta_id")
                        .eq("ruta_id", rutaDespacho.id);                    

                    if (rutaVentasError) {
                        console.error(`[GET /conductores] Error fetching ventas for ruta ID ${rutaDespacho.id}:`, rutaVentasError);
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

                            pedidos = ventas
                                ? ventas.map((venta) => {
                                    const cliente = venta.cliente;                                                 
                                    const items = venta.detalles?.map((detalle) => {
                                        const subcategoria = detalle.subcategoria;
                                        const categoria = subcategoria?.categoria;
                                        return {
                                            id: detalle.id,
                                            venta_id: venta.id,
                                            subcategoria_catalogo_id: subcategoria?.id,
                                            cantidad: detalle.cantidad,
                                            precio: detalle.neto,
                                            nombre: `${categoria?.nombre} - ${subcategoria?.nombre}`
                                        }
                                    })
                                    return {
                                        id: venta.id,
                                        tipo: venta.tipo,
                                        estado: venta.estado,
                                        fecha: venta.fecha,
                                        nombre_cliente: cliente.nombre,
                                        rut_cliente: cliente.rut,
                                        comentario: venta.comentario || "",
                                        retiro_en_local: venta.direccion_despacho_id == null,
                                        items: items || []
                                    };
                                })
                                : [];

                        }
                    }
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
                    id: usuario.id,
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