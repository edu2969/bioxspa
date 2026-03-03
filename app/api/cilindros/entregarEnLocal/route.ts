import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO } from "@/app/utils/constants";

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user from Supabase
        const { data: user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Usuario no autenticado" }, { status: 401 });
        }

        const { ventaId, codigo } = await request.json();

        if (!ventaId || !codigo) {
            return NextResponse.json({ ok: false, error: "ventaId y codigo son requeridos" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        
        // Find item by codigo with its related data
        const { data: item, error: itemError } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                codigo,
                subcategoria_catalogo_id,
                direccion_id
            `)
            .eq("codigo", codigo)
            .single();

        if (itemError || !item) {
            return NextResponse.json({ ok: false, error: "Item no encontrado" }, { status: 404 });
        }

        // Get user's active cargo to find their dependencia
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select(`
                id,
                dependencia_id,
                sucursal_id,
                tipo
            `)
            .eq("usuario_id", user.id)
            .lte("desde", new Date().toISOString())
            .or("hasta.is.null,hasta.gte." + new Date().toISOString())
            .single();

        if (cargoError || !cargo || !cargo.dependencia_id) {
            return NextResponse.json({ ok: false, error: "Usuario no tiene cargo activo con dependencia" }, { status: 403 });
        }

        // Get dependencia to find its direccion
        const { data: dependencia, error: dependenciaError } = await supabase
            .from("dependencias")
            .select(`
                id,
                direccion_id
            `)
            .eq("id", cargo.dependencia_id)
            .single();

        if (dependenciaError || !dependencia) {
            return NextResponse.json({ ok: false, error: "Dependencia no encontrada" }, { status: 404 });
        }

        // Validate item is in the same direccion as user's dependencia
        if (!item.direccion_id || !dependencia.direccion_id || 
            item.direccion_id !== dependencia.direccion_id) {
            return NextResponse.json({ ok: false, error: "El item no está en la dirección de entrega" }, { status: 400 });
        }

        // Get venta
        const { data: venta, error: ventaError } = await supabase
            .from("ventas")
            .select("id, tipo, estado")
            .eq("id", ventaId)
            .single();

        if (ventaError || !venta) {
            return NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
        }

        // Get venta detalles with related data
        const { data: detallesVenta, error: detallesError } = await supabase
            .from("detalle_ventas")
            .select(`
                id,
                venta_id,
                subcategoria_id,
                detalle_venta_items:detalle_venta_items(item_catalogo_id)
            `)
            .eq("venta_id", ventaId);

        if (detallesError || !detallesVenta || detallesVenta.length === 0) {
            return NextResponse.json({ ok: false, error: "No se encontraron detalles para la venta" }, { status: 404 });
        }

        // Check if item belongs to any subcategoria in the venta detalles
        const subcategoriaIds = detallesVenta.map((detalle: any) => detalle.subcategoria_id);

        if (!subcategoriaIds.includes(item.subcategoria_catalogo_id)) {
            return NextResponse.json({ ok: false, error: "El item no pertenece a ninguna subcategoría de la venta" }, { status: 400 });
        }

        // Find the detalle that matches the item's subcategoria
        const detalleCorrespondiente = detallesVenta.find(
            (detalle: any) => detalle.subcategoria_id === item.subcategoria_catalogo_id
        );

        if (!detalleCorrespondiente) {
            return NextResponse.json({ ok: false, error: "No se encontró el detalle correspondiente" }, { status: 404 });
        }

        // Check if item is already in the detalle_venta_items
        const itemCatalogoIds = detalleCorrespondiente.detalle_venta_items || [];
        
        if (itemCatalogoIds.some((item_rel: any) => item_rel.item_catalogo_id === item.id)) {
            return NextResponse.json({ ok: false, error: "El item ya está registrado en esta venta" }, { status: 400 });
        }

        // Add item to detalle_venta_items
        const { error: insertError } = await supabase
            .from("detalle_venta_items")
            .insert({
                detalle_venta_id: detalleCorrespondiente.id,
                item_catalogo_id: item.id
            });

        if (insertError) {
            console.error("Error adding item to detalle_venta_items:", insertError);
            return NextResponse.json({ ok: false, error: "Error registrando el item en la venta" }, { status: 500 });
        }

        // TODO: Add to historial de carga (this would require the carga model structure)
        // This part would need the carga/movimiento model definitions to implement properly

        return NextResponse.json({
            ok: true,
            message: "Item entregado exitosamente",
            itemId: item.id,
            codigo: item.codigo
        });

    } catch (error) {
        console.error("Error in entregarEnLocal:", error);
        return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
    }
}