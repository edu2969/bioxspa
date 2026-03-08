import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        console.log("Authenticating user...");
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const fecha = searchParams.get("fecha");
        if (!fecha) {
            return NextResponse.json({ error: "Falta el parámetro 'fecha'" }, { status: 400 });
        }

        const ultimaFecha = new Date(fecha).toISOString();
        console.log("Fetching ventas with specified states before date:", ultimaFecha);

        // Obtener ventas con sus detalles, cliente y categoría/subcategoría información
        const { data: ventas, error: ventasError } = await supabase
            .from("ventas")
            .select(`
                id,
                comentario,
                cliente_id,
                estado,
                fecha,
                cliente:clientes(
                    id,
                    nombre,
                    rut
                ),
                detalles:detalle_ventas(
                    id,
                    subcategoria_id,
                    glosa,
                    codigo,
                    codigo_producto,
                    codigo_cilindro,
                    tipo,
                    cantidad,
                    especifico,
                    neto,
                    iva,
                    total,
                    subcategoria:subcategorias_catalogo(
                        id,
                        nombre,
                        categoria:categorias_catalogo(
                            id,
                            nombre
                        )
                    )
                )
            `)
            .or(`estado.eq.${TIPO_ESTADO_VENTA.por_asignar},estado.in.(${TIPO_ESTADO_VENTA.pagado},${TIPO_ESTADO_VENTA.entregado})`)
            .lt("fecha", ultimaFecha)
            .order("fecha", { ascending: false })
            .limit(25);

        if (ventasError) {
            console.error("Error fetching ventas:", ventasError);
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        console.log(`Fetched ${ventas?.length || 0} ventas with specified states`);

        // Procesar y formatear los datos para mantener compatibilidad con el frontend
        const pedidos = (ventas || []).map((venta) => {
            const cliente = venta.cliente;
            const clienteNombre = cliente?.nombre || "Desconocido";
            const clienteRut = cliente?.rut || "Desconocido";

            // Procesar los items del detalle de venta
            const itemsWithNames = (venta.detalles || []).map((item) => {
                const subcategoria = item.subcategoria;
                const categoria = subcategoria?.categoria;

                const categoriaNombre = categoria?.nombre || "Desconocido";
                const subcategoriaNombre = subcategoria?.nombre || "Desconocido";

                return {
                    ...item,
                    _id: item.id, // Mantener compatibilidad con frontend
                    subcategoriaCatalogoId: item.subcategoria_id,
                    ventaId: venta.id,
                    nombre: `${categoriaNombre} - ${subcategoriaNombre}`,
                };
            });

            return {
                _id: venta.id, // Mantener compatibilidad con frontend
                comentario: venta.comentario || "",
                clienteId: venta.cliente_id,
                clienteNombre,
                clienteRut,
                estado: venta.estado,
                fecha: venta.fecha,
                items: itemsWithNames
            };
        });
        
        return NextResponse.json({ pedidos });

    } catch (error) {
        console.error("Error fetching ventas data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}