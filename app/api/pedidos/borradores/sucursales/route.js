import { NextResponse } from "next/server";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { supabase } from "@/lib/supabase";

// GET all sucursales: Trae _id y nombre de las sucursales a las cuales el usuario en sessión tiene acceso.
export const GET = migrateAuthEndpoint(async ({ user }) => {
    try {
        const userId = user.id;

        // Fetch cargos for user with allowed roles
        const { data: cargos, error: cargosError } = await supabase
            .from('cargos')
            .select('id, tipo, sucursal_id, dependencia_id')
            .eq('user_id', userId)
            .in('tipo', [
                TIPO_CARGO.gerente,
                TIPO_CARGO.encargado,
                TIPO_CARGO.responsable,
                TIPO_CARGO.cobranza
            ]);

        if (cargosError) {
            console.error('Error fetching cargos:', cargosError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        if (!cargos || cargos.length === 0) {
            return NextResponse.json({ ok: false, error: 'Cargos not found' }, { status: 404 });
        }

        // Map dependencia -> sucursal
        const dependenciaIds = cargos
            .filter(c => c.dependencia_id)
            .map(c => c.dependencia_id);

        let sucursalIds = cargos
            .filter(c => c.sucursal_id)
            .map(c => c.sucursal_id);

        if (dependenciaIds.length > 0) {
            const { data: dependencias, error: depError } = await supabase
                .from('dependencias')
                .select('id, sucursal_id')
                .in('id', dependenciaIds);

            if (depError) {
                console.error('Error fetching dependencias:', depError);
            }

            const depSucursalIds = (dependencias || []).map(d => d.sucursal_id);
            sucursalIds = [...sucursalIds, ...depSucursalIds];
        }

        // Fetch visible sucursales
        const { data: sucursales, error: sucursalesError } = await supabase
            .from('sucursales')
            .select('id, nombre, prioridad')
            .in('id', sucursalIds)
            .eq('visible', true)
            .order('prioridad', { ascending: true });

        if (sucursalesError) {
            console.error('Error fetching sucursales:', sucursalesError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        // Fetch ventas in active states and not por_cobrar
        const { data: ventas, error: ventasError } = await supabase
            .from('ventas')
            .select('id, sucursal_id, estado, por_cobrar')
            .in('estado', [
                TIPO_ESTADO_VENTA.borrador,
                TIPO_ESTADO_VENTA.cotizacion,
                TIPO_ESTADO_VENTA.anulado,
                TIPO_ESTADO_VENTA.rechazado
            ])
            .eq('por_cobrar', false);

        if (ventasError) {
            console.error('Error fetching ventas:', ventasError);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        const ventasPorSucursal = (ventas || []).reduce((acc, venta) => {
            const sucursalId = venta.sucursal_id;
            if (sucursalId) {
                acc[sucursalId] = (acc[sucursalId] || 0) + 1;
            }
            return acc;
        }, {});

        const sucursalesConVentas = (sucursales || []).map(sucursal => ({
            _id: sucursal.id,
            nombre: sucursal.nombre,
            ventasActivas: ventasPorSucursal[sucursal.id] || 0
        }));

        return NextResponse.json({ sucursales: sucursalesConVentas });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});