import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const { data: cliente, error } = await supabase
            .from("clientes")
            .select(`
                id,
                nombre,
                giro,
                rut,
                direccion_id,
                telefono,
                email,
                email_intercambio,
                orden_compra,
                arriendo,
                cilindros_min,
                cilindros_max,
                activo,
                en_quiebra,
                direcciones_despacho:cliente_direcciones_despacho(direccion_id(id, nombre, latitud, longitud)),
                documento_tributario_id,
                credito,
                meses_aumento
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("[GET] Error fetching cliente:", error);
            return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, cliente });
    } catch (error) {
        console.error("[GET] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const entity = await req.json();
        console.log("[POST] Datos recibidos:", entity);

        const { data: existingCliente, error: fetchError } = await supabase
            .from("clientes")
            .select("id")
            .eq("id", entity.id)
            .single();

        if (fetchError && fetchError.code !== "PGRST116") {
            console.error("[POST] Error checking existing cliente:", fetchError);
            return NextResponse.json({ error: "Error checking existing cliente" }, { status: 500 });
        }

        if (existingCliente) {
            const { error: updateError } = await supabase
                .from("clientes")
                .update(entity)
                .eq("id", entity.id);

            if (updateError) {
                console.error("[POST] Error updating cliente:", updateError);
                return NextResponse.json({ error: "Error updating cliente" }, { status: 500 });
            }

            console.log("[POST] Cliente actualizado correctamente");
            return NextResponse.json({ ok: true, cliente: entity });
        } else {
            const { data: newCliente, error: createError } = await supabase
                .from("clientes")
                .insert(entity)
                .single();

            if (createError) {
                console.error("[POST] Error creating cliente:", createError);
                return NextResponse.json({ error: "Error creating cliente" }, { status: 500 });
            }

            console.log("[POST] Nuevo cliente creado:", newCliente);
            return NextResponse.json({ ok: true, cliente: newCliente });
        }
    } catch (error) {
        console.error("[POST] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}