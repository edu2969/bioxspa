import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants"; 

export async function GET() {
    try {
        await connectMongoDB();

        const ventas = await Venta.find({ 
            estado: { $gte: TIPO_ESTADO_VENTA.borrador, $lte: TIPO_ESTADO_VENTA.reparto },
        });
        const pedidosCount = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.borrador).length;
        const porAsignar = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.por_asignar).length;
        const preparacion = ventas.filter(v => v.estado === TIPO_ESTADO_VENTA.preparacion).length;
        const enRuta = ventas.length - pedidosCount - porAsignar - preparacion;
        const resultado = { 
            pedidosCount, 
            asignacionCounts: {
                porAsignar,
                preparacion,
                enRuta,
            },
            deudasCount: 0,
        }

        return NextResponse.json({ ok: true, resultado });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}