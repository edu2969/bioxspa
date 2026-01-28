import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { TIPO_CARGO } from "@/app/utils/constants";
import { supabase } from "@/lib/supabase";

const ROLES_PERMITIDOS = [
    TIPO_CARGO.encargado,
    TIPO_CARGO.cobranza,
    TIPO_CARGO.responsable,
    TIPO_CARGO.despacho,
    TIPO_CARGO.conductor,
    TIPO_CARGO.gerente
];

async function verificarAutorizacion() {
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;

    if (error || !session || !session.user) {
        return { authorized: false, error: "Unauthorized" };
    }

    const { data: cargo, error: cargoError } = await supabase
        .from('cargos')
        .select('*')
        .eq('usuario_id', session.user.id)
        .in('tipo', ROLES_PERMITIDOS)
        .single();

    if (cargoError || !cargo) {
        return { authorized: false, error: "Cargo not found or insufficient permissions" };
    }

    return { authorized: true, userId: session.user.id };
}

export async function POST(request: NextRequest) {
    await connectMongoDB();

    const auth = await verificarAutorizacion();
    if (!auth.authorized) {
        return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { itemId, ...updateData } = body;

        console.log("Received update request for itemId:", itemId);
        console.log("Update data:", updateData);

        if (!itemId) {
            return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 });
        }

        // Campos permitidos para actualizar
        const camposPermitidos = [
            'codigo',
            'estado',
            'nombre',
            'descripcion',
            'descripcion_corta',
            'ficha_tecnica',
            'url_ficha_tecnica',
            'url_imagen',
            'garantia_anual',
            'destacado',
            'stock_minimo',
            'stock_actual',
            'visible',
            'fecha_mantencion',
            'direccion_id',
        ];

        const datosActualizacion: Record<string, any> = {};
        for (const campo of camposPermitidos) {
            if (updateData.hasOwnProperty(campo)) {
                datosActualizacion[campo] = updateData[campo];
            }
        }

        if (Object.keys(datosActualizacion).length === 0) {
            return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('items_catalogo')
            .update(datosActualizacion)
            .eq('id', itemId)
            .select();

        if (error) {
            console.error("Error updating item:", error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            ok: true, 
            message: "Item updated successfully",
            item: data[0] 
        });

    } catch (error) {
        console.error("Error updating item:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}