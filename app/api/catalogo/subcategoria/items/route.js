import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await connectMongoDB();
    const itemsCatalogo = await ItemCatalogo.find({ subcategoriaCatalogoId: id }).lean();

    const subcategoria = await SubcategoriaCatalogo.findById(id).lean();
    if (!subcategoria) {
        return NextResponse.json({ error: "Subcategoria not found" }, { status: 404 });
    }

    const categoria = await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId).lean();
    if (!categoria) {
        return NextResponse.json({ error: "Categoria not found" }, { status: 404 });
    }

    const itemsWithNames = itemsCatalogo.map(item => ({
        ...item,
        nombreCategoria: categoria.nombre,
        nombreSubcategoria: subcategoria.nombre
    }));

    return NextResponse.json(itemsWithNames);
}