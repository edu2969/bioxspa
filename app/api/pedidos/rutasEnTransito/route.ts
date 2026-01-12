import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";
import { IRutasEnTransitoResponse } from "@/types/types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";

export async function GET(request: NextRequest) {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("Connected to MongoDB");

        // Obtener la sesión del usuario autenticado
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
        }

        // Obtener sucursalId de los parámetros de la URL
        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get('sucursalId');
        
        if (!sucursalId) {
            return NextResponse.json({ error: 'sucursalId es requerido' }, { status: 400 });
        }

        // Primero, buscar ventas activas en la sucursal especificada
        const ventasActivas = await Venta.find({
            sucursalId: sucursalId,
            estado: {
                $in: [
                    TIPO_ESTADO_VENTA.reparto,
                    TIPO_ESTADO_VENTA.preparacion,
                    TIPO_ESTADO_VENTA.entregado
                ]
            }
        }).select("_id").lean();

        const ventaIds = ventasActivas.map(venta => venta._id);

        if (ventaIds.length === 0) {
            return NextResponse.json({ enTransito: [] });
        }

        // Buscar rutas de despacho que contengan estas ventas y estén en tránsito
        const enTransito = await RutaDespacho.find({
            ventaIds: { $in: ventaIds },
            estado: {
                $gte: TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino,
                $lte: TIPO_ESTADO_RUTA_DESPACHO.regreso
            }
        })
        .select("_id estado").lean();

        const enTransitoReponse: IRutasEnTransitoResponse[] = enTransito.map(ruta => ({
            rutaId: String(ruta._id),
            estado: ruta.estado
        }));

        return NextResponse.json({ enTransito: enTransitoReponse });
        
    } catch (error) {
        console.error('Error en rutasEnTransito:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}