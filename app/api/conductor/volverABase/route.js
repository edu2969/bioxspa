import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";
import { TIPO_CARGO } from "@/app/utils/constants";

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
        const { rutaId } = body;

        if (!rutaId) {
            console.warn("rutaId is missing in the request body.");
            return NextResponse.json({ 
                ok: false, 
                error: "rutaId is required" 
            }, { status: 400 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findOne({
            _id: rutaId,
            choferId: choferId
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'carga_confirmada' state for ID: ${rutaId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "RutaDespacho not found or not in correct state" 
            }, { status: 404 });
        }

        // Import necessary models and constants

        // Find the driver's cargo (position) that corresponds to conductor (driver) type
        const cargo = await Cargo.findOne({
            userId: choferId,
            tipo: TIPO_CARGO.conductor
        });

        if (!cargo) {
            console.warn(`No conductor cargo found for user ID: ${choferId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "No conductor cargo found for user" 
            }, { status: 404 });
        }

        // Get the dependencia associated with the cargo
        const dependencia = await Dependencia.findById(cargo.dependenciaId);

        if (!dependencia) {
            console.warn(`Dependencia not found for ID: ${cargo.dependenciaId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "Dependencia not found" 
            }, { status: 404 });
        }

        // Get the direccion ID from the dependencia
        const direccionId = dependencia.direccionId;

        if (!direccionId) {
            console.warn(`DireccionId not found in dependencia ID: ${dependencia._id}`);
            return NextResponse.json({ 
                ok: false, 
                error: "DireccionId not found in dependencia" 
            }, { status: 404 });
        }

        rutaDespacho.ruta.push({
            direccionDestinoId: direccionId,
            fecha: null
        });

        // Update estado to en_ruta
        rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.regreso;
        
        console.log(`Updating rutaDespacho ID: ${rutaId} to estado: ${TIPO_ESTADO_RUTA_DESPACHO.regreso}`);
        await rutaDespacho.save();

        console.log("RutaDespacho updated successfully.");
        return NextResponse.json({ 
            ok: true, 
            message: "Viaje iniciado correctamente"
        });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ 
            ok: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
}