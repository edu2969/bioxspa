import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { USER_ROLE, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from '@/app/utils/constants';

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Fetch ruta with nested destinos and conductor info
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, estado, conductor_id, conductor:usuarios(id, nombre), ruta_despacho_destinos(id, direccion:direcciones(id, direccion_cliente), fecha_arribo)')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[rutaEnTransito] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'Ruta not found' }, { status: 404 });

        // Permission: conductor or specific roles
        const isConductor = String(rutaData.conductor_id) === String(authResult.userData.id);
        if (!isConductor) {
            const { data: userRow, error: userErr } = await supabase
                .from('usuarios')
                .select('id, nombre, role')
                .eq('id', authResult.userData.id)
                .maybeSingle();
            if (userErr) console.error('[rutaEnTransito] Error fetching user row:', userErr);
            const role = userRow?.role ?? 0;
            const allowed = [USER_ROLE.conductor, USER_ROLE.cobranza, USER_ROLE.encargado, USER_ROLE.responsable];
            if (!allowed.includes(role)) {
                return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
            }
        }

        // Determina el último destino
        let direccionDestino = '';
        if(rutaData.estado === TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino) {
            // Si hay solo una venta sin entregar, la dirección de despacho es de esa venta
            const { data: ventas, error: ventasErr } = await supabase
            .from('ruta_despacho_ventas')
            .select('id, venta_id(id, estado, direccion_despacho_id(direccion_cliente))')
            .eq('ruta_despacho_id', rutaId);
            
            if(ventasErr) {
                console.log("[rutaEnTransito] Error al obtener las ventas de la ruta");
                return NextResponse.json({ ok: false, error: 'Error al obtener las ventas de la ruta'}, { status: 500 });
            }

            if(!ventas) {
                console.log("[rutaEnTransito] No hay ventas para la ruta");
                return NextResponse.json({ ok: false, error: 'No hay ventas para la ruta' }, { status: 400 });
            }

            if(ventas.filter(v => v.venta_id.estado < TIPO_ESTADO_VENTA.entregado).length === 1) {
                direccionDestino = ventas[0].venta_id.direccion_despacho_id.direccion_cliente;
            } else {
                direccionDestino = 'Selección de destino';
            }
        } else {
            const destinoSinArribo = rutaData.ruta_despacho_destinos.find(d => d.fecha_arribo == null);
            if(destinoSinArribo) {
                direccionDestino = destinoSinArribo.direccion.direccion_cliente;
            } else {
                const destinos = rutaData.ruta_despacho_destinos.sort((a, b) => (new Date(b.fecha_arribo).getTime() - new Date(a.fecha_arribo).getTime()));
                console.log("Destinos ordenados", destinos);
                direccionDestino = destinos[0].direccion.direccion_cliente;
            }
        }
        
        const rutaEnTransito = {
            rutaId: rutaData.id,
            direccionDestino: direccionDestino,
            nombreChofer: rutaData.conductor?.nombre || 'Desconocido'
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