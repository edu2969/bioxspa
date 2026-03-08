import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log("Fetching users...");
        
        // Obtener usuarios excluyendo role neo (role_legacy != 2969)
        const { data: users, error: usersError } = await supabase
            .from("usuarios")
            .select("id, nombre, email, role_legacy, active")
            .neq("role_legacy", 2969)
            .eq("active", true);

        if (usersError) {
            console.error("Error fetching users:", usersError);
            return NextResponse.json({ ok: false, error: usersError.message }, { status: 500 });
        }

        console.log(`Fetched ${users?.length || 0} users`);

        // Obtener comisiones activas para cada usuario
        const usersWithComision = await Promise.all(users.map(async (userItem) => {
            const now = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

            const { data: comisiones, error: comisionesError } = await supabase
                .from("comisiones")
                .select(`
                    id,
                    tipo,
                    unidad,
                    valor,
                    fecha_desde,
                    fecha_hasta,
                    activo,
                    subcategoria:subcategorias_catalogo(id, nombre),
                    sucursal:sucursales(id, nombre)
                `)
                .eq("usuario_id", userItem.id)
                .eq("activo", true)
                .or(`fecha_hasta.is.null,fecha_hasta.gte.${now}`);

            if (comisionesError) {
                console.error(`Error fetching comisiones for user ${userItem.id}:`, comisionesError);
                return { ...userItem, comisiones: [] };
            }

            // Transformar comisiones para mantener compatibilidad con frontend
            const comisionesTransformed = (comisiones || []).map(comision => ({
                _id: comision.id,
                userId: userItem.id,
                tipo: comision.tipo,
                unidad: comision.unidad,
                valor: parseFloat(comision.valor) || 0,
                fechaDesde: comision.fecha_desde,
                fechaHasta: comision.fecha_hasta,
                subcategoriaId: comision.subcategoria?.id || null,
                subcategoria: comision.subcategoria || null,
                sucursalId: comision.sucursal?.id || null,
                sucursal: comision.sucursal || null,
                activo: comision.activo
            }));

            // Transformar usuario para mantener compatibilidad
            return {
                _id: userItem.id,
                nombre: userItem.nombre,
                email: userItem.email,
                role: userItem.role_legacy,
                active: userItem.active,
                comisiones: comisionesTransformed
            };
        }));

        console.log("Returning users with comision");
        return NextResponse.json(usersWithComision);

    } catch (error) {
        console.error("Error in comisiones GET endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Validar campos requeridos
        if (!body.userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Verificar que el usuario existe
        const { data: targetUser, error: userError } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .eq("id", body.userId)
            .single();

        if (userError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Preparar datos de comisión
        const fechaDesde = body.fechaDesde ? body.fechaDesde : "2021-01-01";
        const fechaHasta = body.fechaHasta || null;

        // Array para almacenar operaciones de comisión
        const comisionTypes = [
            { tipo: 1, valor: body.comisionGeneral || 0 }, // 1: chofer/general
            { tipo: 2, valor: body.comisionRetiro || 0 },   // 2: retiro
            { tipo: 3, valor: body.comisionEntrega || 0 },  // 3: entrega
            { tipo: 8, valor: body.comisionPtoVta || 0 }    // 8: punto venta
        ];

        const updatedComisiones = [];

        // Procesar cada tipo de comisión
        for (const comisionType of comisionTypes) {
            if (comisionType.valor > 0) {
                // Buscar comisión existente
                const { data: existingComision } = await supabase
                    .from("comisiones")
                    .select("id")
                    .eq("usuario_id", body.userId)
                    .eq("tipo", comisionType.tipo)
                    .eq("activo", true)
                    .single();

                const comisionData = {
                    usuario_id: body.userId,
                    tipo: comisionType.tipo,
                    unidad: 1, // 1: porcentaje, 2: monto - asumiendo porcentaje por defecto
                    valor: comisionType.valor,
                    fecha_desde: fechaDesde,
                    fecha_hasta: fechaHasta,
                    activo: true
                };

                if (existingComision) {
                    // Actualizar comisión existente
                    const { data: updatedComision, error: updateError } = await supabase
                        .from("comisiones")
                        .update(comisionData)
                        .eq("id", existingComision.id)
                        .select()
                        .single();

                    if (updateError) {
                        console.error("Error updating comision:", updateError);
                        continue;
                    }

                    updatedComisiones.push(updatedComision);
                } else {
                    // Crear nueva comisión
                    const { data: newComision, error: insertError } = await supabase
                        .from("comisiones")
                        .insert([comisionData])
                        .select()
                        .single();

                    if (insertError) {
                        console.error("Error inserting comision:", insertError);
                        continue;
                    }

                    updatedComisiones.push(newComision);
                }
            }
        }

        if (updatedComisiones.length === 0) {
            return NextResponse.json({ error: "No comisiones were updated" }, { status: 400 });
        }

        // Transformar respuesta para mantener compatibilidad
        const response = updatedComisiones.map(comision => ({
            _id: comision.id,
            userId: comision.usuario_id,
            tipo: comision.tipo,
            unidad: comision.unidad,
            valor: parseFloat(comision.valor),
            fechaDesde: comision.fecha_desde,
            fechaHasta: comision.fecha_hasta,
            activo: comision.activo
        }));

        return NextResponse.json({ 
            ok: true, 
            comisiones: response,
            message: `${updatedComisiones.length} comisiones updated for user ${targetUser.nombre}`
        });

    } catch (error) {
        console.error("Error in comisiones POST endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}