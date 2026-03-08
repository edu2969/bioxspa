import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

export async function GET(request) {
    try {
        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const categoriaCatalogoId = searchParams.get('id');
        
        // Construir la consulta con filtro opcional por categoría
        let query = supabase
            .from("subcategorias_catalogo")
            .select(`
                id,
                categoria_id,
                temporal_id,
                nombre,
                descripcion,
                cantidad,
                unidad,
                sin_sifon,
                precio_sugerido,
                created_at,
                updated_at
            `);

        if (categoriaCatalogoId) {
            query = query.eq("categoria_id", categoriaCatalogoId);
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
                    .eq("subcategoria_id", subcategoria.id);

                if (countError) {
                    console.error(`Error counting items for subcategoria ${subcategoria.id}:`, countError);
                    // En caso de error, continuar con count = 0
                    return {
                        ...subcategoria,
                        _id: subcategoria.id, // Mantener compatibilidad con frontend
                        categoriaCatalogoId: subcategoria.categoria_id,
                        temporalId: subcategoria.temporal_id,
                        sinSifon: subcategoria.sin_sifon,
                        precioSugerido: subcategoria.precio_sugerido,
                        createdAt: subcategoria.created_at,
                        updatedAt: subcategoria.updated_at,
                        cantidadItemsCatalogo: 0
                    };
                }

                return {
                    ...subcategoria,
                    _id: subcategoria.id, // Mantener compatibilidad con frontend
                    categoriaCatalogoId: subcategoria.categoria_id,
                    temporalId: subcategoria.temporal_id,
                    sinSifon: subcategoria.sin_sifon,
                    precioSugerido: subcategoria.precio_sugerido,
                    createdAt: subcategoria.created_at,
                    updatedAt: subcategoria.updated_at,
                    cantidadItemsCatalogo: count || 0
                };
            })
        );

        return NextResponse.json(subcategoriasConItems);

    } catch (error) {
        console.error("Error fetching subcategorias data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}