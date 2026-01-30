import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import supabase from "@/lib/supabase";
import { USER_ROLE, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET() {
    try {
        console.log("GET request received for ruta asignada.");

        // Authenticate user
        const { user } = await getAuthenticatedUser();
        if (!user) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = user.id;
        console.log(`Fetching user with ID: ${userId}`);

        // Verify user role
        const { data: userData, error: userError } = await supabase
            .from("usuarios")
            .select("role")
            .eq("id", userId)
            .single();

        if (userError || !userData) {
            console.warn(`User not found for ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        if (userData.role !== USER_ROLE.conductor) {
            console.warn(`User ${userId} is not a conductor. Role: ${userData.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }

        console.log(`Fetching active rutaDespacho for conductor: ${userId}`);

        // Fetch active rutaDespacho for the conductor
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from("rutas_despacho")
            .select(`
                id,
                estado,
                ruta_destinos(
                    id,
                    direccion:direcciones(
                        id,
                        nombre,
                        latitud,
                        longitud
                    ),
                    fecha_arribo,
                    rut_quien_recibe,
                    nombre_quien_recibe,
                    completado
                ),
                ruta_ventas:ventas(
                    id,
                    tipo,
                    comentario,
                    cliente:clientes(
                        nombre,
                        telefono
                    )
                )
            `)
            .eq("conductor_id", userId)
            .gte("estado", TIPO_ESTADO_RUTA_DESPACHO.preparacion)
            .lte("estado", TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado)
            .single();

        if (rutaError || !rutaDespacho) {
            console.log(`No active rutaDespacho found for conductor: ${userId}`);
            return NextResponse.json({
                ok: true,
                rutaId: null,
                message: "No hay ruta activa asignada"
            });
        }

        console.log(`Found active rutaDespacho ID: ${rutaDespacho.id} with estado: ${rutaDespacho.estado}`);

        // Build response
        const rutaConductorView = {
            _id: rutaDespacho.id,
            estado: rutaDespacho.estado,
            destinos: rutaDespacho.ruta_destinos.map((destino) => {
                return {
                    id: destino.id,
                    direccion: destino.direccion || { id: "", nombre: "", latitud: 0, longitud: 0 },
                    fecha_arribo: destino.fecha_arribo || null,
                    rut_quien_recibe: destino.rut_quien_recibe || null,
                    nombre_quien_recibe: destino.nombre_quien_recibe || null,
                    completado: destino.completado || false
                };
            }),
            ventas: rutaDespacho.ruta_ventas.map((venta) => {
                return {
                    id: venta.id,
                    tipo: venta.tipo || 0,
                    comentario: venta.comentario || "",
                    cliente: venta.cliente || { nombre: "Cliente no encontrado", telefono: "" }
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