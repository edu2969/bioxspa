import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { NextResponse } from "next/server";
import {
    TIPO_CARGO,
    TIPO_ESTADO_VENTA,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_ORDEN
} from "@/app/utils/constants";
import supabase from "@/lib/supabase";

export async function GET() {   
    try {
        const { user, userData } = await getAuthenticatedUser();
        const userTipoCargo = userData.role;
        const userId = user.id;

        // COBRANZA
        if (userTipoCargo === TIPO_CARGO.encargado || userTipoCargo === TIPO_CARGO.cobranza) {

            // Contar ventas por estado
            const { data: ventas, error: ventasError } = await supabase
                .from('ventas')
                .select('estado, direccion_despacho_id')
                .gte('estado', TIPO_ESTADO_VENTA.borrador)
                .lte('estado', TIPO_ESTADO_VENTA.reparto);

            if (ventasError) {
                throw ventasError;
            }

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
        if (userTipoCargo === TIPO_CARGO.despacho || userTipoCargo === TIPO_CARGO.responsable) {
            // Find the user's cargo
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

            // Find all chofer cargos in the same dependencia
            const { data: choferCargos, error: choferError } = await supabase
                .from('cargos')
                .select('usuario_id')
                .eq('dependencia_id', userCargo.dependencia_id)
                .eq('tipo', TIPO_CARGO.conductor)
                .is('hasta', null);

            if (choferError) {
                throw choferError;
            }

            const conductorIds = choferCargos?.map((cargo) => cargo.usuario_id) || [];

            // Find ventas in estado 'preparacion' for choferes in the dependencia
            const { data: ventas, error: ventasError } = await supabase
                .from('ventas')
                .select('id, estado, direccion_despacho_id, tipo')
                .or(`estado.eq.${TIPO_ESTADO_VENTA.preparacion},and(estado.eq.${TIPO_ESTADO_VENTA.por_asignar},direccion_despacho_id.is.null),estado.eq.${TIPO_ESTADO_VENTA.entregado}`);

            if (ventasError) {
                throw ventasError;
            }

            const ventaIds = ventas?.filter(venta => {
                if (venta.estado === TIPO_ESTADO_VENTA.entregado) {
                    return venta.tipo === TIPO_ORDEN.traslado;
                }
                return true;
            }).map(venta => venta.id) || [];

            const ventasDespachoEnLocal = ventas?.filter((venta) => !venta.direccion_despacho_id).length || 0;

            // Count rutasDespacho where the ventas are present
            const { data: rutas, error: rutasError } = await supabase
                .from('rutas_despacho')
                .select('id')
                .in('conductor_id', conductorIds)
                .in('estado', [
                    TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                    TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado
                ]);

            if (rutasError) {
                throw rutasError;
            }

            const contadores = rutas ? rutas.length : 0;

            return NextResponse.json({ ok: true, data: [contadores + ventasDespachoEnLocal] });
        }

        // CHOFER
        if (userTipoCargo === TIPO_CARGO.conductor) {
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
        return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
    }
}