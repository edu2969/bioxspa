import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { withAuthorization } from "@/lib/auth/apiAuthorization";
import { TIPO_ESTADO_VENTA, TIPO_ESTADO_RUTA_DESPACHO, ROLES } from "@/app/utils/constants";

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

            // Find the rutaDespacho that contains this venta
            const { data: rutaDespacho, error: rutaError } = await supabase
                .from("rutas_despacho")
                .select("id, venta_ids")
                .contains("venta_ids", [ventaId])
                .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino)
                .single();

            if (rutaError) {
                console.error("Error fetching rutaDespacho:", rutaError);
                return NextResponse.json({ ok: false, error: "Error fetching rutaDespacho" }, { status: 500 });
            }

            if (rutaDespacho) {
                // Remove the ventaId from the rutaDespacho
                const updatedVentaIds = rutaDespacho.venta_ids.filter((id) => id !== ventaId);

                if (updatedVentaIds.length > 0) {
                    await supabase
                        .from("rutas_despacho")
                        .update({ venta_ids: updatedVentaIds })
                        .eq("id", rutaDespacho.id);
                } else {
                    // Delete the route if it becomes empty
                    await supabase
                        .from("rutas_despacho")
                        .delete()
                        .eq("id", rutaDespacho.id);
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