import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request, props) {
    const params = await props.params;
    const { id } = params;
    if(!id) {
        console.log("[categorias.byId GET] Debe venir el código");
        return NextResponse.json({ ok: false, error: "Se esperaba id" }, { status: 400});
    }
    
    const supabase = await getSupabaseServerClient();
    const { data: categoria, error } = await supabase
        .from('categorias_catalogo')
        .select(`id, nombre, tipo, elemento, esIndustrial:es_industrial, esMedicinal:es_medicinal`)
        .eq('id', id[0])
        .single();
    
    if(error) {
        console.log("[categorias.byId GET] Error al consultar", error);
        return NextResponse.json({ ok: false, error: "Error al consultar" }, { status: 500 });
    }

    if(!categoria) {
        console.log("[categorias.byId GET] Not found");
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, categoria });
}
