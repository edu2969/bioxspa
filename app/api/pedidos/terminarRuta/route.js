import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import RutaDespacho from "@/models/rutaDespacho";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_CARGO, USER_ROLE, TIPO_ORDEN } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/pedidos/terminarRuta/route.js

export async function POST(req) {
    try {
        console.log("POST request received for terminarRuta.");
        await connectMongoDB();
        console.log("MongoDB connected.");

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
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
            estado: TIPO_ESTADO_RUTA_DESPACHO.regreso
        }).populate({
            path: 'ventaIds',
            select: 'tipo'
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'regreso' state for ID: ${rutaId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "RutaDespacho not found or not in regreso state" 
            }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            console.warn(`User ${userId} is not the assigned driver for route ${rutaId}`);
            return NextResponse.json({ 
                ok: false, 
                error: "You are not authorized to complete this route" 
            }, { status: 403 });
        }

        // Verify the user has the conductor role
        const user = await User.findById(userId);
        if (!user || !(user.role & USER_ROLE.conductor)) {
            console.warn(`User ${userId} does not have the conductor role`);
            return NextResponse.json({ 
                ok: false, 
                error: "You do not have permission to complete routes" 
            }, { status: 403 });
        }

        // Additionally verify the user has a cargo of type conductor
        const cargo = await Cargo.findOne({
            userId: userId,
            tipo: TIPO_CARGO.conductor,
            hasta: null // Active assignment (not ended)
        });

        if (!cargo) {
            console.warn(`User ${userId} does not have an active conductor position`);
            return NextResponse.json({ 
                ok: false, 
                error: "You do not have an active position as conductor" 
            }, { status: 403 });
        }

        const ventasTraslado = rutaDespacho.ventaIds.filter(venta => venta.tipo === TIPO_ORDEN.traslado);        
        rutaDespacho.estado = ventasTraslado.length > 0 ? TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado : TIPO_ESTADO_RUTA_DESPACHO.terminado;
        await rutaDespacho.save();
        return NextResponse.json({ 
            ok: true, 
            message: "Ruta completada correctamente", 
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