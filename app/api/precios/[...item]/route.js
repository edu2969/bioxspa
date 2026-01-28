import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req, props) {
    const params = await props.params;
    const { item } = params;
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const usuarioId = searchParams.get("usuarioId");

    try {
        const filters = {
            subcategoria_catalogo_id: item[0]
        };
        if (clienteId) {
            filters.cliente_id = clienteId;
        }
        if (usuarioId) {
            filters.user_id = usuarioId;
        }

        const { data: precio, error } = await supabase
            .from('precios')
            .select('*, subcategoria_catalogos(*), clientes(*)')
            .match(filters)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching precio:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        if (!precio) {
            if (clienteId) {
                const { data: cliente, error: clienteError } = await supabase
                    .from('clientes')
                    .select('tipo_precio')
                    .eq('id', clienteId)
                    .single();

                if (clienteError) {
                    console.error('Error fetching cliente:', clienteError);
                }

                if (cliente?.tipo_precio) {
                    const { data: similarClients, error: clientsError } = await supabase
                        .from('clientes')
                        .select('id')
                        .eq('tipo_precio', cliente.tipo_precio);

                    if (clientsError) {
                        console.error('Error fetching similar clients:', clientsError);
                    }

                    const similarClientIds = (similarClients || []).map(c => c.id);

                    if (similarClientIds.length > 0) {
                        const { data: similarPrice, error: priceError } = await supabase
                            .from('precios')
                            .select('*, subcategoria_catalogos(*), clientes(*)')
                            .eq('subcategoria_catalogo_id', item[0])
                            .in('cliente_id', similarClientIds)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (priceError) {
                            console.error('Error fetching similar price:', priceError);
                        }

                        if (similarPrice) {
                            return NextResponse.json({ ...similarPrice, sugerido: true });
                        }
                    }
                }
            }
            return NextResponse.json({ error: "Price not found" }, { status: 404 });
        }

        return NextResponse.json(precio);
    } catch (err) {
        console.error('Error in precios/[...item] GET:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
