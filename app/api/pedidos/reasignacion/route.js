import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuthorization } from "@/lib/auth/apiAuthorization";
import { TIPO_ESTADO_VENTA, ROLES } from "@/app/utils/constants";

export const POST = withAuthorization(
    async (req, user) => {
        try {
            // Get ventaId from request
            const { ventaId } = await req.json();

            // Validate ventaId
            if (!ventaId) {
                return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
            }

            // Verify user has the required role (manager or supervisor)
            if (!user.roles.some((role) => [ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.COLLECTIONS].includes(role))) {
                return NextResponse.json({
                    ok: false,
                    error: "Insufficient permissions - requires manager or supervisor role",
                }, { status: 403 });
            }

            // Find the ruta_ventas entry that contains this venta
            const { data: rutaVenta, error: rutaVentaError } = await supabase
                .from("ruta_ventas")
                .select("id, ruta_id")
                .eq("venta_id", ventaId)
                .single();

            if (rutaVentaError) {
                console.error("Error fetching ruta_ventas entry:", rutaVentaError);
                return NextResponse.json({ ok: false, error: "Error fetching ruta_ventas entry" }, { status: 500 });
            }

            if (rutaVenta) {
                // Delete the ruta_ventas entry
                const { error: deleteError } = await supabase
                    .from("ruta_ventas")
                    .delete()
                    .eq("id", rutaVenta.id);

                if (deleteError) {
                    console.error("Error deleting ruta_ventas entry:", deleteError);
                    return NextResponse.json({ ok: false, error: "Error deleting ruta_ventas entry" }, { status: 500 });
                }

                // Check if the ruta_despacho has any remaining ventas
                const { data: remainingVentas, error: remainingVentasError } = await supabase
                    .from("ruta_ventas")
                    .select("id")
                    .eq("ruta_id", rutaVenta.ruta_id);

                if (remainingVentasError) {
                    console.error("Error checking remaining ventas for ruta_despacho:", remainingVentasError);
                    return NextResponse.json({ ok: false, error: "Error checking remaining ventas for ruta_despacho" }, { status: 500 });
                }

                if (remainingVentas.length === 0) {
                    // Delete the ruta_despacho if it has no remaining ventas
                    const { error: deleteRutaError } = await supabase
                        .from("rutas_despacho")
                        .delete()
                        .eq("id", rutaVenta.ruta_id);

                    if (deleteRutaError) {
                        console.error("Error deleting ruta_despacho:", deleteRutaError);
                        return NextResponse.json({ ok: false, error: "Error deleting ruta_despacho" }, { status: 500 });
                    }
                }
            }

            // Update the venta status back to "por_asignar"
            const { error: ventaError } = await supabase
                .from("ventas")
                .update({ estado: TIPO_ESTADO_VENTA.por_asignar })
                .eq("id", ventaId);

            if (ventaError) {
                console.error("Error updating venta status:", ventaError);
                return NextResponse.json({ ok: false, error: "Error updating venta status" }, { status: 500 });
            }

            return NextResponse.json({
                ok: true,
                message: "Venta successfully unassigned and returned to draft status",
            });
        } catch (error) {
            console.error("Error in POST /reasignacion:", error);
            return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
        }
    },
    {
        resource: "pedidos",
        action: "update",
        allowedRoles: [ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.COLLECTIONS],
    }
);