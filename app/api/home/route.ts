import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import Cargo from "@/models/cargo";
import Venta from "@/models/venta";
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";
import Cliente from "@/models/cliente";

import {
    USER_ROLE,
    TIPO_CARGO,
    TIPO_ESTADO_VENTA,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_ORDEN
} from "@/app/utils/constants";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
        }
        await connectMongoDB();
        const userId = session.user.id;
        const userRole = session.user.role;

        // COBRANZA
        if (userRole === USER_ROLE.cobranza || userRole === USER_ROLE.encargado) {
            console.log("Fetching data for COBRANZA or ENCARGADO role");
            const ventas = await Venta.find({
                estado: { $gte: TIPO_ESTADO_VENTA.borrador, $lte: TIPO_ESTADO_VENTA.reparto },
            });
            const pedidosCount = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.borrador).length;
            const porAsignar = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.por_asignar).length;
            const preparacion = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.preparacion).length;
            const enRuta = ventas.length - pedidosCount - porAsignar - preparacion;

            // Clientes activos
            const clientesActivos = await Cliente.countDocuments({ activo: true });

            // Clientes en quiebra
            const clientesEnQuiebra = await Cliente.countDocuments({ activo: true, enQuiebra: true });

            const contadores = [pedidosCount, porAsignar, preparacion, 
                enRuta, clientesActivos, clientesEnQuiebra];
            return new Response(JSON.stringify({ ok: true, contadores }));
        }

        // DESPACHO ó RESPONSABLE
        if (userRole === USER_ROLE.despacho || userRole === USER_ROLE.responsable) {
            // Find the user's cargo
            const userCargo = await Cargo.findOne({
                userId,
                tipo: { $in: [TIPO_CARGO.despacho, TIPO_CARGO.responsable] }
            });

            if (!userCargo) {
                return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 403 });
            }

            // Find all chofer cargos in the same dependencia
            const choferCargos = await Cargo.find({
                dependenciaId: userCargo.dependenciaId,
                tipo: TIPO_CARGO.conductor
            });

            const choferIds = choferCargos?.map(cargo => cargo.userId) || [];

            // Find ventas in estado 'preparacion' for choferes in the dependencia
            const ventas = await Venta.find({
                $or: [{
                    estado: TIPO_ESTADO_VENTA.preparacion
                }, {
                    estado: TIPO_ESTADO_VENTA.por_asignar,
                    direccionDespachoId: null
                }, {
                    estado: TIPO_ESTADO_VENTA.entregado
                }]
            });

            const ventaIds = ventas.filter(venta => {
                if(venta.estado === TIPO_ESTADO_VENTA.entregado) {
                    return venta.tipo === TIPO_ORDEN.traslado;
                }
                return true;
            }).map(venta => venta._id);
            const ventasDespachoEnLocal = ventas.filter(venta => !venta.direccionDespachoId).length;

            // Count rutasDespacho where the ventas are present
            const contadores = await RutaDespacho.countDocuments({
                ventaIds: { $in: ventaIds },
                choferId: { $in: choferIds },
                estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado] }
            });
            return new Response(JSON.stringify({ ok: true, contadores: [contadores + ventasDespachoEnLocal]}));
        }

        // CHOFER
        if (userRole === USER_ROLE.conductor) {
            const unaRuta = await RutaDespacho.findOne({
                estado: {
                    $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                    $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado
                },
                choferId: userId
            });
            return new Response(JSON.stringify({ ok: true, contadores: [unaRuta ? 1 : 0]}));
        }

        // Otros roles: respuesta vacía
        return new Response(JSON.stringify({ ok: true, message: "No data for this role." }));
    } catch (error) {
        return new Response(JSON.stringify({ error }), { status: 500 });
    }
}