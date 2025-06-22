import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import { TIPO_CATEGORIA_CATALOGO } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/categorias/route.js

export async function GET() {
    try {
        await connectMongoDB();

        // Buscar solo categorías de tipo "gas" y devolver solo _id y elemento
        const categorias = await CategoriaCatalogo.find(
            { tipo: TIPO_CATEGORIA_CATALOGO.gas },
            { _id: 1, elemento: 1, esIndustrial: 1, esMedicinal: 1 }
        ).lean();

        return NextResponse.json({
            ok: true,
            categorias
        });
    } catch {
        return NextResponse.json({
            ok: false,
            error: "Internal Server Error"
        }, { status: 500 });
    }
}