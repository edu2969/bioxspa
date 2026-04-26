import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedUserId = searchParams.get("usuarioId");

        if (!requestedUserId) {
            return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
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

        if (requestedUserId !== userId) {
            return NextResponse.json(
                { ok: false, error: "Access denied. userId does not match session user" },
                { status: 403 }
            );
        }

        const userCargoTypes = (userData.cargos || []).map((cargo) => cargo.tipo);
        const hasCargo = (allowedCargoTypes) =>
            userCargoTypes.some((cargoType) => allowedCargoTypes.includes(cargoType));

        if (!hasCargo([TIPO_CARGO.conductor])) {
            console.warn(`User ${userId} is not a conductor. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }
        
        const supabase = await getSupabaseServerClient();
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                ruta_despacho_destinos(
                    id,
                    direccion:direcciones(
                        id,
                        direccion_cliente,
                        latitud,
                        longitud
                    ),
                    fecha_arribo,
                    rut_quien_recibe,
                    nombre_quien_recibe,
                    created_at
                ),
                ruta_despacho_ventas(
                    venta:ventas(
                        id,
                        tipo,
                        comentario,
                        cliente:clientes(
                            nombre,
                            telefono,
                            direccionesDespacho:cliente_direcciones_despacho(id:direccion_id)
                        )
                    )
                )
            `)
            .eq("conductor_id", requestedUserId)
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
            .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado)
            .maybeSingle();        

        if (rutaError || !rutaDespacho) {
            console.log(`No active rutaDespacho found for conductor: ${userId}`);
            return NextResponse.json({
                ok: true,
                rutaId: null,
                message: "No hay ruta activa asignada" + (rutaError ? ` - Error: ${rutaError.message}` : "")
            });
        }        

        const ultimaDireccion = rutaDespacho.ruta_despacho_destinos.length > 0 ? rutaDespacho.ruta_despacho_destinos[rutaDespacho.ruta_despacho_destinos.length - 1].direccion.id : null;
        const cliente = ultimaDireccion ? rutaDespacho.ruta_despacho_ventas.find(rv => rv.venta.direcciones_despacho?.some(d => d.id === ultimaDireccion))?.cliente : null;

        // Build response
        const rutaConductorView = {
            id: rutaDespacho.id,
            estado: rutaDespacho.estado,
            destinos: (rutaDespacho.ruta_despacho_destinos || []).map((destino) => {
                return {
                    id: destino.id,
                    direccion: {
                        id: destino.direccion.id,
                        direccionCliente: destino.direccion.direccion_cliente,
                        latitud: destino.direccion.latitud,
                        longitud: destino.direccion.longitud
                    },
                    fechaArribo: destino.fecha_arribo || null,
                    rutQuienRecibe: destino.rut_quien_recibe || null,
                    nombreQuienRecibe: destino.nombre_quien_recibe || null,
                    createdAt: destino.created_at || null
                };
            }),
            ventas: (rutaDespacho.ruta_despacho_ventas || []).map((rv) => {
                const venta = rv.venta || null;
                return {
                    id: venta?.id || null,
                    tipo: venta?.tipo || 0,
                    comentario: venta?.comentario || "",
                    cliente: venta?.cliente || { nombre: "Cliente no encontrado", telefono: "", direccion_cliente: "" },
                    actual: !cliente ? true :  venta?.cliente.id === cliente?.id                    
                };
            })
        };

        return NextResponse.json({
            ok: true,
            ruta: rutaConductorView
        });
    } catch (error) {
        console.error("Error al obtener ruta asignada:", error);
        return NextResponse.json(
            { ok: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}