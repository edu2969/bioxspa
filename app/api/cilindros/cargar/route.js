import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(request) {
    try {
        const body = await request.json();
        const { rutaId, ventaId, codigo } = body || {};

        if (!rutaId && !ventaId && !codigo) {
            return NextResponse.json({ ok: false, error: "Missing rutaId/ventaId or codigo" }, { status: 400 });
        }

        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Determine user's workplace address via cargos -> dependencia/sucursal -> direcciones
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("id, sucursal_id, dependencia_id")
            .eq("usuario_id", user.id)
            .maybeSingle();

        if (cargoError || !cargo) {
            console.log("Error fetching cargo or no cargo:", cargoError?.message);
            return NextResponse.json({ ok: false, error: "Cargo for user not found" }, { status: 404 });
        }

        console.log("CARGO!?", cargo);

        let direccionId = null;
        if (cargo.dependencia_id) {
            console.log("Fetching direccion from dependencia:", cargo.dependencia_id);
            const { data: dependencia } = await supabase
                .from("dependencias")
                .select("direccion_id")
                .eq("id", cargo.dependencia_id)
                .maybeSingle();
            console.log("Dependencia data:", dependencia);
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
                direccion:direcciones(id, nombre),
                propietario:clientes(id, nombre, rut),
                subcategoria:subcategorias_catalogo(id, nombre, cantidad, unidad, sin_sifon, categoria:categorias_catalogo(id, nombre, elemento, es_industrial))
            `)
            .eq("codigo", codigo)
            .limit(1);

        if (itemError) {
            console.error("Error fetching item:", itemError);
            return NextResponse.json({ ok: false, error: "Error fetching item" }, { status: 500 });
        }

        const itemRow = (itemsFound && itemsFound[0]) || null;
        if (!itemRow) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        // Fetch expected direccion details for helpful response
        const { data: expectedDireccion } = await supabase
            .from("direcciones")
            .select("id, nombre")
            .eq("id", direccionId)
            .maybeSingle();

        const buildItemView = (row) => {
            const sub = row.subcategoria || null;
            const cat = sub?.categoria || null;
            return {
                id: row.id,
                owner_id: row.propietario ? { id: row.propietario.id, nombre: row.propietario.nombre, rut: row.propietario.rut } : null,
                direccion_id: row.direccion ? { id: row.direccion.id, nombre: row.direccion.nombre } : null,
                elemento: (cat && cat.elemento) || (sub && sub.nombre) || "",
                codigo: row.codigo,
                subcategoria_catalogo_id: sub ? {
                    _id: sub.id,
                    temporal_id: undefined,
                    nombre: sub.nombre,
                    categoria_catalogo_id: cat ? {
                        id: cat.id,
                        nombre: cat.nombre,
                        elemento: cat.elemento,
                        es_industrial: cat.es_industrial
                    } : null,
                    cantidad: sub.cantidad,
                    unidad: sub.unidad,
                    sin_sifon: sub.sin_sifon,
                    url_imagen: null,
                    created_at: null,
                    updated_at: null
                } : null,
                stock_actual: row.stock_actual,
                stock_minimo: row.stock_minimo,
                garantia_anual: row.garantia_anual,
                estado: row.estado,
                fecha_mantencion: row.fecha_mantencion,
                direccion_invalida: String(row.direccion?.id) !== String(direccionId),
                direccion_esperada: expectedDireccion ? { id: expectedDireccion.id, nombre: expectedDireccion.nombre } : null
            };
        };

        // If item is not located at user's workplace, return a helpful error with item view
        if (String(itemRow.direccion?.id) !== String(direccionId)) {
            return NextResponse.json({ ok: false, item: buildItemView(itemRow), error: "El item no está donde se esperaba" }, { status: 400 });
        }

        // Helper: ensure a carga historial exists (latest) and return its id
        async function ensureLatestCargaHistorial(ruta_id) {
            const { data: lastHist, error: lastErr } = await supabase
                .from("ruta_historial_carga")
                .select("id, es_carga")
                .eq("ruta_id", ruta_id)
                .order("fecha", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastErr) throw lastErr;

            if (lastHist && lastHist.es_carga) {
                return lastHist.id;
            }

            // create new historial carga
            const { data: created, error: createErr } = await supabase
                .from("ruta_historial_carga")
                .insert({ ruta_id, es_carga: true, fecha: new Date().toISOString(), usuario_id: user.id, created_at: new Date().toISOString() })
                .select("id")
                .maybeSingle();

            if (createErr) throw createErr;
            return created.id;
        }

        // If rutaId provided: operate on that route
        if (rutaId) {
            const { data: ruta } = await supabase
                .from("rutas_despacho")
                .select("id")
                .eq("id", rutaId)
                .maybeSingle();

            if (!ruta) return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });

            // Verify if the item's subcategoria.id is part of the subcategorias in the venta details of the ruta
            const { data: rutaVentas, error: rutaVentasErr } = await supabase
                .from("ruta_ventas")
                .select("venta_id")
                .eq("ruta_id", rutaId);

            if (rutaVentasErr) {
                console.error("Error fetching ruta_ventas:", rutaVentasErr);
                return NextResponse.json({ ok: false, error: "Error fetching ruta ventas" }, { status: 500 });
            }

            const ventaIds = (rutaVentas || []).map(rv => rv.venta_id).filter(Boolean);
            if (ventaIds.length > 0) {
                const { data: ventaDetails, error: ventaDetailsErr } = await supabase
                    .from("detalle_ventas")
                    .select("subcategoria_id")
                    .in("venta_id", ventaIds);

                if (ventaDetailsErr) {
                    console.error("Error fetching venta details:", ventaDetailsErr);
                    return NextResponse.json({ ok: false, error: "Error verifying venta details" }, { status: 500 });
                }

                const allowedSubcategorias = (ventaDetails || []).map(d => d.subcategoria_id);
                if (!allowedSubcategorias.includes(itemRow.subcategoria?.id)) {
                    return NextResponse.json({
                        ok: false,
                        item: buildItemView(itemRow),
                        error: "El item no pertenece a las subcategorias permitidas para las ventas de la ruta"
                    }, { status: 400 });
                }
            }

            // Ensure latest historial carga
            const historialId = await ensureLatestCargaHistorial(rutaId);

            // Check if item already moved in that historial
            const { data: existing, error: existingErr } = await supabase
                .from("ruta_items_movidos")
                .select("id")
                .eq("historial_carga_id", historialId)
                .eq("item_catalogo_id", itemRow.id)
                .limit(1);

            if (existingErr) {
                console.error("Error checking existing ruta_items_movidos:", existingErr);
                return NextResponse.json({ ok: false, error: "Error checking item movement" }, { status: 500 });
            }

            if (existing && existing.length > 0) {
                return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
            }

            // Insert ruta_items_movidos
            const { error: insertErr } = await supabase
                .from("ruta_items_movidos")
                .insert({ historial_carga_id: historialId, item_catalogo_id: itemRow.id, created_at: new Date().toISOString() });

            if (insertErr) {
                console.error("Error inserting ruta_items_movidos:", insertErr);
                return NextResponse.json({ ok: false, error: "Failed to record moved item" }, { status: 500 });
            }

            // Build carga_item_ids for response: get all items moved in carga historials
            const { data: cargaHistorials } = await supabase
                .from("ruta_historial_carga")
                .select(`items:ruta_items_movidos(item_catalogo_id)`)
                .eq("ruta_id", rutaId)
                .eq("es_carga", true);

            const carga_item_ids = (cargaHistorials || []).flatMap(h => (h.items || []).map(i => i.item_catalogo_id));

            return NextResponse.json({ ok: true, item: buildItemView(itemRow), carga_item_ids });
        }

        // If ventaId provided: find ruta via ruta_ventas
        if (ventaId) {
            const { data: venta, error: ventaErr } = await supabase
                .from("ventas")
                .select("id, estado, direccion_despacho_id")
                .eq("id", ventaId)
                .maybeSingle();

            if (ventaErr || !venta) {
                return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
            }

            if (venta.estado !== TIPO_ESTADO_VENTA.preparacion) {
                return NextResponse.json({ ok: false, error: "La venta no está en estado preparacion" }, { status: 400 });
            }

            const { data: rutaVenta, error: rutaVentaErr } = await supabase
                .from("ruta_ventas")
                .select("ruta_id")
                .eq("venta_id", ventaId)
                .limit(1);

            if (rutaVentaErr) {
                console.error("Error fetching ruta_ventas:", rutaVentaErr);
                return NextResponse.json({ ok: false, error: "Error fetching ruta for venta" }, { status: 500 });
            }

            if (!rutaVenta || rutaVenta.length === 0) {
                return NextResponse.json({ ok: false, error: "No ruta associated with venta" }, { status: 404 });
            }

            const rutaIdFound = rutaVenta[0].ruta_id;
            const historialId = await ensureLatestCargaHistorial(rutaIdFound);

            // Check duplicate
            const { data: existing2, error: existingErr2 } = await supabase
                .from("ruta_items_movidos")
                .select("id")
                .eq("historial_carga_id", historialId)
                .eq("item_catalogo_id", itemRow.id)
                .limit(1);

            if (existingErr2) {
                console.error("Error checking existing ruta_items_movidos:", existingErr2);
                return NextResponse.json({ ok: false, error: "Error checking item movement" }, { status: 500 });
            }

            if (existing2 && existing2.length > 0) {
                return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
            }

            const { error: insertErr2 } = await supabase
                .from("ruta_items_movidos")
                .insert({ historial_carga_id: historialId, item_catalogo_id: itemRow.id, created_at: new Date().toISOString() });

            if (insertErr2) {
                console.error("Error inserting ruta_items_movidos:", insertErr2);
                return NextResponse.json({ ok: false, error: "Failed to record moved item" }, { status: 500 });
            }

            return NextResponse.json({ ok: true, item: buildItemView(itemRow) });
        }

        return NextResponse.json({ ok: false, error: "No operation performed" }, { status: 400 });
    } catch (error) {
        console.error("Error in cilindros/cargar route:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}