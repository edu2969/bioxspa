import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request, props) {
    const params = await props.params;
    const { id } = params;
    if(!id) {
        console.log("[direcciones.byId GET] Debe venir el id");
        return NextResponse.json({ ok: false, error: "Se esperaba el id" }, { status: 400});
    }
    
    const supabase = await getSupabaseServerClient();
    const { data: direccion, error } = await supabase
        .from('direcciones')
        .select(`id, direccionCliente:direccion_cliente`)
        .eq('id', id[0])
        .single();

    if(error) {
        console.log("[direcciones.byId] Error al consultar", error);
        return NextResponse.json({ ok: false, error: "Error al consultar" }, { status: 500 });
    }

    if(!direccion) {
        console.log("[direcciones.byId] Not found");
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, direccion });
}