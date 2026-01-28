import { NextResponse } from "next/server";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { authOptions } from "@/app/utils/authOptions";
import { supabase } from "@/lib/supabase";
import { IVenta } from "@/types/venta";
import { IDetalleVenta } from "@/types/detalleVenta";

export const GET = migrateAuthEndpoint(async ({ user }, request: Request, { params }: { params: Promise<{ id: string[] }> }) => {
    try {
        console.log("Fetching venta details from Supabase...");

        // Await params before accessing its properties
        const resolvedParams = await params;
        const ventaId = resolvedParams.id[0];
        console.log(`Fetching venta details for ID: ${ventaId}`);

        // Validate UUID format (Supabase uses UUIDs)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(ventaId)) {
            return NextResponse.json({ ok: false, error: "Invalid venta ID" }, { status: 400 });
        }

        // Fetch venta with related data using Supabase joins
        const { data: venta, error: ventaError } = await supabase
            .from('ventas')
            .select(`
                id,
                fecha,
                estado,
                por_cobrar,
                valor_neto,
                valor_iva,
                valor_total,
                entregas_en_local,
                created_at,
                updated_at,
                clientes (
                    id,
                    nombre,
                    giro,
                    email,
                    telefono,
                    rut
                ),
                users (
                    id,
                    name,
                    email
                ),
                documentos_tributarios (
                    id,
                    nombre
                )
            `)
            .eq('id', ventaId)
            .single();

        if (ventaError || !venta) {
            console.warn(`No venta found for ID: ${ventaId}`, ventaError);
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        console.log("Fetching detalles de venta from Supabase...");
        // Fetch detalles de venta with all related data
        const { data: detallesVenta, error: detallesError } = await supabase
            .from('detalle_ventas')
            .select(`
                id,
                glosa,
                codigo,
                codigo_cilindro,
                tipo,
                cantidad,
                especifico,
                neto,
                iva,
                total,
                created_at,
                updated_at,
                subcategoria_catalogos (
                    id,
                    nombre,
                    cantidad,
                    unidad,
                    sin_sifon,
                    url_imagen,
                    categoria_catalogos (
                        id,
                        nombre,
                        tipo,
                        elemento,
                        es_industrial,
                        es_medicinal
                    )
                ),
                item_catalogos (
                    id,
                    codigo,
                    estado
                )
            `)
            .eq('venta_id', ventaId);

        if (detallesError) {
            console.warn(`Error fetching detalles for venta ID: ${ventaId}`, detallesError);
        }

        const ventaDetails = {
            _id: venta.id,
            fecha: venta.fecha,
            estado: venta.estado,
            porCobrar: venta.por_cobrar,
            valorNeto: venta.valor_neto,
            valorIva: venta.valor_iva,
            valorTotal: venta.valor_total,
            vendedor: {
                _id: venta.users?.id,
                nombre: venta.users?.name,
                email: venta.users?.email
            },
            cliente: {
                _id: venta.clientes?.id,
                nombre: venta.clientes?.nombre,
                giro: venta.clientes?.giro,
                email: venta.clientes?.email,
                telefono: venta.clientes?.telefono,
                rut: venta.clientes?.rut
            },
            entregasEnLocal: venta.entregas_en_local || [],
            // Nuevos campos agregados
            detalles: detallesVenta?.map(detalle => ({
                _id: detalle.id,
                estado: 'Pendiente',
                glosa: detalle.glosa,
                codigo: detalle.codigo,
                codigoCilindro: detalle.codigo_cilindro,
                subcategoriaCatalogoId: detalle.subcategoria_catalogos ? {
                    _id: detalle.subcategoria_catalogos.id,
                    nombre: detalle.subcategoria_catalogos.nombre,
                    cantidad: detalle.subcategoria_catalogos.cantidad,
                    unidad: detalle.subcategoria_catalogos.unidad,
                    sinSifon: detalle.subcategoria_catalogos.sin_sifon,
                    urlImagen: detalle.subcategoria_catalogos.url_imagen,
                    categoriaCatalogoId: detalle.subcategoria_catalogos.categoria_catalogos ? {
                        _id: detalle.subcategoria_catalogos.categoria_catalogos.id,
                        nombre: detalle.subcategoria_catalogos.categoria_catalogos.nombre,
                        tipo: detalle.subcategoria_catalogos.categoria_catalogos.tipo,
                        elemento: detalle.subcategoria_catalogos.categoria_catalogos.elemento,
                        esIndustrial: detalle.subcategoria_catalogos.categoria_catalogos.es_industrial,
                        esMedicinal: detalle.subcategoria_catalogos.categoria_catalogos.es_medicinal
                    } : null
                } : null,
                itemCatalogoIds: Array.isArray(detalle.item_catalogos) 
                    ? detalle.item_catalogos.map(item => ({
                        _id: item.id,
                        codigo: item.codigo,
                        estado: item.estado
                    }))
                    : detalle.item_catalogos ? [{
                        _id: detalle.item_catalogos.id,
                        codigo: detalle.item_catalogos.codigo,
                        estado: detalle.item_catalogos.estado
                    }] : [],
                tipo: detalle.tipo,
                cantidad: detalle.cantidad,
                especifico: detalle.especifico,
                neto: detalle.neto,
                iva: detalle.iva,
                total: detalle.total
            })) || []
        };

        console.log("Returning venta details from Supabase.");
        return NextResponse.json({ ok: true, venta: ventaDetails });

    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}