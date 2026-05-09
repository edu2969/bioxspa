import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const categoriaCatalogoId = searchParams.get('categoriaId');

        console.log("CategoriaCatalogoId", categoriaCatalogoId);
        
        const supabase = await getSupabaseServerClient();
        let query = supabase
            .from("subcategorias_catalogo")
            .select(`
                id,
                categoria_catalogo_id,
                nombre,
                cantidad,
                unidad,
                sin_sifon,
                precio_sugerido                
            `);

        if (categoriaCatalogoId) {
            query = query.eq("categoria_catalogo_id", categoriaCatalogoId);
        }

        const { data: subcategorias, error: subcategoriasError } = await query;

        if (subcategoriasError) {
            console.error("Error fetching subcategorias:", subcategoriasError);
            return NextResponse.json({ error: subcategoriasError.message }, { status: 500 });
        }

        // Obtener la cantidad de items para cada subcategoría
        const subcategoriasConItems = await Promise.all(
            (subcategorias || []).map(async (subcategoria) => {
                const { count, error: countError } = await supabase
                    .from("items_catalogo")
                    .select("id", { count: "exact", head: true })
                    .eq("subcategoria_catalogo_id", subcategoria.id);

                if (countError) {
                    console.error(`Error counting items for subcategoria ${subcategoria.id}:`, countError);
                    // En caso de error, continuar con count = 0
                    return {
                        id: subcategoria.id, // Mantener compatibilidad con frontend
                        categoriaCatalogoId: subcategoria.categoria_catalogo_id,
                        sinSifon: subcategoria.sin_sifon,
                        precioSugerido: subcategoria.precio_sugerido,
                        cantidad: subcategoria.cantidad,
                        unidad: subcategoria.unidad,
                        cantidadItemsCatalogo: 0
                    };
                }

                return {
                    id: subcategoria.id, // Mantener compatibilidad con frontend
                    categoriaCatalogoId: subcategoria.categoria_catalogo_id,                    
                    nombre: subcategoria.nombre,
                    sinSifon: subcategoria.sin_sifon,
                    precioSugerido: subcategoria.precio_sugerido,
                    cantidad: subcategoria.cantidad,
                    unidad: subcategoria.unidad,
                    cantidadItemsCatalogo: count || 0
                };
            })
        );

        return NextResponse.json({ ok: true, subcategorias: subcategoriasConItems });

    } catch (error) {
        console.error("Error fetching subcategorias data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}