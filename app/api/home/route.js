import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import CheckList from "@/models/checklist";
import Cargo from "@/models/cargo";
import Venta from "@/models/venta";
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";
import Cliente from "@/models/cliente";
import BIDeuda from "@/models/biDeuda";
import {
    USER_ROLE,
    TIPO_CARGO,
    TIPO_ESTADO_VENTA,
    TIPO_ESTADO_RUTA_DESPACHO,
    TIPO_CHECKLIST
} from "@/app/utils/constants";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await connectMongoDB();
        const userId = session.user.id;
        const userRole = session.user.role;

        const tipos = [];
        if(userRole === USER_ROLE.despacho || userRole === USER_ROLE.conductor || userRole === USER_ROLE.encargado || userRole === USER_ROLE.responsable) {
            tipos.push(TIPO_CHECKLIST.personal);            
        }
        if (userRole === USER_ROLE.conductor) {
            tipos.push(TIPO_CHECKLIST.vehiculo);
        }
        const ahora = new Date();
        const checklists = tipos.length > 0 ? await CheckList.find({
            userId,
            tipo: { $in: tipos },
            fecha: {
                $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
            }
        }).select("tipo passed fecha").lean() : []; 

        const checklistResults = checklists.map(cl => ({
            tipo: cl.tipo,
            aprobado: !!cl.passed,
            fecha: cl.fecha
        }));

        console.log("User Role:", userRole);

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

            // Obtener todas las deudas agrupadas por cliente
            const deudasPorCliente = await BIDeuda.aggregate([
                {
                    $group: {
                        _id: "$clienteId",
                        totalDeuda: { $sum: "$monto" }
                    }
                }
            ]);

            // Obtener los créditos de los clientes
            const clientes = await Cliente.find({ activo: true }).select("_id credito").lean();

            // Calcular crédito restante por cliente
            const creditoRestantePorCliente = clientes.map(cliente => {
                const deuda = deudasPorCliente.find(d => String(d._id) === String(cliente._id));
                const totalDeuda = deuda ? deuda.totalDeuda : 0;
                return {
                    clienteId: cliente._id,
                    creditoRestante: cliente.credito - totalDeuda
                };
            });
            const contadores = {
                pedidos: pedidosCount,
                asignaciones: {
                    porAsignar,
                    preparacion,
                    enRuta,
                },
                clientes: {
                    activos: clientesActivos,
                    enQuiebra: clientesEnQuiebra,
                    creditoRestante: creditoRestantePorCliente
                },
                deudas: 0
            }
            return NextResponse.json({ ok: true, contadores, checklists: checklistResults });
        }

        // DESPACHO ó RESPONSABLE
        if (userRole === USER_ROLE.despacho || userRole === USER_ROLE.responsable) {
            // Find the user's cargo
            const userCargo = await Cargo.findOne({
                userId,
                tipo: { $in: [TIPO_CARGO.despacho, TIPO_CARGO.responsable] }
            });

            if (!userCargo) {
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
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
                }]
            });

            const ventaIds = ventas.filter(venta => venta.estado === TIPO_ESTADO_VENTA.preparacion).map(venta => venta._id);
            const ventasDespachoEnLocal = ventas.filter(venta => !venta.direccionDespachoId).length;

            // Count rutasDespacho where the ventas are present
            const contadores = await RutaDespacho.countDocuments({
                ventaIds: { $in: ventaIds },
                choferId: { $in: choferIds },
                estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion
            });
            return NextResponse.json({ ok: true, contadores: { preparacion: (contadores + ventasDespachoEnLocal) }, checklists: checklistResults });
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
            return NextResponse.json({ ok: true, contadores: { pedidos: unaRuta ? 1 : 0 }, checklists: checklistResults });
        }

        // Otros roles: respuesta vacía
        return NextResponse.json({ ok: true, message: "No data for this role." });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}