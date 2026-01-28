import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Obtener todos los vehículos
export async function GET() {
    // Fetch all vehicles from Supabase
    const { data: vehiculos, error } = await supabase
        .from('vehiculos')
        .select('id, marca, modelo, patente, chofer_ids');

    if (error) {
        console.error('Error fetching vehiculos:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ vehiculos });
}

// Actualiza o crea un vehículo
export async function POST(request) {
    const data = await request.json();
    const { _id, ...vehiculoData } = data;

    try {
        if (_id) {
            const { data: vehiculo, error } = await supabase
                .from('vehiculos')
                .update(vehiculoData)
                .eq('id', _id)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ ok: true, vehiculo });
        } else {
            const { data: vehiculo, error } = await supabase
                .from('vehiculos')
                .insert(vehiculoData)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ ok: true, vehiculo });
        }
    } catch (error) {
        console.error("Error al guardar el vehículo:", error);
        return NextResponse.json({ ok: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}