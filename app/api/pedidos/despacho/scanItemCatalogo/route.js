import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const codigo = searchParams.get("codigo");

        if (!codigo) {
            return NextResponse.json({ ok: false, error: "Codigo is required" }, { status: 400 });
        }

        // Get authenticated user from Supabase
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Find user's current cargo (active) with related data
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`
                id,
                usuario_id,
                dependencia_id,
                sucursal_id,
                dependencia:dependencias(
                    id,
                    nombre,
                    codigo,
                    direccion_id,
                    cliente_id,
                    direccion:direcciones(
                        id,
                        nombre,
                        latitud,
                        longitud
                    ),
                    cliente:clientes(
                        id,
                        nombre
                    )
                )
            `)
            .eq("usuario_id", user.id)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "User is not authorized" }, { status: 403 });
        }

        // Find item by codigo with all related data
        const { data: item, error: itemError } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                codigo,
                estado,
                direccion_id,
                owner_id,
                subcategoria_catalogo_id,
                direccion:direcciones(
                    id,
                    nombre,
                    latitud,
                    longitud
                ),
                owner:clientes(
                    id,
                    nombre
                ),
                subcategoria:subcategorias_catalogo(
                    id,
                    nombre,
                    unidad,
                    cantidad,
                    nombre_gas,
                    sin_sifon,
                    categoria:categorias_catalogo(
                        id,
                        tipo,
                        nombre,
                        gas,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                )
            `)
            .eq("codigo", codigo)
            .single();

        console.log("cargo:", cargo);
        console.log("Item found:", item);

        if (itemError || !item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        // Check if direccion is invalid by comparing with cargo's dependencia direccion
        const direccionInvalida = cargo.dependencia?.direccion_id !== item.direccion_id;

        return NextResponse.json({
            ok: true,
            itemId: item.id,
            subcategoriaCatalogoId: item.subcategoria,
            cliente: item.owner,
            direccionInvalida,
            codigo,
            direccionActual: {
                nombreDependencia: cargo.dependencia?.nombre,
                direccion: cargo.dependencia?.direccion,
                cliente: cargo.dependencia?.cliente,
            },
            estado: item.estado,
        });
    } catch (error) {
        console.error("Error in GET /api/pedidos/despacho/scanItemCatalogo:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}