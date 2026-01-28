import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import {
    TIPO_ESTADO_VENTA,
    TIPO_CARGO,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_CHECKLIST,
    TIPO_ORDEN
} from "@/app/utils/constants";

export async function GET(request: NextRequest) {
    const { user, userData } = await getAuthenticatedUser();
    const userTipoCargo = userData.role;

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
    }

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

        interface Cliente {
            id: string;
            nombre?: string;
            rut?: string;
        }

        interface Item {
            categoria_nombre?: string;
            subcategoria_nombre?: string;
        }

        interface Venta {
            id: string;
            tipo: string;
            comentario?: string;
            cliente?: Cliente;
            estado: string;
            direccion_despacho_id?: string;
            fecha: string;
            items?: Item[];
        }

        return {
            _id: venta.id,
            tipo: venta.tipo,
            comentario: venta.comentario || "",
            clienteId: cliente.id,
            clienteNombre: cliente.nombre || "Desconocido",
            clienteRut: cliente.rut || "Desconocido",
            estado: venta.estado,
            despachoEnLocal: !venta.direccion_despacho_id,
            fecha: venta.fecha,
            items: items.map((item: Item) => ({
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
        const user: { id: string; name: string; checklist: boolean } = 
            Array.isArray(chofer.usuario) 
                ? { id: "", name: "Desconocido", checklist: false } 
                : chofer.usuario || { id: "", name: "Desconocido", checklist: false };
        const rutas = chofer.rutas_despacho || [];

        return {
            _id: user.id,
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

export async function POST(request: NextRequest) {
    try {
        const { ventaId, choferId } = await request.json();

        if (!ventaId || !choferId) {
            return NextResponse.json({ ok: false, error: "ventaId and choferId are required" }, { status: 400 });
        }

        // Update venta state
        const { error: ventaError } = await supabase
            .from("ventas")
            .update({ estado: TIPO_ESTADO_VENTA.preparacion })
            .eq("id", ventaId);

        if (ventaError) {
            return NextResponse.json({ ok: false, error: ventaError.message }, { status: 500 });
        }

        // Check if chofer has an existing ruta
        const { data: rutaExistente, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select("*")
            .eq("chofer_id", choferId)
            .eq("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
            .single();

        if (rutaError && rutaError.code !== "PGRST116") {
            return NextResponse.json({ ok: false, error: rutaError.message }, { status: 500 });
        }

        if (rutaExistente) {
            // Add venta to existing ruta
            const { error: updateRutaError } = await supabase
                .from("rutas_despacho")
                .update({ venta_ids: [...rutaExistente.venta_ids, ventaId] })
                .eq("id", rutaExistente.id);

            if (updateRutaError) {
                return NextResponse.json({ ok: false, error: updateRutaError.message }, { status: 500 });
            }

            return NextResponse.json({ ok: true, message: "Venta added to existing RutaDespacho" });
        }

        // Create a new ruta
        const { error: createRutaError } = await supabase
            .from("rutas_despacho")
            .insert({
                chofer_id: choferId,
                estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                venta_ids: [ventaId]
            });

        if (createRutaError) {
            return NextResponse.json({ ok: false, error: createRutaError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error in POST /asignacion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}