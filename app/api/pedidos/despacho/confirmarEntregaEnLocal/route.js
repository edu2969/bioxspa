import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { registerArriendosFromVenta } from "@/lib/arriendos/registerArriendosFromVenta";
import { syncBIDeudasFromVentas } from "@/lib/arriendos/syncBIDeudasFromVentas";

export async function POST(request) {
    try {
        const { ventaId } = await request.json();
        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
        }

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

        if(!hasCargo([TIPO_CARGO.despacho, TIPO_CARGO.encargado, TIPO_CARGO.responsable])) {
            return NextResponse.json(
                { ok: false, error: "Usuario no autorizado" },
                { status: 403 }
            );
        }
        
        const supabase = await getSupabaseServerClient();
        
        // Verifica que la venta exista.
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select("id, estado")
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Debe existir una entrega local completa (quien recibe + rut).
        const { data: entregaLocal, error: entregaError } = await supabase
            .from("venta_entregas_local")
            .select("id, nombre_recibe, rut_recibe")
            .eq("venta_id", ventaId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (entregaError) {
            console.error("Error fetching venta_entregas_local:", entregaError);
            return NextResponse.json({ ok: false, error: "Error validating local delivery data" }, { status: 500 });
        }

        const nombreRecibeCompleto = String(entregaLocal?.nombre_recibe || "").trim().length > 0;
        const rutRecibeCompleto = String(entregaLocal?.rut_recibe || "").trim().length > 0;

        if (!entregaLocal || !nombreRecibeCompleto || !rutRecibeCompleto) {
            return NextResponse.json({
                ok: false,
                error: "Entrega en local incompleta: falta nombre o RUT de quien recibe"
            }, { status: 400 });
        }

        // Validar cobertura de detalles por subcategoria: sum(detalle_venta_items) >= sum(cantidad)
        const { data: detalles, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select(`
                id,
                cantidad,
                subcategoria_catalogo_id,
                items:detalle_venta_items(id)
            `)
            .eq("venta_id", ventaId);

        if (detallesError) {
            console.error("Error fetching detalle_ventas:", detallesError);
            return NextResponse.json({ ok: false, error: "Error validating sale details" }, { status: 500 });
        }

        if (!detalles || detalles.length === 0) {
            return NextResponse.json({ ok: false, error: "La venta no tiene detalles" }, { status: 400 });
        }

        const requeridosPorSubcategoria = {};
        const cargadosPorSubcategoria = {};

        for (const detalle of detalles) {
            const subcategoriaId = String(detalle.subcategoria_catalogo_id || "");
            if (!subcategoriaId) continue;

            const cantidadRequerida = Number(detalle.cantidad || 0);
            const cantidadCargada = Array.isArray(detalle.items) ? detalle.items.length : 0;

            requeridosPorSubcategoria[subcategoriaId] = (requeridosPorSubcategoria[subcategoriaId] || 0) + cantidadRequerida;
            cargadosPorSubcategoria[subcategoriaId] = (cargadosPorSubcategoria[subcategoriaId] || 0) + cantidadCargada;
        }

        const subcategoriasIncompletas = Object.keys(requeridosPorSubcategoria)
            .filter((subcategoriaId) => (cargadosPorSubcategoria[subcategoriaId] || 0) < requeridosPorSubcategoria[subcategoriaId]);

        if (subcategoriasIncompletas.length > 0) {
            return NextResponse.json({
                ok: false,
                error: "La venta aun tiene items pendientes por cargar/entregar"
            }, { status: 400 });
        }

        const arriendos = await registerArriendosFromVenta({
            supabase,
            ventaId,
            userId,
            source: "confirmar_entrega_local",
            fechaDesde: venta.fecha,
        });

        const nuevoEstado = TIPO_ESTADO_VENTA.entregado;

        const { error: updateVentaError } = await supabase
            .from("ventas")
            .update({ estado: nuevoEstado, por_cobrar: true })
            .eq("id", ventaId);

        if (updateVentaError) {
            console.error("Error updating venta estado/por_cobrar:", updateVentaError);
            return NextResponse.json({ ok: false, error: "Error updating sale status" }, { status: 500 });
        }

        if (venta.estado !== nuevoEstado) {
            const { error: historialError } = await supabase
                .from("venta_historial_estados")
                .insert({
                    venta_id: ventaId,
                    estado: nuevoEstado,
                    usuario_id: userId
                });

            if (historialError) {
                console.error("Error inserting historial estado:", historialError);
            }
        }

        let biDeudas = { ok: true, source: "confirmar_entrega_local", ventaIds: [ventaId] };
        try {
            biDeudas = await syncBIDeudasFromVentas({
                supabase,
                ventaIds: [ventaId],
                source: "confirmar_entrega_local",
            });
        } catch (biError) {
            console.error("Error sincronizando bi_deudas en confirmarEntregaEnLocal:", biError);
            biDeudas = {
                ok: false,
                source: "confirmar_entrega_local",
                error: biError.message,
                ventaIds: [ventaId],
            };
        }

        return NextResponse.json({ ok: true, estado: nuevoEstado, por_cobrar: true, arriendos, biDeudas });

    } catch (error) {
        console.error("Error in confirmarEntregaEnLocal endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}