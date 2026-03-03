import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_CARGO } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET() {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Verificar autorización
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("tipo, sucursal_id, dependencia_id")
            .eq("usuario_id", user.id)
            .in("tipo", [TIPO_CARGO.gerente, TIPO_CARGO.cobranza, TIPO_CARGO.encargado])
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 403 });
        }

        // Obtener clientes con precios
        const { data: clientsWithPrecios, error: clientsError } = await supabase
            .from('clientes')
            .select(`
                id,
                nombre,
                rut,
                email,
                telefono,
                precios (
                    id,
                    precio,
                    fecha_desde,
                    fecha_hasta,
                    activo,
                    tipo,
                    subcategoria_id,
                    subcategoria:subcategorias_catalogo (
                        id,
                        nombre,
                        categoria:categorias_catalogo (
                            id,
                            nombre
                        )
                    )
                )
            `)
            .order('nombre');

        if (clientsError) {
            console.error('Error fetching clients with precios:', clientsError);
            return NextResponse.json({ ok: false, error: "Error fetching precios" }, { status: 500 });
        }

        // Mapear datos para mantener compatibilidad
        const result = clientsWithPrecios.map(client => {
            const preciosWithDetails = (client.precios || []).map(precio => ({
                _id: precio.id,
                valor: precio.precio,
                fechaDesde: precio.fecha_desde,
                fechaHasta: precio.fecha_hasta,
                activo: precio.activo,
                tipo: precio.tipo,
                subcategoriaCatalogoId: precio.subcategoria_id,
                categoriaId: precio.subcategoria?.categoria?.id || null,
                subcategoria: precio.subcategoria ? {
                    _id: precio.subcategoria.id,
                    nombre: precio.subcategoria.nombre,
                    categoria: precio.subcategoria.categoria ? {
                        _id: precio.subcategoria.categoria.id,
                        nombre: precio.subcategoria.categoria.nombre
                    } : null
                } : null
            }));
            
            return { 
                cliente: { 
                    _id: client.id,
                    nombre: client.nombre, 
                    rut: client.rut,
                    email: client.email,
                    telefono: client.telefono
                },
                precios: preciosWithDetails 
            };
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Error fetching precios:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Verificar autorización
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("tipo, sucursal_id, dependencia_id")
            .eq("usuario_id", user.id)
            .in("tipo", [TIPO_CARGO.gerente, TIPO_CARGO.cobranza, TIPO_CARGO.encargado])
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 403 });
        }

        const body = await request.json();
        const {
            precioId,
            subcategoriaCatalogoId,
            valor,
            clienteId,
            tipo = 1, // Default tipo mayorista
            sucursalId = cargo.sucursal_id
        } = body;

        // Validación básica
        if (!subcategoriaCatalogoId || !clienteId || !valor) {
            return NextResponse.json({ 
                ok: false, 
                error: "subcategoriaCatalogoId, clienteId y valor son requeridos" 
            }, { status: 400 });
        }

        // Verificar que subcategoría existe
        const { data: subcategoria, error: subError } = await supabase
            .from('subcategorias_catalogo')
            .select('id')
            .eq('id', subcategoriaCatalogoId)
            .single();

        if (subError || !subcategoria) {
            return NextResponse.json({ 
                ok: false, 
                error: "Subcategoría no encontrada" 
            }, { status: 400 });
        }

        // Verificar que cliente existe
        const { data: cliente, error: clientError } = await supabase
            .from('clientes')
            .select('id')
            .eq('id', clienteId)
            .single();

        if (clientError || !cliente) {
            return NextResponse.json({ 
                ok: false, 
                error: "Cliente no encontrado" 
            }, { status: 400 });
        }

        if (precioId) {
            // Actualizar precio existente
            const { data: updatedPrecio, error: updateError } = await supabase
                .from('precios')
                .update({
                    precio: valor,
                    fecha_desde: new Date(),
                    sucursal_id: sucursalId
                })
                .eq('id', precioId)
                .select(`
                    id,
                    precio,
                    fecha_desde,
                    fecha_hasta,
                    activo,
                    tipo,
                    subcategoria_id,
                    cliente_id,
                    sucursal_id
                `)
                .single();

            if (updateError) {
                console.error('Error updating precio:', updateError);
                return NextResponse.json({ 
                    ok: false, 
                    error: "Error updating precio" 
                }, { status: 500 });
            }

            return NextResponse.json({ ok: true, precio: updatedPrecio });

        } else {
            // Verificar si ya existe un precio para esta combinación
            const { data: existingPrecio, error: existingError } = await supabase
                .from('precios')
                .select('id')
                .eq('cliente_id', clienteId)
                .eq('subcategoria_id', subcategoriaCatalogoId)
                .eq('tipo', tipo)
                .eq('activo', true)
                .single();

            if (existingPrecio) {
                return NextResponse.json({ 
                    ok: false, 
                    error: "Ya existe un precio activo para este cliente y subcategoría" 
                }, { status: 400 });
            }

            // Crear nuevo precio
            const { data: nuevoPrecio, error: createError } = await supabase
                .from('precios')
                .insert({
                    cliente_id: clienteId,
                    subcategoria_id: subcategoriaCatalogoId,
                    sucursal_id: sucursalId,
                    tipo: tipo,
                    precio: valor,
                    fecha_desde: new Date(),
                    activo: true
                })
                .select(`
                    id,
                    precio,
                    fecha_desde,
                    fecha_hasta,
                    activo,
                    tipo,
                    subcategoria_id,
                    cliente_id,
                    sucursal_id
                `)
                .single();

            if (createError) {
                console.error('Error creating precio:', createError);
                return NextResponse.json({ 
                    ok: false, 
                    error: "Error creating precio" 
                }, { status: 500 });
            }

            return NextResponse.json({ ok: true, precio: nuevoPrecio });
        }

    } catch (error) {
        console.error("Error in POST precios:", error);
        return NextResponse.json({ 
            ok: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Verificar autorización
        const { data: cargo, error: cargoError } = await supabase
            .from("cargos")
            .select("tipo, sucursal_id, dependencia_id")
            .eq("usuario_id", user.id)
            .in("tipo", [TIPO_CARGO.gerente, TIPO_CARGO.encargado])
            .single();

        if (cargoError || !cargo) {
            return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const precioId = searchParams.get('id');

        if (!precioId) {
            return NextResponse.json({ 
                ok: false, 
                error: "ID de precio requerido" 
            }, { status: 400 });
        }

        // Verificar que el precio existe
        const { data: precio, error: precioError } = await supabase
            .from('precios')
            .select('id')
            .eq('id', precioId)
            .single();

        if (precioError || !precio) {
            return NextResponse.json({ 
                ok: false, 
                error: "Precio no encontrado" 
            }, { status: 404 });
        }

        // Desactivar en lugar de eliminar para mantener historial
        const { error: updateError } = await supabase
            .from('precios')
            .update({ 
                activo: false,
                fecha_hasta: new Date()
            })
            .eq('id', precioId);

        if (updateError) {
            console.error('Error deactivating precio:', updateError);
            return NextResponse.json({ 
                ok: false, 
                error: "Error deactivating precio" 
            }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Precio desactivado exitosamente" });

    } catch (error) {
        console.error("Error in DELETE precios:", error);
        return NextResponse.json({ 
            ok: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
}