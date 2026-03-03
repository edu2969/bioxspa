import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_CATEGORIA_CATALOGO } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/categorias/route.js

export async function GET() {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Buscar solo categorías de tipo "gas" y devolver solo campos específicos
        const { data: categorias, error } = await supabase
            .from('categorias_catalogo')
            .select('id, elemento, es_industrial, es_medicinal')
            .eq('tipo', TIPO_CATEGORIA_CATALOGO.gas);

        if (error) {
            return NextResponse.json({
                ok: false,
                error: error.message
            }, { status: 500 });
        }

        // Transformar respuesta para mantener compatibilidad con frontend
        const categoriasCompatibles = categorias.map(categoria => ({
            _id: categoria.id,  // Mantener _id para compatibilidad
            elemento: categoria.elemento,
            esIndustrial: categoria.es_industrial,
            esMedicinal: categoria.es_medicinal
        }));

        return NextResponse.json({
            ok: true,
            categorias: categoriasCompatibles
        });
    } catch (error) {
        console.error("Error fetching categorias gases:", error);
        return NextResponse.json({
            ok: false,
            error: "Internal Server Error"
        }, { status: 500 });
    }
}