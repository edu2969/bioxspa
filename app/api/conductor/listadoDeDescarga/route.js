import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get("rutaId");
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });

        // Obtener la ruta con ventas y destinos
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select(`id, estado, chofer_id, dependencia_id, ruta_ventas(venta_id), ruta_destinos(id, direccion_destino_id, created_at)`) 
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('[listadoDeDescarga] Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }

        if (!rutaData) return NextResponse.json({ ok: false, error: 'Ruta no encontrada' }, { status: 404 });

        if (rutaData.estado !== TIPO_ESTADO_RUTA_DESPACHO.descarga) {
            return NextResponse.json({ ok: false, error: 'La ruta no está en estado de descarga' }, { status: 400 });
        }

        if (String(rutaData.chofer_id) !== String(user.id)) {
            return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
        }

        // Determinar último destino por created_at
        const destinos = rutaData.ruta_destinos || [];
        destinos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const ultimoDestino = destinos[0];
        if (!ultimoDestino) return NextResponse.json({ ok: false, error: 'La ruta no tiene destinos definidos' }, { status: 400 });

        const direccionDestinoId = ultimoDestino.direccion_destino_id;

        // Buscar ventas asociadas a la ruta
        const ventaIds = (rutaData.ruta_ventas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length === 0) return NextResponse.json({ ok: false, error: 'No hay ventas asociadas a la ruta' }, { status: 404 });

        const { data: ventas, error: ventasErr } = await supabase
            .from('ventas')
            .select('id, cliente_id, direccion_despacho_id')
            .in('id', ventaIds);

        if (ventasErr) {
            console.error('[listadoDeDescarga] Error fetching ventas:', ventasErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ventas' }, { status: 500 });
        }

        // Encontrar la venta que corresponde al destino
        let ventaDestino = ventas.find(v => String(v.direccion_despacho_id) === String(direccionDestinoId));

        if (!ventaDestino) {
            // Buscar en direcciones de clientes
            const clienteIds = ventas.map(v => v.cliente_id).filter(Boolean);
            const { data: cliDirs, error: cliDirsErr } = await supabase
                .from('cliente_direcciones_despacho')
                .select('cliente_id, direccion_id')
                .in('cliente_id', clienteIds)
                .eq('direccion_id', direccionDestinoId);

            if (cliDirsErr) console.error('[listadoDeDescarga] Error fetching cliente direcciones:', cliDirsErr);

            if (cliDirs && cliDirs.length > 0) {
                const clienteMatchedId = cliDirs[0].cliente_id;
                ventaDestino = ventas.find(v => String(v.cliente_id) === String(clienteMatchedId));
            }
        }

        if (!ventaDestino) return NextResponse.json({ ok: false, error: 'No se encontró venta para el destino actual' }, { status: 404 });

        // Obtener detalles de venta con subcategoria->categoria y items ya asignados
        const { data: detallesVenta, error: detErr } = await supabase
            .from('detalle_ventas')
            .select(`id, cantidad, subcategoria:subcategorias_catalogo(id, nombre, cantidad, unidad, sin_sifon, categoria:categorias_catalogo(id, nombre, elemento, es_industrial, es_medicinal, gas)), detalle_venta_items(item_catalogo:items_catalogo(id, codigo, fecha_mantencion))`)
            .eq('venta_id', ventaDestino.id);

        if (detErr) {
            console.error('[listadoDeDescarga] Error fetching detalle_ventas:', detErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalle_ventas' }, { status: 500 });
        }

        const itemsDescarga = (detallesVenta || []).map(det => {
            const sub = det.subcategoria || null;
            const cat = sub?.categoria || null;
            const multiplicador = det.cantidad || 0;
            const cantidadCargada = (det.detalle_venta_items || []).length || 0;
            const restantes = multiplicador - cantidadCargada;

            return {
                _id: sub?.id || null,
                subcategoriaCatalogoId: sub?.id || null,
                cantidad: sub?.cantidad || 0,
                unidad: sub?.unidad || "",
                nombreGas: (cat && (cat.gas || cat.nombre)) || "",
                sinSifon: sub?.sin_sifon || false,
                elemento: cat?.elemento || "",
                esIndustrial: cat?.es_industrial || false,
                esMedicinal: cat?.es_medicinal || false,
                vencido: false,
                multiplicador,
                restantes
            };
        });

        // Buscar encargados por dependencia y unir con usuarios
        const { data: cargosRows, error: cargosErr } = await supabase
            .from('cargos')
            .select('id, usuario:usuarios(id, nombre)')
            .eq('dependencia_id', rutaData.dependencia_id);

        if (cargosErr) console.error('[listadoDeDescarga] Error fetching cargos:', cargosErr);

        const encargadoNames = (cargosRows || []).map(c => c.usuario?.nombre).filter(Boolean).join(', ');

        return NextResponse.json({ encargado: encargadoNames, cilindros: itemsDescarga });
    } catch (error) {
        console.error('Error al obtener listado de descarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}