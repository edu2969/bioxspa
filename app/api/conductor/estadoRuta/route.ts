import { NextRequest, NextResponse } from 'next/server';
import RutaDespacho from '@/models/rutaDespacho';
import { connectMongoDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        await connectMongoDB();
        
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ error: 'rutaId is required' }, { status: 400 });
        }
        
        const ruta = await RutaDespacho.findById(rutaId).select('estado');
        
        if (!ruta) {
            return NextResponse.json({ error: 'Ruta not found' }, { status: 404 });
        }
        
        return NextResponse.json({ estado: ruta.estado });
        
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}