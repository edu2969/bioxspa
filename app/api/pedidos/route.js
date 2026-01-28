import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET() {
    try {
        console.log("Fetching Pedidos from Supabase...");

        const { data: ventas, error } = await supabase
            .from('ventas')
            .select(`
                id,
                updated_at,
                clientes (
                    nombre,
                    rut,
                    direccion
                ),
                detalle_ventas (
                    id,
                    subcategoria_catalogos (
                        nombre,
                        categoria_catalogos (
                            nombre
                        )
                    ),
                    item_catalogos (
                        codigo,
                        created_at
                    )
                )
            `)
            .in('estado', [TIPO_ESTADO_VENTA.preparacion, TIPO_ESTADO_VENTA.reparto])
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching pedidos:', error);
            return NextResponse.json({ error: "Error fetching pedidos" }, { status: 500 });
        }

        const result = ventas.map((venta) => ({
            cliente: {
                nombre: venta.clientes?.nombre,
                rut: venta.clientes?.rut,
                direccion: venta.clientes?.direccion,
            },
            fechaPedido: venta.updated_at,
            detalles: venta.detalle_ventas.map((detalle) => ({
                nombreCategoria:
                    detalle.subcategoria_catalogos?.categoria_catalogos?.nombre +
                    " " +
                    detalle.subcategoria_catalogos?.nombre,
                itemCatalogo:
                    detalle.item_catalogos?.codigo +
                    " " +
                    detalle.item_catalogos?.created_at,
            })),
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching Pedidos:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}