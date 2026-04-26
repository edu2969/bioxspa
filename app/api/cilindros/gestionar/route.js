import {NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getCampoSubase } from "@/lib/nomenclatura-utils";

export async function POST(request) {
    try {
        const body = await request.json();
        const { itemId, ...updateData } = body;

        if (!itemId && !body.nuevo) {
            console.log("[gestionar] No se incluye itemId");
            return NextResponse.json({ ok: false, error: "Missing itemId", codigo: body.codigo }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();

        // Campos permitidos para actualizar
        const camposPermitidos = [
            'codigo',
            'estado',
            'carga',
            'garantiaAnual',
            'propietarioId',
            'stockMinimo',
            'stockActual',
            'fechaMantencion',
            'direccionId',
            'subcategoriaCatalogoId',
        ];

        const datosActualizacion = {};
        for (const campo of camposPermitidos) {
            const campoSupabase = getCampoSubase(campo);
            if (updateData.hasOwnProperty(campo)) {
                if (campo === 'fechaMantencion' && updateData[campo] === '') {
                    continue;
                }
                datosActualizacion[campoSupabase] = updateData[campo];
            }
        }

        if (Object.keys(datosActualizacion).length === 0) {
            console.log("[gestionar] No valid fields to update");
            return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
        }

        console.log("Payload para insertar: ", datosActualizacion);

        let dataItem;
        if (itemId) {
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
                return NextResponse.json({ ok: false, error: "Item not found", codigo: body.codigo }, { status: 404 });
            }

            dataItem = data;
        } else {
            const { data, error } = await supabase
                .from('items_catalogo')
                .insert(datosActualizacion);
            
            console.log("Data insert -->", data);

            if(error) {
                console.error("Error to insert item:", error);
                return NextResponse.json({ ok: false, error: error.message }, { status: 500 });                
            }

            if (!data || data.length === 0) {
                return NextResponse.json({ ok: false, error: "Item not inserted?", codigo: body.codigo }, { status: 404 });
            }

            dataItem = data;
        }

        return NextResponse.json({
            ok: true,
            message: "Item updated successfully",
            item: dataItem[0]
        });

    } catch (error) {
        console.error("Error updating item:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}