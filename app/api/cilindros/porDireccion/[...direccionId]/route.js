import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request, { params }) {
    try {
        const direccionId = params.direccionId?.[0];
        if (!direccionId) {
            return NextResponse.json({ ok: false, error: "direccionId is required" }, { status: 400 });
        }

        // Buscar todos los cilindros (items_catalogo) con esa dirección
        const { data: items, error: itemsError } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                codigo,
                nombre,
                descripcion,
                stock_actual,
                visible,
                subcategoria:subcategorias_catalogo(
                    id,
                    nombre,
                    cantidad,
                    unidad,
                    sin_sifon,
                    nombre_gas,
                    categoria:categorias_catalogo(
                        id,
                        nombre,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                ),
                owner:clientes(
                    id,
                    nombre
                )
            `)
            .eq("direccion_id", direccionId);

        if (itemsError) {
            console.error("Error fetching items:", itemsError);
            return NextResponse.json({ ok: false, error: itemsError.message }, { status: 500 });
        }

        // Adornar los resultados para legibilidad manteniendo la estructura original
        const cilindros = (items || []).map(item => {
            const sub = item.subcategoria;
            const cat = sub?.categoria;
            return {
                _id: item.id,
                codigo: item.codigo,
                nombre: item.nombre,
                descripcion: item.descripcion,
                stockActual: item.stock_actual,
                visible: item.visible,
                subcategoria: sub ? {
                    _id: sub.id,
                    nombre: sub.nombre,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sinSifon: sub.sin_sifon,
                    nombreGas: sub.nombre_gas,
                } : null,
                categoria: cat ? {
                    _id: cat.id,
                    nombre: cat.nombre,
                    elemento: cat.elemento,
                    esIndustrial: cat.es_industrial,
                    esMedicinal: cat.es_medicinal,
                } : null
            };
        });

        return NextResponse.json({ ok: true, cilindros });
    } catch (error) {
        console.error("Error in GET /api/cilindros/porDireccion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}