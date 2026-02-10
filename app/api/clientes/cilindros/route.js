import supabase from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    // Busca el cliente
    const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id, cliente_direcciones_despacho(direccion_id)")
        .eq("id", clienteId)
        .single();
    
    if (clienteError || !cliente) {
        return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
    }

    // Obtiene los IDs de direcciones de despacho del cliente
    const despachoIds = cliente.direcciones_despacho?.map(d => d.direccion_id) || [];

    // Busca items del catálogo cuya direccion_id coincida con alguna dirección de despacho
    const { data: items, error: itemsError } = despachoIds.length > 0
        ? await supabase
              .from("items_catalogo")
              .select(`
                  id, codigo, direccion_id,
                  subcategoria:subcategorias_catalogo(
                      cantidad, unidad, sin_sifon,
                      categoria:categorias_catalogo(
                          es_industrial, elemento
                      )
                  )
              `)
              .in("direccion_id", despachoIds)
        : { data: [], error: null };

    if (itemsError) {
        return NextResponse.json({ ok: false, error: "Error fetching items" }, { status: 500 });
    }

    // Adorna los items con los datos requeridos
    const cilindros = items.map(item => ({
        id: item.id,
        codigo: item.codigo,
        elemento: item.subcategoria?.categoria?.elemento || null,
        cantidad: item.subcategoria?.cantidad || null,
        unidad: item.subcategoria?.unidad || null,
        sinSifon: item.subcategoria?.sin_sifon || false,
        esIndustrial: item.subcategoria?.categoria?.es_industrial || false
    }));

    // Respuesta
    return NextResponse.json({
        ok: true,
        cilindros
    });
}