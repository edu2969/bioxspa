import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request, props) {
    const params = await props.params;
    const { codigo } = params;
    if(!codigo) {
        console.log("[getionar GET] Debe venir el código");
        return NextResponse.json({ ok: false, error: "Debe venir el código", codigo: body.codigo }, { status: 400});
    }
    
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
        .from('items_catalogo')
        .select(`id, codigo, propietarioId:propietario_id, direccionId:direccion_id, 
            subcategoria:subcategoria_catalogo_id(id, categoria:categoria_catalogo_id(id))`)
        .eq('codigo', codigo[0])
        .maybeSingle();

    if(error) {
        console.log("[gestionar GET] Error en la consulta", error);
        return NextResponse.json({ ok: false, error: "Error en la consulta"}, { status: 500 });
    }

    if(!data) {
        console.log("[gestionar GET] No se encuentra el item de codigo =", codigo[0]);
        return NextResponse.json({ ok: false, error: "No se encuentra el item", item: { codigo: codigo[0] }}, { status: 400 });
    }

    return NextResponse.json({ ok: true, item: { ...data } });
}