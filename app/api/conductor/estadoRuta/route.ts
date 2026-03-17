import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ error: 'rutaId is required' }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        
        const { data: ruta, error } = await supabase
            .from('rutas_despacho')
            .select('estado')
            .eq('id', rutaId)
            .single();
        
        return NextResponse.json({ estado: ruta ? ruta.estado : -1 });
        
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}