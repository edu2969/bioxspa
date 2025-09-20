import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET() {
    await connectMongoDB();
    const categorias = await CategoriaCatalogo.find().lean();
    const categoriasConSubcategorias = await Promise.all(categorias.map(async (categoria) => {
        const cantidadSubcategorias = await SubcategoriaCatalogo.countDocuments({ categoriaCatalogoId: categoria._id });
        return { ...categoria, cantidadSubcategorias };
    }));
    return NextResponse.json(categoriasConSubcategorias);
}

export async function POST(request) {
    try {
        await connectMongoDB();
        const body = await request.json();
        const { _id } = body || {};

        // Validación según el esquema
        const requiredFields = ["nombre", "urlImagen"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `El campo '${field}' es requerido.` }, { status: 400 });
            }
        }

        let categoria;
        if (_id) {
            // Actualizar existente
            categoria = await CategoriaCatalogo.findByIdAndUpdate(
                _id,
                { ...body },
                { new: true, runValidators: true }
            );
            if (!categoria) {
                return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
            }
        } else {
            // Crear nueva
            categoria = new CategoriaCatalogo(body);
            await categoria.save();
        }

        return NextResponse.json(categoria);
    } catch (error) {
        console.error("Error al procesar la categoría:", error);
        return NextResponse.json({ error: "Error al procesar la categoría" }, { status: 500 });
    }
}