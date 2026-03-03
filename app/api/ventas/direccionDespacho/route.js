import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

// filepath: d:/git/bioxspa/app/api/ventas/direccionDespacho/route.js

export async function POST(req) {
    try {
        console.log("Authenticating user...");
        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("Body recibido v2:", body);

        // Espera recibir un objeto con la dirección y place_id
        // {
        //   direccion: { nombre, latitud, longitud, categoria },
        //   place_id: "string"
        // }

        if (!body || !body.clienteId || !body.direccion || !body.direccion.nombre || !body.direccion.latitud || !body.direccion.longitud || !body.direccion.apiId) {
            console.warn("Datos de dirección incompletos:", body);
            return NextResponse.json({ error: "Datos de dirección incompletos" }, { status: 400 });
        }

        // Buscar si ya existe la dirección por place_id
        const { data: direccionExistente, error: busquedaError } = await supabase
            .from("direcciones")
            .select("*")
            .eq("place_id", body.direccion.apiId)
            .single();

        if (busquedaError && busquedaError.code !== 'PGRST116') {
            console.error("Error buscando dirección:", busquedaError);
            return NextResponse.json({ error: "Error buscando dirección" }, { status: 500 });
        }

        console.log("Dirección encontrada:", direccionExistente);

        let direccion = direccionExistente;

        if (!direccion) {
            // Crear nueva dirección
            const { data: nuevaDireccion, error: crearError } = await supabase
                .from("direcciones")
                .insert({
                    direccion_cliente: body.direccion.nombre,
                    place_id: body.direccion.apiId,
                    latitud: body.direccion.latitud,
                    longitud: body.direccion.longitud
                })
                .select()
                .single();

            if (crearError) {
                console.error("Error creando dirección:", crearError);
                return NextResponse.json({ error: "Error creando dirección" }, { status: 500 });
            }

            direccion = nuevaDireccion;
            console.log("Nueva dirección guardada:", direccion);
        } else {
            // Actualizar datos si ya existe
            const { data: direccionActualizada, error: actualizarError } = await supabase
                .from("direcciones")
                .update({
                    direccion_cliente: body.direccion.nombre,
                    latitud: body.direccion.latitud,
                    longitud: body.direccion.longitud,
                    updated_at: new Date().toISOString()
                })
                .eq("id", direccion.id)
                .select()
                .single();

            if (actualizarError) {
                console.error("Error actualizando dirección:", actualizarError);
                return NextResponse.json({ error: "Error actualizando dirección" }, { status: 500 });
            }

            direccion = direccionActualizada;
            console.log("Dirección actualizada:", direccion);
        }
        
        // Verificar que el cliente existe
        const { data: cliente, error: clienteError } = await supabase
            .from("clientes")
            .select("id")
            .eq("id", body.clienteId)
            .single();

        if (clienteError || !cliente) {
            console.error("Cliente no encontrado:", clienteError);
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        // Verificar si ya existe la relación cliente-dirección para evitar duplicados
        const { data: relacionExistente, error: relacionError } = await supabase
            .from("cliente_direcciones_despacho")
            .select("id")
            .eq("cliente_id", body.clienteId)
            .eq("direccion_id", direccion.id)
            .single();

        if (relacionError && relacionError.code !== 'PGRST116') {
            console.error("Error verificando relación cliente-dirección:", relacionError);
            return NextResponse.json({ error: "Error verificando relación" }, { status: 500 });
        }

        // Solo agregar la relación si no existe
        if (!relacionExistente) {
            const { error: insertarRelacionError } = await supabase
                .from("cliente_direcciones_despacho")
                .insert({
                    cliente_id: body.clienteId,
                    direccion_id: direccion.id,
                    comentario: body.comentario || null,
                    activa: true
                });

            if (insertarRelacionError) {
                console.error("Error agregando dirección al cliente:", insertarRelacionError);
                return NextResponse.json({ error: "Error agregando dirección al cliente" }, { status: 500 });
            }

            console.log("Dirección agregada al cliente exitosamente");
        } else {
            console.log("La dirección ya existía para este cliente");
        }

        // Adaptar la respuesta para mantener compatibilidad con el frontend
        const direccionRespuesta = {
            ...direccion,
            _id: direccion.id, // Mantener compatibilidad con frontend
            nombre: direccion.direccion_cliente,
            apiId: direccion.place_id
        };

        return NextResponse.json({ ok: true, direccion: direccionRespuesta });

    } catch (error) {
        console.error("Error registrando dirección:", error);
        return NextResponse.json({ error: "Error registrando dirección" }, { status: 500 });
    }
}