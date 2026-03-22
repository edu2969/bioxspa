import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_CARGO } from "@/app/utils/constants";

export async function GET() {
    try {
        const authResult = await getAuthenticatedUser({ requireAuth: true });        
        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }

        const { user, userData } = authResult.data;
        const userId = user.id;
        const userCargoTypes = (userData.cargos || []).map((cargo) => cargo.tipo);
        const hasCargo = (allowedCargoTypes) =>
            userCargoTypes.some((cargoType) => allowedCargoTypes.includes(cargoType));

        if (!hasCargo([TIPO_CARGO.gerente, TIPO_CARGO.cobranza, TIPO_CARGO.encargado])) {
            console.warn(`User ${userId} does not have the required role. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User does not have the required role" }, { status: 403 });
        }

        const supabase = await getSupabaseServerClient();
        const { data: categorias, error } = await supabase
            .from("categorias_catalogo")
            .select(`
                id,
                temporal_id,
                nombre,
                descripcion,
                url_imagen,
                tipo,
                gas,
                elemento,
                es_industrial,
                es_medicinal,
                seguir,
                subcategorias:subcategorias_catalogo(count)
            `)
            .order("nombre");

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        // Transformar datos para mantener compatibilidad con frontend
        const categoriasConSubcategorias = categorias.map(categoria => ({
            id: categoria.id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            urlImagen: categoria.url_imagen,
            tipo: categoria.tipo,
            gas: categoria.gas,
            elemento: categoria.elemento,
            esIndustrial: categoria.es_industrial,
            esMedicinal: categoria.es_medicinal,
            seguir: categoria.seguir,
            cantidadSubcategorias: categoria.subcategorias?.[0]?.count || 0
        }));

        return NextResponse.json(categoriasConSubcategorias);
    } catch (error) {
        console.error("Error fetching categorias:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { id } = body || {};

        // Validación según el esquema
        const requiredFields = ["nombre", "urlImagen"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `El campo '${field}' es requerido.` }, { status: 400 });
            }
        }

        const authResult = await getAuthenticatedUser({ requireAuth: true });        
        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }        

        // Convertir campos a snake_case para la base de datos
        const categoriaData = {
            nombre: body.nombre,
            descripcion: body.descripcion || null,
            url_imagen: body.urlImagen,
            tipo: body.tipo || null,
            gas: body.gas || null,
            elemento: body.elemento || null,
            es_industrial: body.esIndustrial || false,
            es_medicinal: body.esMedicinal || false,
            seguir: body.seguir || false
        };

        let categoria;
        const supabase = await getSupabaseServerClient();
        if (id) {
            // Actualizar existente
            const { data: updatedCategoria, error } = await supabase
                .from("categorias_catalogo")
                .update(categoriaData)
                .eq("id", id)
                .select()
                .single();

            console.log("Update result:", { id, updatedCategoria, error });
            if (error) {
                if (error.code === 'PGRST116') {
                    return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
                }
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            categoria = updatedCategoria;
        } else {
            // Crear nueva
            const { data: newCategoria, error } = await supabase
                .from("categorias_catalogo")
                .insert([categoriaData])
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            categoria = newCategoria;
        }

        // Transformar respuesta para mantener compatibilidad con frontend
        const response = {
            id: categoria.id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            urlImagen: categoria.url_imagen,
            tipo: categoria.tipo,
            gas: categoria.gas,
            elemento: categoria.elemento,
            esIndustrial: categoria.es_industrial,
            esMedicinal: categoria.es_medicinal,
            seguir: categoria.seguir
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error al procesar la categoría:", error);
        return NextResponse.json({ error: "Error al procesar la categoría" }, { status: 500 });
    }
}