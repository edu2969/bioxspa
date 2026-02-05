import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const { user } = await getAuthenticatedUser();
        const userId = user.id;

        // Get sucursalId from query parameters
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get("sucursalId");

        if (!sucursalId) {            
            return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
        }        

        // Fetch ventas in "por_asignar" state
        const { data: ventas, error: ventasError } = await supabase
            .from("ventas")
            .select(`
                id,
                tipo,
                comentario,
                cliente:clientes(id, nombre, rut),
                estado,
                direccion_despacho_id,
                fecha,
                items:detalle_ventas(
                    id,
                    subcategoria:subcategorias_catalogo(id, nombre, categoria:categorias_catalogo(id, nombre)),
                    cantidad,
                    total
                )
            `)
            .eq("sucursal_id", sucursalId)
            .in("estado", [
                TIPO_ESTADO_VENTA.por_asignar,
                TIPO_ESTADO_VENTA.pagado,
                TIPO_ESTADO_VENTA.entregado,
                TIPO_ESTADO_VENTA.cerrado
            ])
            .order("fecha", { ascending: false })
            .limit(25);

        if (ventasError) {            
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }        

        // Transform ventas data
        const pedidos = ventas.map((venta) => {           
            const items = venta.items || [];
            const cliente = Array.isArray(venta.cliente) ? venta.cliente[0] : venta.cliente;

            const itemsWithNames = items.map((item) => {
                const subcategoria = (item.subcategoria && typeof item.subcategoria === "object" &&
                    "nombre" in item.subcategoria && "categoria" in item.subcategoria &&
                    typeof item.subcategoria.categoria === "object")
                    ? item.subcategoria as { nombre: string; categoria: { nombre: string } }
                    : { nombre: "Desconocido", categoria: { nombre: "Desconocido" } };
                const categoria = subcategoria.categoria?.nombre || "Desconocido";

                return {
                    ...item,
                    nombre: `${categoria} - ${subcategoria.nombre}`
                };
            });

            return {
                id: venta.id,
                tipo: venta.tipo,
                comentario: venta.comentario || "",
                cliente_id: cliente.id,
                cliente_nombre: cliente.nombre,
                cliente_rut: cliente.rut,
                estado: venta.estado,
                despacho_en_local: !venta.direccion_despacho_id,
                fecha: venta.fecha,
                items: itemsWithNames
            };
        });        
        return NextResponse.json({ pedidos });
    } catch (error) {
        console.error("[GET /porAsignar] Internal Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}