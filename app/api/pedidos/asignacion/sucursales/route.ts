import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// GET all sucursales: Fetches _id and nombre of sucursales accessible to the authenticated user.
export async function GET() {
    try {
        const { user, userData } = await getAuthenticatedUser();
        const userId = user.id;
        
        const { data: cargos, error: cargosError } = await supabase
            .from("cargos")
            .select("sucursal_id, dependencia_id:sucursales(id)")
            .eq("usuario_id", userId)
            .in("tipo", [
                TIPO_CARGO.gerente,
                TIPO_CARGO.cobranza,
                TIPO_CARGO.responsable
            ]);

        if (cargosError || !cargos || cargos.length === 0) {
            console.warn(`[GET /sucursales] Cargos not found for user ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "Cargos not found" }, { status: 404 });
        }

        const sucursalIds = cargos.map((cargo) => cargo.sucursal_id);

        const { data: sucursales, error: sucursalesError } = await supabase
            .from("sucursales")
            .select("id, nombre")
            .in("id", sucursalIds)
            .eq("visible", true)
            .order("prioridad", { ascending: true });

        if (sucursalesError) {
            console.error(`[GET /sucursales] Error fetching sucursales:`, sucursalesError);
            return NextResponse.json({ ok: false, error: sucursalesError.message }, { status: 500 });
        }

        const { data: ventas, error: ventasError } = await supabase
            .from("ventas")
            .select("sucursal_id")
            .notIn("estado", [
                TIPO_ESTADO_VENTA.borrador,
                TIPO_ESTADO_VENTA.anulado,
                TIPO_ESTADO_VENTA.pagado,
                TIPO_ESTADO_VENTA.rechazado,
                TIPO_ESTADO_VENTA.entregado
            ])
            .eq("por_cobrar", false);

        if (ventasError) {
            console.error(`[GET /sucursales] Error fetching ventas:`, ventasError);
            return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
        }

        const ventasPorSucursal = ventas.reduce((acc: Record<string, number>, venta) => {
            const sucursalId = venta.sucursal_id;
            if (sucursalId) {
                acc[sucursalId] = (acc[sucursalId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const sucursalesConVentas = sucursales.map((sucursal) => ({
            ...sucursal,
            ventasActivas: ventasPorSucursal[sucursal.id] || 0
        }));

        return NextResponse.json({ sucursales: sucursalesConVentas });
    } catch (error) {
        console.error(`[GET /sucursales] Internal Server Error:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}