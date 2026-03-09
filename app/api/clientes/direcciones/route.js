import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// filepath: d:\git\bioxspa\app\api\clientes\direcciones\route.js

export async function POST(req) {
    console.log("[POST /api/clientes/direcciones] Request received");

    try {
        const body = await req.json();
        const { id, nombre, latitud, longitud, comentario, clienteId } = body;

        if (!clienteId || !nombre) {
            console.warn("[POST /api/clientes/direcciones] Missing required fields");
            return NextResponse.json(
                { error: "clienteId and nombre are required" },
                { status: 400 }
            );
        }

        const supabase = await getSupabaseServerClient();

        if (id) {
            // Update existing address
            console.log(`[POST /api/clientes/direcciones] Updating address with ID: ${id}`);
            const { data, error } = await supabase
                .from("direcciones")
                .update({
                    nombre,
                    latitud,
                    longitud,
                    comentario: comentario || null
                })
                .eq("id", id)
                .eq("cliente_id", clienteId)
                .select()
                .single();

            if (error) {
                console.error(`[POST /api/clientes/direcciones] Error updating address: ${error.message}`);
                return NextResponse.json({ error: "Error updating address" }, { status: 500 });
            }

            console.log(`[POST /api/clientes/direcciones] Successfully updated address with ID: ${id}`);
            return NextResponse.json({ ok: true, direccion: data }, { status: 200 });
        } else {
            // Create new address
            console.log(`[POST /api/clientes/direcciones] Creating new address for cliente ID: ${clienteId}`);
            const { data, error } = await supabase
                .from("direcciones")
                .insert([
                    {
                        cliente_id: clienteId,
                        nombre,
                        latitud,
                        longitud,
                        comentario: comentario || null
                    }
                ])
                .select()
                .single();

            if (error) {
                console.error(`[POST /api/clientes/direcciones] Error creating address: ${error.message}`);
                return NextResponse.json({ error: "Error creating address" }, { status: 500 });
            }

            console.log(`[POST /api/clientes/direcciones] Successfully created address with ID: ${data.id}`);
            return NextResponse.json({ ok: true, direccion: data }, { status: 201 });
        }
    } catch (error) {
        console.error(
            `[POST /api/clientes/direcciones] Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}