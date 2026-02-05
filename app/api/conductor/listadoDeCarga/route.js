import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_CARGO, USER_ROLE } from "@/app/utils/constants";

export async function GET(request) {
    try {
        console.log("[LISTADO DE CARGA] Iniciando proceso de obtención de listado de carga (Supabase)");
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        if (!rutaId) return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });

        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        } 

        const { data: userData, error: userError } = await supabase
            .from("usuarios")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userError || !userData) {
            console.warn(`User not found for ID: ${user.id}`);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        } else if (userData.role !== USER_ROLE.conductor) {
            console.warn(`User ${user.id} is not a conductor. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }

        // Obtener la ruta y sus ventas (join table ruta_ventas)
        const { data: rutaData, error: rutaErr } = await supabase
            .from('rutas_despacho')
            .select('id, conductor_id, dependencia_id, ruta_ventas(venta_id)')
            .eq('id', rutaId)
            .maybeSingle();

        if (rutaErr) {
            console.error('Error fetching ruta:', rutaErr);
            return NextResponse.json({ ok: false, error: 'Error fetching ruta' }, { status: 500 });
        }
        if (!rutaData) return NextResponse.json({ ok: false, error: 'Ruta no encontrada' }, { status: 404 });


        const ventaIds = (rutaData.ruta_ventas || []).map(r => r.venta_id).filter(Boolean);
        if (ventaIds.length === 0) {
            return NextResponse.json({ encargado: '', cilindros: [] });
        }

        // Obtener detalles de venta con subcategoria->categoria y items asignados
        const { data: detalles, error: detallesErr } = await supabase
            .from('detalle_ventas')
            .select(`
                id,
                venta_id,
                cantidad,
                subcategoria:subcategorias_catalogo(
                    id,
                    nombre,
                    cantidad,
                    unidad,
                    sin_sifon,
                    categoria:categorias_catalogo(
                        id,
                        nombre,
                        elemento,
                        es_industrial,
                        es_medicinal,
                        gas
                    )
                ),
                items:detalle_venta_items(item_catalogo_id)
            `)
            .in('venta_id', ventaIds);

        if (detallesErr) {
            console.error('Error fetching detalle_ventas:', detallesErr);
            return NextResponse.json({ ok: false, error: 'Error fetching detalles' }, { status: 500 });
        }

        // Agrupar detalles por venta
        const detallesPorVenta = (detalles || []).reduce((acc, d) => {
            const vid = String(d.venta_id);
            if (!acc[vid]) acc[vid] = [];
            acc[vid].push(d);
            return acc;
        }, {});

        const itemsDescarga = [];
        for (const ventaId of ventaIds) {
            const detalles = detallesPorVenta[String(ventaId)] || [];
            for (const detalle of detalles) {
                const sub = detalle.subcategoria || null;
                const cat = sub?.categoria || null;
                const multiplicador = detalle.cantidad || 0;
                const yaEscaneados = (detalle.items || []).length || 0;
                const restantes = Math.max(0, multiplicador - yaEscaneados);

                itemsDescarga.push({
                    _id: sub?.id || '',
                    subcategoriaCatalogoId: sub?.id || '',
                    cantidad: sub?.cantidad || 0,
                    unidad: sub?.unidad || '',
                    nombreGas: (cat && cat.gas) || (cat && cat.nombre) || '',
                    sinSifon: sub?.sin_sifon || false,
                    elemento: cat?.elemento || '',
                    esIndustrial: cat?.es_industrial || false,
                    esMedicinal: cat?.es_medicinal || false,
                    vencido: false,
                    multiplicador,
                    restantes
                });
            }
        }

        // Buscar encargados (cargos) de la dependencia y mapear nombres de usuario
        const tiposEncargado = [TIPO_CARGO.encargado, TIPO_CARGO.responsable, TIPO_CARGO.despacho].filter(Boolean);
        const { data: cargosEnc, error: cargosErr } = await supabase
            .from('cargos')
            .select('usuario:usuarios(nombre)')
            .eq('dependencia_id', rutaData.dependencia_id)
            .in('tipo', tiposEncargado.length ? tiposEncargado : [-1]);

        if (cargosErr) {
            console.error('Error fetching cargos:', cargosErr);
        }

        const encargadoNames = (cargosEnc || []).map(c => c.usuario.nombre);
        return NextResponse.json({ encargado: encargadoNames.join(', '), cilindros: itemsDescarga });
    } catch (error) {
        console.error('Error al obtener listado de descarga:', error);
        return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
    }
}