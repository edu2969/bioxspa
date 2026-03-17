import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getCampoSubase } from "@/lib/nomenclatura-utils";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { itemId, ...updateData } = body;

        if (!itemId) {
            return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();

        // Campos permitidos para actualizar
        const camposPermitidos = [
            'codigo',
            'estado',
            'nombre',
            'descripcion',
            'descripcionCorta',
            'fichaTecnica',
            'urlFichaTecnica',
            'urlImagen',
            'garantiaAnual',
            'destacado',
            'stockMinimo',
            'stockActual',
            'visible',
            'fechaMantencion',
            'direccionId',
        ];

        const datosActualizacion: Record<string, any> = {};
        for (const campo of camposPermitidos) {
            const campoSupabase = getCampoSubase(campo);
            if (updateData.hasOwnProperty(campo)) {
                if(campo === 'fechaMantencion' && updateData[campo] === '') {
                    continue;
                }                
                datosActualizacion[campoSupabase] = updateData[campo];                
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