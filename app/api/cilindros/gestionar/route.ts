import { NextRequest, NextResponse } from "next/server";
import { TIPO_CARGO } from "@/app/utils/constants";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
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
                if(campo === 'fecha_mantencion' && updateData[campo] === '') {
                    continue;
                }
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