import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import CheckList from "@/models/checklist";
import { TIPO_CHECKLIST, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants"; 
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";

export async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await connectMongoDB();
        const unaRuta = await RutaDespacho.findOne({ 
            estado: { $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion, 
                $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado },
            choferId: session.user.id 
        });
        const ahora = new Date();
        // Buscar ambos tipos de checklist del día actual
        const tiposChecklist = [TIPO_CHECKLIST.vehiculo, TIPO_CHECKLIST.personal];
        const checklists = await CheckList.find({
            userId: session.user.id,
            tipo: { $in: tiposChecklist },
            fecha: {
                $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), // Desde el inicio del día de hoy
            }
        }).select("tipo passed fecha").lean();

        // Formatear la salida como arreglo de objetos con tipo, aprobado y fecha
        const checklistResults = checklists.map(cl => ({
            tipo: cl.tipo,
            aprobado: !!cl.passed,
            fecha: cl.fecha
        }));
        return NextResponse.json({ ok: true, tienePedidos: unaRuta ? true : false, checklists: checklistResults });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}