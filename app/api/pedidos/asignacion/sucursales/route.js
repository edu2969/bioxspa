import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// GET all sucursales: Fetches _id and nombre of sucursales accessible to the authenticated user.
export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        console.log(`[GET /sucursales] Authenticated user:`, authResult);
        
        if (!authResult || !authResult.userData) {
            console.warn(`[GET /sucursales] No authenticated user found.`);
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        
        const userId = authResult.userData.id;
        const userCargos = authResult.userData.cargos || [];
        
        // Si ya tenemos los cargos del usuario, podemos usarlos directamente
        console.log(`[GET /sucursales] User ID: ${userId}, Cargos:`, userCargos);
        // Filtrar cargos que tienen los tipos permitidos y sucursal_id
        const cargosPermitidos = userCargos.filter(cargo => 
            [TIPO_CARGO.gerente, TIPO_CARGO.cobranza, TIPO_CARGO.responsable, TIPO_CARGO.encargado].includes(cargo.tipo) &&
            cargo.sucursal_id
        );
        
        if (cargosPermitidos.length === 0) {
            console.warn(`[GET /sucursales] No valid cargos found for user ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "No authorized sucursales found" }, { status: 404 });
        }

        const sucursalIds = cargosPermitidos.map((cargo) => cargo.sucursal_id);

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

        const ventasPorSucursal = ventas.reduce((acc, venta) => {
            const sucursalId = venta.sucursal_id;
            if (sucursalId) {
                acc[sucursalId] = (acc[sucursalId] || 0) + 1;
            }
            return acc;
        }, {});

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