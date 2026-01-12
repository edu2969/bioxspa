import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import Venta from "@/models/venta";

export async function POST(request: NextRequest) {
    try {
        console.log("POST request received for confirmar descarga.");
        
        await connectMongoDB();
        console.log("MongoDB connected.");

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { rutaId } = await request.json();
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId);

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "Ruta no encontrada" }, { status: 404 });
        }

        // Verificar que la ruta esté en estado de descarga
        if (rutaDespacho.estado !== TIPO_ESTADO_RUTA_DESPACHO.descarga) {
            console.warn(`Ruta no está en estado de descarga. Estado actual: ${rutaDespacho.estado}`);
            return NextResponse.json({ ok: false, error: "La ruta no está en estado de descarga" }, { status: 400 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId) !== session.user.id) {
            console.warn("User doesn't have access to this ruta");
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Actualizar estado a descarga_confirmada
        const nuevoEstado = TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada;
        const fechaActual = new Date();

        rutaDespacho.estado = nuevoEstado;
        rutaDespacho.historialEstado.push({
            estado: nuevoEstado,
            fecha: fechaActual
        });

        await rutaDespacho.save();

        console.log(`Ruta ${rutaId} actualizada a estado descarga_confirmada`);

        // Actualizar las ventas asociadas a estado entregado
        if (rutaDespacho.ventaIds && rutaDespacho.ventaIds.length > 0) {
            await Venta.updateMany(
                { _id: { $in: rutaDespacho.ventaIds } },
                { 
                    $set: { estado: TIPO_ESTADO_VENTA.entregado },
                    $push: { 
                        historialEstados: {
                            fecha: fechaActual,
                            estado: TIPO_ESTADO_VENTA.entregado
                        }
                    }
                }
            );
            console.log(`${rutaDespacho.ventaIds.length} ventas actualizadas a estado entregado`);
        }

        return NextResponse.json({ 
            ok: true, 
            message: "Descarga confirmada exitosamente",
            estado: nuevoEstado 
        });

    } catch (error) {
        console.error("Error al confirmar descarga:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}