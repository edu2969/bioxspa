import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import Cargo from "@/models/cargo";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO } from "@/app/utils/constants";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";

export async function POST() {
    try {
        console.log("[CONFIRMAR ORDEN] Iniciando proceso de confirmación de orden");

        await connectMongoDB();
        console.log("[CONFIRMAR ORDEN] Conexión a MongoDB establecida");

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("[CONFIRMAR ORDEN] Sesión no válida o usuario no autenticado");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = session.user.id;
        console.log(`[CONFIRMAR ORDEN] Usuario autenticado: ${choferId}`);

        // Verificar que el usuario tenga cargo de chofer activo
        const cargoChofer = await Cargo.findOne({
            userId: choferId,
            tipo: TIPO_CARGO.conductor,
            $or: [
                { hasta: null },
                { hasta: { $gte: new Date() } }
            ]
        });

        if (!cargoChofer) {
            console.warn(`[CONFIRMAR ORDEN] Usuario ${choferId} no tiene cargo de chofer activo`);
            return NextResponse.json({ ok: false, error: "No autorizado: no es chofer activo" }, { status: 403 });
        }
        console.log(`[CONFIRMAR ORDEN] Cargo de chofer activo verificado para usuario ${choferId}`);

        // Buscar la ruta asociada al chofer en estado orden_cargada
        const rutaDespacho = await RutaDespacho.findOne({
            choferId: choferId,
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_cargada
        });

        if (!rutaDespacho) {
            console.warn(`[CONFIRMAR ORDEN] No se encontró ruta en estado 'orden_cargada' para chofer ${choferId}`);
            return NextResponse.json({ ok: false, error: "No hay ruta en estado 'orden_cargada' para este chofer" }, { status: 404 });
        }
        console.log(`[CONFIRMAR ORDEN] Ruta encontrada (ID: ${rutaDespacho._id}) en estado 'orden_cargada'`);

        // Cambiar estado a orden_confirmada y agregar al historial
        rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada;
        rutaDespacho.historialEstado.push({
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada,
            fecha: new Date()
        });

        if (
            rutaDespacho.ventaIds &&
            rutaDespacho.ventaIds.length === 1
        ) {
            // Buscar la venta
            const venta = await Venta.findById(rutaDespacho.ventaIds[0]);
            if (venta && venta.clienteId) {
                // Buscar el cliente
                const cliente = await Cliente.findById(venta.clienteId);
                if (
                    cliente &&
                    cliente.direccionDespachoIds &&
                    cliente.direccionDespachoIds.length === 1
                ) {
                    // Agregar la ruta si no existe ya esa dirección en la ruta
                    const direccionId = cliente.direccionDespachoIds[0];
                    const yaExiste = rutaDespacho.ruta.some(
                        r => r.direccionDestinoId?.toString() === direccionId.toString()
                    );
                    if (!yaExiste) {
                        rutaDespacho.ruta.push({
                            direccionDestinoId: direccionId,
                            fechaArribo: null
                        });
                    }
                    rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino;
                }
            }
        }

        await rutaDespacho.save();
        console.log(`[CONFIRMAR ORDEN] Estado de la ruta actualizado a 'orden_confirmada' y guardado en base de datos`);

        return NextResponse.json({ ok: true, message: "Orden confirmada correctamente" });
    } catch (error) {
        console.error("[CONFIRMAR ORDEN] Error interno:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}