import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase/supabase-auth';
import { USER_ROLE } from '@/app/utils/constants';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        const { user } = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Fetch ruta with nested destinos and conductor info
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, conductor_id, conductor:usuarios(id, nombre), ruta_destinos(id, direccion:direcciones(id, nombre), created_at)')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[rutaEnTransito] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'Ruta not found' }, { status: 404 });

        // Permission: conductor or specific roles
        const isConductor = String(rutaData.conductor_id) === String(user.id);
        if (!isConductor) {
            const { data: userRow, error: userErr } = await supabase
                .from('usuarios')
                .select('id, nombre, role')
                .eq('id', user.id)
                .maybeSingle();
            if (userErr) console.error('[rutaEnTransito] Error fetching user row:', userErr);
            const role = userRow?.role ?? 0;
            const allowed = [USER_ROLE.conductor, USER_ROLE.cobranza, USER_ROLE.encargado, USER_ROLE.responsable];
            if (!allowed.includes(role)) {
                return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
            }
        }

        // Determine latest destino by created_at
        let direccionDestino = '';
        const destinos = rutaData.ruta_destinos || [];
        if (destinos.length > 0) {
            destinos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            direccionDestino = destinos[0]?.direccion?.nombre || '';
        }

        const rutaEnTransito = {
            ruta_id: rutaData.id,
            direccion_destino: direccionDestino,
            nombre_chofer: rutaData.conductor?.nombre || 'Desconocido'
        };

        return NextResponse.json({ ok: true, rutaEnTransito });

    } catch (error) {
        console.error('Error al obtener ruta en tránsito:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}