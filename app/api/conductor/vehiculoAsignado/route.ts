import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { IVehiculoView } from "@/types/types";
import { USER_ROLE } from "@/app/utils/constants";

export const GET = migrateAuthEndpoint(async ({ user }, request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) {
            return NextResponse.json({ ok: false, error: 'rutaId is required' }, { status: 400 });
        }

        const { data: rutaDespacho, error: rutaError } = await supabase
            .from('rutas_despacho')
            .select('id, chofer_id, vehiculo_id')
            .eq('id', rutaId)
            .single();

        if (rutaError || !rutaDespacho) {
            return NextResponse.json({ ok: false, error: 'RutaDespacho not found' }, { status: 404 });
        }

        // Access check: either chofer or privileged role
        if (String(rutaDespacho.chofer_id) !== user.id && ![
            USER_ROLE.cobranza,
            USER_ROLE.encargado,
            USER_ROLE.responsable
        ].includes(user.role)) {
            return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
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

        const vehicleView: IVehiculoView = {
            vehiculoId: vehiculo.id,
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo
        };

        return NextResponse.json({ ok: true, vehiculo: vehicleView });
    } catch (error) {
        console.error('ERROR in vehiculo asignado:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
});