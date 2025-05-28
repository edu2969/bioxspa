import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function POST(req) {
    try {
        console.log("POST request received for iniciarViaje.");
        await connectMongoDB();
        console.log("MongoDB connected.");

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = session.user.id;
        const body = await req.json();
        const { rutaId, direccionId } = body;

        if (!rutaId || !direccionId) {
            console.warn("rutaId or direccionId is missing in the request body.");
            return NextResponse.json({ 
                ok: false, 
                error: "rutaId and direccionId are required" 
            }, { status: 400 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findOne({
            _id: rutaId,
            choferId: choferId,
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'carga_confirmada' state for ID: ${rutaId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "RutaDespacho not found or not in correct state" 
            }, { status: 404 });
        }

        // Add new route without date
        if (!rutaDespacho.ruta) {
            rutaDespacho.ruta = [];
        }
        
        rutaDespacho.ruta.push({
            direccionDestinoId: direccionId,
            fecha: null
        });

        // Update estado to en_ruta
        rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.en_ruta;
        
        console.log(`Updating rutaDespacho ID: ${rutaId} to estado: ${TIPO_ESTADO_RUTA_DESPACHO.en_ruta}`);
        await rutaDespacho.save();

        console.log("RutaDespacho updated successfully.");
        return NextResponse.json({ 
            ok: true, 
            message: "Viaje iniciado correctamente", 
            rutaDespacho 
        });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ 
            ok: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
}