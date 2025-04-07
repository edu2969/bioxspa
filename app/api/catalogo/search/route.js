import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
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

        const categorias = await CategoriaCatalogo.find({
            $or: regexes.map(regex => ({ nombre: { $regex: regex } }))
        });

        const subcategorias = await SubcategoriaCatalogo.find({
            $or: regexes.map(regex => ({ nombre: { $regex: regex } }))
        }).populate('categoriaCatalogoId');

        const results = [];

        subcategorias.forEach(subcategoria => {
            const highlightedText = `${subcategoria.categoriaCatalogoId.nombre} ${subcategoria.nombre}`.replace(new RegExp(words.join('|'), 'gi'), match => `<b>${match}</b>`);
            results.push({ 
                texto: highlightedText, 
                original: `${subcategoria.categoriaCatalogoId.nombre} ${subcategoria.nombre}`, 
                _id: subcategoria._id 
            });
        });

        return NextResponse.json({ ok: true, results });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
