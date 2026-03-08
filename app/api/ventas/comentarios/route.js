import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ventaId = searchParams.get('ventaId');

        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "Invalid ventaId" }, { status: 400 });
        }
        
        // Verificar que la venta existe
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select("id")
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Obtener comentarios de cobro con información del usuario
        const { data: comentarios, error: comentariosError } = await supabase
            .from("venta_comentarios_cobro")
            .select(`
                id,
                comentario,
                created_at,
                usuario:usuarios(
                    id,
                    nombre,
                    email
                )
            `)
            .eq("venta_id", ventaId)
            .order("created_at", { ascending: true });

        if (comentariosError) {
            console.error("ERROR getting comentarios:", comentariosError);
            return NextResponse.json({ ok: false, error: comentariosError.message }, { status: 500 });
        }

        // Procesar comentarios con información del avatar
        const comentariosFormateados = (comentarios || []).map(comentario => {
            const usuario = comentario.usuario;
            let avatar = null;
            
            if (usuario?.email) {
                const nombreAvatar = usuario.email.split('@')[0];
                avatar = `${nombreAvatar}.jpg`; // Extensión actual como mencionaste
            }

            return {
                _id: comentario.id, // Mantener compatibilidad con frontend
                fecha: comentario.created_at, // Usar created_at como fecha
                comentario: comentario.comentario,
                usuario: {
                    _id: usuario?.id,
                    nombre: usuario?.nombre,
                    email: usuario?.email,
                    avatar: avatar
                },
                createdAt: comentario.created_at,
                updatedAt: comentario.created_at // En PostgreSQL no tenemos updated_at separado
            };
        });

        return NextResponse.json({ 
            ok: true, 
            comentarios: comentariosFormateados 
        });

    } catch (error) {
        console.error("ERROR getting comentarios:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { ventaId, comentario } = body;

        if (!ventaId || !comentario) {
            return NextResponse.json({ 
                ok: false, 
                error: "ventaId and comentario are required" 
            }, { status: 400 });
        }

        // Verificar que la venta existe
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select("id")
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Crear el nuevo comentario en la tabla separada
        const { data: nuevoComentario, error: insertError } = await supabase
            .from("venta_comentarios_cobro")
            .insert({
                venta_id: ventaId,
                usuario_id: user.id,
                comentario: comentario.trim()
            })
            .select(`
                id,
                comentario,
                created_at,
                usuario:usuarios(
                    id,
                    nombre,
                    email
                )
            `)
            .single();

        if (insertError) {
            console.error("ERROR adding comentario:", insertError);
            return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
        }

        if (!nuevoComentario) {
            return NextResponse.json({ ok: false, error: "Failed to create comentario" }, { status: 500 });
        }

        // Formatear el comentario agregado con información del usuario
        const usuario = nuevoComentario.usuario;
        
        let avatar = null;
        if (usuario?.email) {
            const nombreAvatar = usuario.email.split('@')[0];
            avatar = `${nombreAvatar}.jpg`;
        }

        const comentarioFormateado = {
            _id: nuevoComentario.id, // Mantener compatibilidad con frontend
            fecha: nuevoComentario.created_at,
            comentario: nuevoComentario.comentario,
            usuario: {
                _id: usuario?.id,
                nombre: usuario?.nombre,
                email: usuario?.email,
                avatar: avatar
            },
            createdAt: nuevoComentario.created_at,
            updatedAt: nuevoComentario.created_at
        };

        return NextResponse.json({ 
            ok: true, 
            comentario: comentarioFormateado,
            message: "Comentario agregado exitosamente" 
        });

    } catch (error) {
        console.error("ERROR adding comentario:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}