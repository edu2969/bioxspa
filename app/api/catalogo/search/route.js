import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

// filepath: d:\git\bioxspa\app\api\catalogo\search\route.js

export async function GET(req) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const words = query.split(' ').filter(word => word.trim());

        // Build SQL ILIKE patterns for each word
        const searchConditions = words.map(word => `subcategorias_catalogo.nombre ILIKE '%${word.replace(/'/g, "''")}%'`);
        const searchFilter = searchConditions.join(' OR ');

        const { data: subcategorias, error } = await supabase
            .from('subcategorias_catalogo')
            .select(`
                id,
                nombre,
                categoria:categorias_catalogo(
                    id,
                    nombre
                )
            `)
            .or(searchFilter)
            .order('nombre');

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results = [];

        subcategorias.forEach(subcategoria => {
            const originalText = `${subcategoria.categoria?.nombre || ''} ${subcategoria.nombre}`.trim();
            const highlightedText = originalText.replace(new RegExp(words.join('|'), 'gi'), match => `<b>${match}</b>`);

            // Calculate match score based on the number of matching words
            const matchScore = words.reduce((score, word) => {
                const regex = new RegExp(word, 'i');
                return score + (originalText.match(regex) ? 1 : 0);
            }, 0);

            results.push({ 
                texto: highlightedText, 
                original: originalText, 
                _id: subcategoria.id, // Maintain compatibility with frontend
                matchScore 
            });
        });

        // Sort results by matchScore in descending order
        results.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({ ok: true, results });
    } catch (error) {
        console.error("Error in catalog search:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
