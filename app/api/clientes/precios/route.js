import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    console.log("[GET /api/clientes/precios] Request received");

    try {
        const { searchParams } = req.nextUrl;
        const searchText = searchParams.get("search") || "";
        const clienteId = searchParams.get("clienteId");

        console.log(`[GET /api/clientes/precios] Search text: ${searchText}, Cliente ID: ${clienteId}`);
        const supabase = await getSupabaseServerClient();

        if (clienteId) {
            console.log(`[GET /api/clientes/precios] Fetching cliente with ID: ${clienteId}`);
            const { data: cliente, error: clienteError } = await supabase
                .from("clientes")
                .select("id")
                .eq("id", clienteId)
                .single();

            if (clienteError || !cliente) {
                console.error(`[GET /api/clientes/precios] Cliente not found: ${clienteError?.message}`);
                return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
            }

            console.log(`[GET /api/clientes/precios] Fetching precios for cliente ID: ${clienteId}`);
            const { data: precios, error: preciosError } = await supabase
                .from("precios")
                .select(`
                    id,
                    valor,
                    subcategorias_catalogo:subcategoria_catalogo_id(
                        id,
                        nombre,
                        cantidad,
                        unidad,
                        sin_sifon,
                        categorias_catalogo:categoria_catalogo_id(
                            id,
                            nombre,
                            tipo,
                            gas,
                            elemento,
                            es_industrial,
                            es_medicinal
                        )
                    )
                `)
                .eq("cliente_id", clienteId);

            if (preciosError) {
                console.error(`[GET /api/clientes/precios] Error fetching precios: ${preciosError.message}`);
                return NextResponse.json({ error: "Error fetching precios" }, { status: 500 });
            }

            console.log(`[GET /api/clientes/precios] Successfully fetched precios for cliente ID: ${clienteId}`);
            return NextResponse.json({ precios: precios.map(p => ({
                id: p.id,
                valor: p.valor,
                subcategoriaCatalogo: {
                    id: p.subcategorias_catalogo.id,
                    nombre: p.subcategorias_catalogo.nombre,
                    cantidad: p.subcategorias_catalogo.cantidad,
                    unidad: p.subcategorias_catalogo.unidad,
                    sinSifon: p.subcategorias_catalogo.sin_sifon,
                    categoriaCatalogo: {
                        id: p.subcategorias_catalogo.categorias_catalogo.id,
                        tipo: p.subcategorias_catalogo.categorias_catalogo.tipo,
                        gas: p.subcategorias_catalogo.categorias_catalogo.gas,
                        nombre: p.subcategorias_catalogo.categorias_catalogo.nombre,
                        elemento: p.subcategorias_catalogo.categorias_catalogo.elemento,
                        esIndustrial: p.subcategorias_catalogo.categorias_catalogo.es_industrial,
                        esMedicinal: p.subcategorias_catalogo.categorias_catalogo.es_medicinal,
                    }
                }
            })) });
        } else {
            if (!searchText) {
                console.warn("[GET /api/clientes/precios] Missing search parameter");
                return NextResponse.json({ error: "Search parameter is required" }, { status: 400 });
            }

            console.log(`[GET /api/clientes/precios] Searching for clientes and subcategorias with text: ${searchText}`);
            const { data: matchingClientes, error: clientesError } = await supabase
                .from("clientes")
                .select("id, nombre, rut")
                .or(`nombre.ilike.%${searchText}%,rut.ilike.%${searchText}%`);

            if (clientesError) {
                console.error(`[GET /api/clientes/precios] Error fetching clientes: ${clientesError.message}`);
                return NextResponse.json({ error: "Error fetching clientes" }, { status: 500 });
            }

            console.log(`[GET /api/clientes/precios] Found ${matchingClientes.length} matching clientes`);

            const { data: matchingSubcategorias, error: subcategoriasError } = await supabase
                .from("subcategorias_catalogo")
                .select("id, nombre, categoria_catalogo_id")
                .or(`nombre.ilike.%${searchText}%`);

            if (subcategoriasError) {
                console.error(`[GET /api/clientes/precios] Error fetching subcategorias: ${subcategoriasError.message}`);
                return NextResponse.json({ error: "Error fetching subcategorias" }, { status: 500 });
            }

            console.log(`[GET /api/clientes/precios] Found ${matchingSubcategorias.length} matching subcategorias`);

            const subcategoriaIds = matchingSubcategorias.map((s) => s.id);
            const clienteIds = matchingClientes.map((c) => c.id);

            console.log(`[GET /api/clientes/precios] Fetching precios for cliente IDs: ${clienteIds} and subcategoria IDs: ${subcategoriaIds}`);
            const { data: precios, error: preciosError } = await supabase
                .from("precios")
                .select(`
                    cliente_id,
                    valor,
                    subcategorias_catalogo:subcategoria_catalogo_id(
                        id,
                        nombre,
                        cantidad,
                        unidad,
                        sin_sifon,
                        categorias_catalogo:categoria_catalogo_id(
                            id,
                            nombre,
                            tipo,
                            gas,
                            elemento,
                            es_industrial,
                            es_medicinal
                        )
                    )
                `)
                .or(
                    `cliente_id.in.(${clienteIds.join(",")}),subcategoria_catalogo_id.in.(${subcategoriaIds.join(",")})`
                );

            if (preciosError) {
                console.error(`[GET /api/clientes/precios] Error fetching precios: ${preciosError.message}`);
                return NextResponse.json({ error: "Error fetching precios" }, { status: 500 });
            }

            console.log(`[GET /api/clientes/precios] Successfully fetched precios`, precios[0]);

            const preciosPorCliente = precios.reduce((acc, precio) => {
                const clienteId = precio.cliente_id;
                if (!acc[clienteId]) acc[clienteId] = [];
                acc[clienteId].push(precio);
                return acc;
            }, {});

            const resultados = matchingClientes.map((cliente) => ({
                clienteId: cliente.id,
                nombre: cliente.nombre,
                rut: cliente.rut,
                precios: preciosPorCliente[cliente.id].map((p) => ({
                    id: p.id,
                    valor: p.valor,
                    subcategoriaCatalogo: {
                        id: p.subcategorias_catalogo.id,
                        nombre: p.subcategorias_catalogo.nombre,
                        cantidad: p.subcategorias_catalogo.cantidad,
                        unidad: p.subcategorias_catalogo.unidad,
                        sinSifon: p.subcategorias_catalogo.sin_sifon,
                        categoriaCatalogo: {
                            id: p.subcategorias_catalogo.categorias_catalogo.id,
                            tipo: p.subcategorias_catalogo.categorias_catalogo.tipo,
                            gas: p.subcategorias_catalogo.categorias_catalogo.gas,
                            nombre: p.subcategorias_catalogo.categorias_catalogo.nombre,
                            elemento: p.subcategorias_catalogo.categorias_catalogo.elemento,
                            esIndustrial: p.subcategorias_catalogo.categorias_catalogo.es_industrial,
                            esMedicinal: p.subcategorias_catalogo.categorias_catalogo.es_medicinal,
                        }
                    }
                })) || []
            }));

            console.log(`[GET /api/clientes/precios] Successfully built response with ${resultados.length} clientes`);
            return NextResponse.json({ ok: true, clientes: resultados });
        }
    } catch (error) {
        console.error(`[GET /api/clientes/precios] Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}