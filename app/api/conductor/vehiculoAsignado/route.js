import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        console.log(`[GET /sucursales] Authenticated user:`, authResult);
        
        if (!authResult || !authResult.userData) {
            console.warn(`[GET /sucursales] No authenticated user found.`);
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: 'rutaId is required' }, { status: 400 });
        }

        const { data: rutaDespacho, error: rutaError } = await supabase
            .from('rutas_despacho')
            .select('id, conductor_id, vehiculo_id')
            .eq('id', rutaId)
            .single();

        if (rutaError || !rutaDespacho) {
            return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });
        }

        if (!rutaDespacho.vehiculo_id) {
            return NextResponse.json({ ok: false, error: 'No vehicle assigned' }, { status: 400 });
        }

        const { data: vehiculo, error: vehiculoError } = await supabase
            .from('vehiculos')
            .select('id, marca, modelo, patente')
            .eq('id', rutaDespacho.vehiculo_id)
            .single();

        if (vehiculoError || !vehiculo) {
            return NextResponse.json({ ok: false, error: 'Vehiculo not found' }, { status: 404 });
        }

        const vehicleView = {
            vehiculo_id: vehiculo.id,
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo
        };

        return NextResponse.json({ ok: true, vehiculo: vehicleView });
    } catch (error) {
        console.error('ERROR in vehiculo asignado:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}