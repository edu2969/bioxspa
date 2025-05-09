"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
// filepath: d:\git\bioxspa\app\api\catalogo\search\route.js
async function GET(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        if (!query) {
            return server_1.NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }
        const words = query.split(' ').filter(word => word);
        const regexes = words.map(word => new RegExp(word, 'i'));
        const subcategorias = await subcategoriaCatalogo_1.default.find({
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
        return server_1.NextResponse.json({ ok: true, results });
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
