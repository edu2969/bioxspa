import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        const { data: itemsCatalogo, error: itemsError } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                temporal_id,
                codigo,
                estado,
                nombre,
                descripcion,
                descripcion_corta,
                ficha_tecnica,
                url_ficha_tecnica,
                url_imagen,
                garantia_anual,
                destacado,
                stock_minimo,
                stock_actual,
                visible,
                direccion_id,
                propietario_id,
                fecha_mantencion,
                created_at,
                updated_at,
                subcategorias_catalogo:subcategorias_catalogo(
                    id,
                    nombre,
                    descripcion,
                    cantidad,
                    unidad,
                    sin_sifon,
                    precio_sugerido,
                    categorias_catalogo:categorias_catalogo(
                        id,
                        nombre,
                        descripcion,
                        tipo,
                        gas,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                )
            `)
            .eq("subcategoria_catalogo_id", id);

        if (itemsError) {
            console.error("Error fetching items catalogo:", itemsError);
            return NextResponse.json({ error: itemsError.message }, { status: 500 });
        }

        // Verificar que la subcategoría existe
        if (!itemsCatalogo || itemsCatalogo.length === 0) {
            // Verificar si la subcategoría existe pero no tiene items
            const { data: subcategoriaExists, error: subcategoriaError } = await supabase
                .from("subcategorias_catalogo")
                .select("id, nombre")
                .eq("id", id)
                .single();

            if (subcategoriaError?.code === 'PGRST116' || !subcategoriaExists) {
                return NextResponse.json({ error: "Subcategoria not found" }, { status: 404 });
            }

            // La subcategoría existe pero no tiene items
            return NextResponse.json([]);
        }

        // Verificar que tenemos información válida de categoría
        const primeraSubcategoria = itemsCatalogo[0]?.subcategorias_catalogo;
        if (!primeraSubcategoria?.categorias_catalogo) {
            return NextResponse.json({ error: "Categoria not found" }, { status: 404 });
        }

        // Formatear los items con los nombres de categoría y subcategoría para mantener compatibilidad
        const itemsWithNames = itemsCatalogo.map(item => {
            const subcategoria = item.subcategorias_catalogo;
            const categoria = subcategoria?.categorias_catalogo;

            return {
                ...item,
                _id: item.id, // Mantener compatibilidad con frontend
                subcategoriaCatalogoIds: [id], // Simular el array original para compatibilidad
                nombreCategoria: categoria?.nombre || "Unknown",
                nombreSubcategoria: subcategoria?.nombre || "Unknown",
                // Mantener compatibilidad con campos snake_case convertidos
                subcategoriaCatalogoId: id,
                fechaMantencion: item.fecha_mantencion,
                stockMinimo: item.stock_minimo,
                stockActual: item.stock_actual,
                descripcionCorta: item.descripcion_corta,
                fichaTecnica: item.ficha_tecnica,
                urlFichaTecnica: item.url_ficha_tecnica,
                urlImagen: item.url_imagen,
                garantiaAnual: item.garantia_anual,
                direccionId: item.direccion_id,
                propietarioId: item.propietario_id,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            };
        });

        return NextResponse.json(itemsWithNames);

    } catch (error) {
        console.error("Error fetching catalogo data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}