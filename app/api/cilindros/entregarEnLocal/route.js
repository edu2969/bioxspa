import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

const buildItemView = (row, expectedDireccion) => {
    const sub = row.subcategoria || null;
    const cat = sub?.categoria || null;
    return {
        id: row.id,
        ownerId: row.propietario ? { id: row.propietario.id, nombre: row.propietario.nombre, rut: row.propietario.rut } : null,
        direccionId: row.direccion ? { id: row.direccion.id, direccionCliente: row.direccion.direccion_cliente } : null,
        elemento: (cat && cat.elemento) || (sub && sub.nombre) || "",
        codigo: row.codigo,
        subcategoriaCatalogoId: sub ? {
            id: sub.id,
            temporalId: undefined,
            nombre: sub.nombre,
            categoriaCatalogoId: cat ? {
                id: cat.id,
                nombre: cat.nombre,
                elemento: cat.elemento,
                esIndustrial: cat.es_industrial
            } : null,
            cantidad: sub.cantidad,
            unidad: sub.unidad,
            sinSifon: sub.sin_sifon                    
        } : null,
        stockActual: row.stock_actual,
        stockMinimo: row.stock_minimo,
        garantiaAnual: row.garantia_anual,
        estado: row.estado,
        fechaMantencion: row.fecha_mantencion,
        direccionInvalida: String(row.direccion?.id) !== String(expectedDireccion.id),
        direccionEsperada: {
            id: expectedDireccion.id,
            direccionCliente: expectedDireccion.direccion_cliente
        }
    };
};

export async function POST(request) {
    try {
        // Get authenticated user from Supabase
        const authResult = await getAuthenticatedUser({ requireAuth: true });

        if (!authResult.success || !authResult.data) {
            return NextResponse.json(
                { ok: false, error: authResult.message || "Usuario no autenticado" },
                { status: 401 }
            );
        }
        const { user } = authResult.data;
        const userId = user.id;

        const { ventaId, codigo } = await request.json();

        if (!ventaId || !codigo) {
            return NextResponse.json({ ok: false, error: "ventaId y codigo son requeridos" }, { status: 400 });
        }

        const supabase = await getSupabaseServerClient();
        const nowIso = new Date().toISOString();

        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("id, sucursal_id, dependencia_id")
            .eq("usuario_id", userId)
            .lte("desde", nowIso)
            .or(`hasta.is.null,hasta.gte.${nowIso}`)
            .order("desde", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (cargoError || !cargo) {
            console.log("Error fetching cargo or no cargo:", cargoError?.message);
            return NextResponse.json({ ok: false, error: "Cargo for user not found" }, { status: 404 });
        }

        let direccionId = null;
        if (cargo.dependencia_id) {
            console.log("Fetching direccion from dependencia:", cargo.dependencia_id);
            const { data: dependencia } = await supabase
                .from("dependencias")
                .select("direccion_id")
                .eq("id", cargo.dependencia_id)
                .maybeSingle();
            direccionId = dependencia?.direccion_id || null;
        }
        if (!direccionId && cargo.sucursal_id) {
            const { data: sucursal } = await supabase
                .from("sucursales")
                .select("direccion_id")
                .eq("id", cargo.sucursal_id)
                .maybeSingle();
            direccionId = sucursal?.direccion_id || null;
        }

        if (!direccionId) {
            return NextResponse.json({ ok: false, error: "No workplace address found for user" }, { status: 400 });
        }

        // Find the item by codigo and include relations: subcategoria -> categoria, direccion, propietario
        const { data: itemsFound, error: itemError } = await supabase
            .from("items_catalogo")
            .select(`
                id,
                codigo,
                estado,
                garantia_anual,
                stock_minimo,
                stock_actual,
                fecha_mantencion,
                direccion:direcciones(id, direccion_cliente),
                propietario:clientes(id, nombre, rut),
                subcategoria:subcategorias_catalogo(id, nombre, cantidad, unidad, sin_sifon, categoria:categorias_catalogo(id, nombre, elemento, es_industrial))
            `)
            .eq("codigo", codigo)
            .limit(1);

        if (itemError) {
            console.error("Error fetching item:", itemError);
            return NextResponse.json({ ok: false, error: "Error fetching item" }, { status: 500 });
        }

        const item = (itemsFound && itemsFound[0]) || null;
        if (!item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        // Fetch expected direccion details for helpful response in modal
        const { data: expectedDireccion, error: expectedDireccionError } = await supabase
            .from("direcciones")
            .select("id, direccion_cliente")
            .eq("id", direccionId)
            .maybeSingle();

        if (expectedDireccionError || !expectedDireccion) {
            return NextResponse.json({ ok: false, error: "No workplace address details found for user" }, { status: 400 });
        }

        console.log("Direcion item", item.direccion, "Cargo-direccion", expectedDireccion);

        if (!item.direccion.id || !expectedDireccion 
            || item.direccion.id !== expectedDireccion.id) {
            const itemBuild = buildItemView(item, expectedDireccion);
            return NextResponse.json({ ok: false, item: itemBuild, error: "El item no está en la dirección de entrega" }, { status: 400 });
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
                subcategoria_catalogo_id,
                detalle_venta_items:detalle_venta_items(item_catalogo_id)
            `)
            .eq("venta_id", ventaId);

        if (detallesError || !detallesVenta || detallesVenta.length === 0) {
            return NextResponse.json({ ok: false, error: "No se encontraron detalles para la venta" }, { status: 404 });
        }

        // Check if item belongs to any subcategoria in the venta detalles
        const subcategoriaIds = detallesVenta.map((detalle) => detalle.subcategoria_catalogo_id);

        if (!subcategoriaIds.includes(item.subcategoria.id)) {
            return NextResponse.json({ ok: false, error: "El item no pertenece a ninguna subcategoría de la venta" }, { status: 400 });
        }

        // Find the detalle that matches the item's subcategoria
        const detalleCorrespondiente = detallesVenta.find(
            (detalle) => detalle.subcategoria_catalogo_id === item.subcategoria.id
        );

        if (!detalleCorrespondiente) {
            return NextResponse.json({ ok: false, error: "No se encontró el detalle correspondiente" }, { status: 404 });
        }

        // Check if item is already in the detalle_venta_items
        const itemCatalogoIds = detalleCorrespondiente.detalle_venta_items || [];
        
        if (itemCatalogoIds.some((item_rel) => item_rel.item_catalogo_id === item.id)) {
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