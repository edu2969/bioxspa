import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

// filepath: d:/git/bioxspa/app/api/pedidos/despacho/scanItemCatalogo/route.js

export async function GET(request) {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        const { searchParams } = new URL(request.url);
        const codigo = searchParams.get("codigo");

        if (!codigo) {
            console.warn("No 'codigo' provided in query.");
            return NextResponse.json({ ok: false, error: "Codigo is required" }, { status: 400 });
        }

        console.log(`Searching for ItemCatalogo with codigo: ${codigo}`);
        const item = await ItemCatalogo.findOne({ codigo }).lean();

        if (!item) {
            console.warn(`ItemCatalogo not found for codigo: ${codigo}`);
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        console.log("Fetching related SubcategoriaCatalogo...");
        const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId).lean();

        let categoria = null;
        if (subcategoria) {
            console.log("Fetching related CategoriaCatalogo...");
            categoria = await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId).lean();
        }

        console.log("ItemCatalogo found, returning response.");
        return NextResponse.json({
            ok: true,
            item,
            categoria: categoria || null,
            subcategoria: subcategoria || null,
        });
    } catch {
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}