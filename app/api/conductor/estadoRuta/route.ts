import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ error: 'rutaId is required' }, { status: 400 });
        }
        
        const { data: ruta, error } = await supabase
            .from('rutas_despacho')
            .select('estado')
            .eq('id', rutaId)
            .single();
        
        if (error || !ruta) {
            return NextResponse.json({ error: 'Ruta not found' }, { status: 404 });
        }
        
        return NextResponse.json({ estado: ruta.estado });
        
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}