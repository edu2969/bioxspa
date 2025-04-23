import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import Precio from "@/models/precio";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = new URL(req.url);
        const clienteId = searchParams.get("clienteId");

        if (!clienteId) {
            const errorMessage = "Field 'clienteId' is required in the query parameters";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        const cliente = await Cliente.findById(clienteId).select("nombre rut tipoPrecio");
        if (!cliente) {
            const errorMessage = "Cliente not found";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 404 });
        }

        // Obtener los precios asociados al clienteId
        const preciosList = await Precio.find({ clienteId }).select("-__v -createdAt -updatedAt").lean();

        // Agregar el atributo 'nombre' a cada precio
        for (const precio of preciosList) {
            const subcategoria = await SubcategoriaCatalogo.findById(precio.subcategoriaCatalogoId).select("nombre categoriaCatalogoId").lean();
            if (subcategoria) {
                const categoria = await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId).select("nombre").lean();
                if (categoria) {
                    precio.nombre = `${categoria.nombre} - ${subcategoria.nombre}`;
                }
            }
        }

        const precios = {
            tipoPrecio: cliente.tipoPrecio,
            nombre: cliente.nombre,
            rut: cliente.rut,
            precios: preciosList, // Incluir el listado de precios con el atributo 'nombre'
        };

        return NextResponse.json({ ok: true, precios });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}