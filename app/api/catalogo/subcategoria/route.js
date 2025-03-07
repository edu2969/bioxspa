import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const categoriaCatalogoId = searchParams.get('id');
    
    if (!categoriaCatalogoId) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await connectMongoDB();
    const subcategorias = await SubcategoriaCatalogo.find({ categoriaCatalogoId }).lean();
    const subcategoriasConItems = await Promise.all(subcategorias.map(async (subcategoria) => {
        const cantidadItemsCatalogo = await ItemCatalogo.countDocuments({ subcategoriaCatalogoId: subcategoria._id });
        return { ...subcategoria, cantidadItemsCatalogo };
    }));
    return NextResponse.json(subcategoriasConItems);
}