import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
    TIPO_ESTADO_VENTA,
    TIPO_CARGO,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_CHECKLIST
} from "@/app/utils/constants";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Fetch ventas
    const { data: ventas, error: ventasError } = await supabase
        .from("ventas")
        .select("*, cliente:clientes(*), items:detalle_venta(*)")
        .eq("sucursal_id", sucursalId)
        .in("estado", [
            TIPO_ESTADO_VENTA.por_asignar,
            TIPO_ESTADO_VENTA.pagado,
            TIPO_ESTADO_VENTA.entregado,
            TIPO_ESTADO_VENTA.cerrado
        ])
        .order("fecha", { ascending: false })
        .limit(25);

    if (ventasError) {
        return NextResponse.json({ ok: false, error: ventasError.message }, { status: 500 });
    }

    const pedidos = ventas.map((venta) => {
        const cliente = venta.cliente || {};
        const items = venta.items || [];        

        return {
            id: venta.id,
            tipo: venta.tipo,
            comentario: venta.comentario || "",
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre || "Desconocido",
            cliente_rut: cliente.rut || "Desconocido",
            estado: venta.estado,
            despacho_en_local: !venta.direccion_despacho_id,
            fecha: venta.fecha,
            items: items.map((item) => ({
                ...item,
                nombre: `${item.categoria_nombre || "Desconocido"} - ${item.subcategoria_nombre || "Desconocido"}`
            }))
        };
        });

    // Fetch choferes
    const { data: choferes, error: choferesError } = await supabase
        .from("cargos")
        .select("usuario_id, usuario:users(*), rutas_despacho(*)")
        .eq("tipo", TIPO_CARGO.conductor)
        .eq("sucursal_id", sucursalId);

    if (choferesError) {
        return NextResponse.json({ ok: false, error: choferesError.message }, { status: 500 });
    }

    const choferesData = choferes.map((chofer) => {
        const user = 
            Array.isArray(chofer.usuario) 
                ? { id: "", name: "Desconocido", checklist: false } 
                : chofer.usuario || { id: "", name: "Desconocido", checklist: false };
        const rutas = chofer.rutas_despacho || [];

        return {
            id: user.id,
            nombre: Array.isArray(user) ? "Desconocido" : user.name,
            pedidos: rutas.map((ruta) => ({
                ...ruta,
                detalles: ruta.detalles || []
            })),
            checklist: false // Default value as 'checklist' is not part of the chofer object
        };
    });

    return NextResponse.json({ pedidos, choferes: choferesData });
}

export async function POST(request) {
    try {
        const { ventaId, choferId } = await request.json();

        if (!ventaId || !choferId) {
            return NextResponse.json({ ok: false, error: "ventaId and choferId are required" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("dependencia_id")
            .eq("usuario_id", choferId)
            .eq("activo", true)
            .single();

        if (cargoError || !cargo) {
            console.log("POST /asignacion - Error fetching cargo:", { choferId, error: cargoError?.message });
            return NextResponse.json({ ok: false, error: "Cargo for chofer not found" }, { status: 404 });
        }

        const dependenciaId = cargo.dependencia_id;
        if (!dependenciaId) {
            return NextResponse.json({ ok: false, error: "No valid dependencia_id found for chofer" }, { status: 400 });
        }

        // Si la venta ya está asociada a alguna ruta, no duplicar.
        const { data: rutaVentaExistente, error: rutaVentaExistenteError } = await supabase
            .from("ruta_despacho_ventas")
            .select("ruta_despacho_id")
            .eq("venta_id", ventaId)
            .maybeSingle();

        if (rutaVentaExistenteError) {
            console.log("POST /asignacion - Error checking existing ruta venta:", { ventaId, error: rutaVentaExistenteError.message });
            return NextResponse.json({ ok: false, error: "Failed to validate venta assignment" }, { status: 500 });
        }

        if (rutaVentaExistente) {
            return NextResponse.json({ ok: true, rutaId: rutaVentaExistente.ruta_despacho_id, reusedRoute: true, alreadyAssigned: true });
        }

        // Buscar ruta activa existente del chofer (no crear una nueva si ya existe).
        const { data: rutaActiva, error: rutaActivaError } = await supabase
            .from("rutas_despacho")
            .select("id")
            .eq("conductor_id", choferId)
            .eq("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (rutaActivaError) {
            console.log("POST /asignacion - Error checking active ruta:", { choferId, error: rutaActivaError.message });
            return NextResponse.json({ ok: false, error: "Failed to validate active route" }, { status: 500 });
        }

        let rutaId = rutaActiva?.id || null;
        let reusedRoute = Boolean(rutaId);

        if (!rutaId) {
            // Solo si no existe ruta activa: buscar checklist y crear ruta.
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const { data: todayChecklist, error: checklistError } = await supabase
                .from("checklists")
                .select("vehiculo_id")
                .eq("usuario_id", choferId)
                .eq("tipo", TIPO_CHECKLIST.vehiculo)
                .gte("created_at", startOfToday.toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (checklistError || !todayChecklist) {
                return NextResponse.json({ ok: false, error: checklistError ? "Error fetching checklist: " + checklistError.message : "No checklist found for today" }, { status: 500 });
            }

            const vehiculoIdToAssign = todayChecklist.vehiculo_id || null;

            const insertPayload = {
                conductor_id: choferId,
                dependencia_id: dependenciaId,
                estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                hora_inicio: new Date(),
                hora_destino: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            if (vehiculoIdToAssign) insertPayload.vehiculo_id = vehiculoIdToAssign;

            const { data: nuevaRuta, error: createRutaError } = await supabase
                .from("rutas_despacho")
                .insert(insertPayload)
                .select("id")
                .single();

            if (createRutaError || !nuevaRuta) {
                console.log("POST /asignacion - Error creating ruta:", { choferId, error: createRutaError?.message });
                return NextResponse.json({ ok: false, error: "Failed to create RutaDespacho" }, { status: 500 });
            }

            rutaId = nuevaRuta.id;
            reusedRoute = false;

            // Historial inicial solo cuando se crea la ruta.
            const { error: historialError } = await supabase
                .from("ruta_despacho_historial_estados")
                .insert({
                    ruta_despacho_id: rutaId,
                    estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                    usuario_id: choferId
                });

            if (historialError) {
                console.log("POST /asignacion - Error logging initial ruta state:", { rutaId, error: historialError.message });
                return NextResponse.json({ ok: false, error: "Failed to log initial RutaDespacho state" }, { status: 500 });
            }
        }

        // Update venta state
        const { error: ventaError } = await supabase
            .from("ventas")
            .update({ estado: TIPO_ESTADO_VENTA.preparacion })
            .eq("id", ventaId);

        if (ventaError) {
            console.log("POST /asignacion - Error updating venta:", { ventaId, error: ventaError.message });
            return NextResponse.json({ ok: false, error: ventaError.message }, { status: 500 });
        }

        const { error: rutaVentaError } = await supabase
            .from("ruta_despacho_ventas")
            .insert({
                ruta_despacho_id: rutaId,
                venta_id: ventaId,
                created_at: new Date()
            });

        if (rutaVentaError) {
            console.log("POST /asignacion - Error associating venta with ruta:", { rutaId, ventaId, error: rutaVentaError.message });
            return NextResponse.json({ ok: false, error: "Failed to associate venta with RutaDespacho" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, rutaId, reusedRoute });
    } catch (error) {
        console.error("Error in POST /asignacion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}