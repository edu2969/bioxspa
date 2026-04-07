import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { NextResponse } from "next/server";
import {
    TIPO_CARGO,
    TIPO_ESTADO_VENTA,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_ORDEN
} from "@/app/utils/constants";
import { getSupabaseServerClient } from "@/lib/supabase";


export async function GET() {   
    try {
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }

        const { user, userData } = authResult.data;
        const userId = user.id;
        const userCargoTypes = (userData.cargos || []).map((cargo) => cargo.tipo);
        const hasCargo = (allowedCargoTypes) =>
            userCargoTypes.some((cargoType) => allowedCargoTypes.includes(cargoType));
        

        // COBRANZA
        if (hasCargo([TIPO_CARGO.encargado, TIPO_CARGO.cobranza])) {

            // Contar ventas por estado
            const { data: ventas, error: ventasError } = await supabase
                .from('ventas')
                .select('estado, direccion_despacho_id')
                .gte('estado', TIPO_ESTADO_VENTA.borrador)
                .lt('estado', TIPO_ESTADO_VENTA.entregado);

            if (ventasError) {
                console.log("Error fetching ventas:", ventasError);
                return NextResponse.json({ ok: false, error: "Error fetching ventas" }, { status: 500 });
            }

            console.log("Ventas para cobranza:", ventas);

            const pedidosCount = ventas?.filter((v) => v.estado === TIPO_ESTADO_VENTA.borrador).length || 0;
            const porAsignar = ventas?.filter((v) => v.estado === TIPO_ESTADO_VENTA.por_asignar).length || 0;
            const preparacion = ventas?.filter((v) => v.estado === TIPO_ESTADO_VENTA.preparacion).length || 0;
            const enRuta = (ventas?.length || 0) - pedidosCount - porAsignar - preparacion;

            // Clientes activos
            const { count: clientesActivos, error: clientesError } = await supabase
                .from('clientes')
                .select('id', { count: 'exact' });

            if (clientesError) {
                throw clientesError;
            }

            return NextResponse.json({
                ok: true,
                data: [
                    pedidosCount,
                    porAsignar,
                    preparacion,
                    enRuta,
                    clientesActivos
                ]
            });
        }

        // DESPACHO ó RESPONSABLE
        if (hasCargo([TIPO_CARGO.despacho, TIPO_CARGO.responsable])) {
            // Prefer cargo data already loaded by auth helper to avoid extra query.
            const userCargoFromAuth = (userData.cargos || []).find((cargo) =>
                [TIPO_CARGO.despacho, TIPO_CARGO.responsable].includes(cargo.tipo)
            );

            let dependenciaId = userCargoFromAuth?.dependencia_id || null;

            if (!dependenciaId) {
                const { data: userCargo, error: cargoError } = await supabase
                    .from('cargos')
                    .select('dependencia_id')
                    .eq('usuario_id', userId)
                    .in('tipo', [TIPO_CARGO.despacho, TIPO_CARGO.responsable])
                    .is('hasta', null)
                    .single();

                if (cargoError || !userCargo) {
                    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
                }

                dependenciaId = userCargo.dependencia_id;
            }

            // Find ventas in estado 'preparacion' for choferes in the dependencia
            const { data: ventas, error: ventasError } = await supabase
                .from('ventas')
                .select('id')
                .in('estado', [TIPO_ESTADO_VENTA.preparacion, 
                    TIPO_ESTADO_VENTA.por_asignar]);

            console.log("Ventas para despacho/responsable:", ventas);

            if (ventasError) {
                console.log("Error fetching ventas:", ventasError);
                return NextResponse.json({ ok: false, error: "Error fetching ventas" }, { status: 500 });
            }

            return NextResponse.json({ ok: true, data: [ventas?.length || 0] });
        }

        // CHOFER
        if (hasCargo([TIPO_CARGO.conductor])) {
            const { data: unaRuta, error: rutaError } = await supabase
                .from('rutas_despacho')
                .select('id')
                .gte('estado', TIPO_ESTADO_RUTA_DESPACHO.preparacion)
                .lt('estado', TIPO_ESTADO_RUTA_DESPACHO.terminado)
                .eq('conductor_id', userId);

            if (rutaError) {
                throw rutaError;
            }

            console.log("UnaRUta", unaRuta);

            return NextResponse.json({ ok: true, data: [unaRuta && unaRuta.length > 0 ? 1 : 0] });
        }    

        // Otros roles: respuesta vacía
        return NextResponse.json({ ok: true, message: "No data for this role.", contadores: [] });
    } catch (error) {
        console.error('❌ Error en API /home:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}