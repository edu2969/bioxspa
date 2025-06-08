import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

// filepath: d:\git\bioxspa\app\api\catalogo\search\route.js

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const words = query.split(' ').filter(word => word);
        const regexes = words.map(word => new RegExp(word, 'i'));

        const subcategorias = await SubcategoriaCatalogo.find({
            $or: regexes.map(regex => ({ nombre: { $regex: regex } }))
        }).populate('categoriaCatalogoId');

        const results = [];

        subcategorias.forEach(subcategoria => {
            const originalText = `${subcategoria.categoriaCatalogoId.nombre} ${subcategoria.nombre}`;
            const highlightedText = originalText.replace(new RegExp(words.join('|'), 'gi'), match => `<b>${match}</b>`);

            // Calculate match score based on the number of matching words
            const matchScore = words.reduce((score, word) => {
                const regex = new RegExp(word, 'i');
                return score + (originalText.match(regex) ? 1 : 0);
            }, 0);

            results.push({ 
                texto: highlightedText, 
                original: originalText, 
                _id: subcategoria._id, 
                matchScore 
            });
        });

        // Sort results by matchScore in descending order
        results.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({ ok: true, results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
