import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET() {
    await connectMongoDB();
    const categorias = await CategoriaCatalogo.find().lean();
    const categoriasConSubcategorias = await Promise.all(categorias.map(async (categoria) => {
        const cantidadSubcategorias = await SubcategoriaCatalogo.countDocuments({ categoriaCatalogoId: categoria._id });
        console.log("CSC", { ...categoria, cantidadSubcategorias });
        return { ...categoria, cantidadSubcategorias };
    }));
    return NextResponse.json(categoriasConSubcategorias);
}