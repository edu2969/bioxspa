import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import RutaDespacho from "@/models/rutaDespacho";
import { USER_ROLE, TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import ItemCatalogo from "@/models/itemCatalogo";

// filepath: d:\git\bioxspa\app\api\pedidos\confirmarDescarga\route.js

export async function POST(request) {
    console.log("Starting confirmarDescarga process");
    try {
        await connectMongoDB();

        // Get rutaId and scanCodes from request
        const { rutaId, scanCodes } = await request.json();
        console.log("Request received with rutaId:", rutaId, "scanCodes:", scanCodes);

        // Validate rutaId
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        // Validate scanCodes
        if (!Array.isArray(scanCodes)) {
            return NextResponse.json({ ok: false, error: "scanCodes must be an array" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        if (user.role !== USER_ROLE.conductor) {
            return NextResponse.json({ ok: false, error: "Insufficient permissions - requires conductor role" }, { status: 403 });
        }

        // Verify the user has a conductor cargo assigned
        const cargo = await Cargo.findOne({
            userId: userId,
            tipo: TIPO_CARGO.conductor,
            hasta: null
        });

        if (!cargo) {
            return NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }

        // Find the rutaDespacho
        const rutaDespacho = await RutaDespacho.findById(rutaId);

        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }

        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            return NextResponse.json({ ok: false, error: "User is not the assigned driver for this route" }, { status: 403 });
        }

        // Get current date
        const now = new Date();

        // Update the route: set estado to descarga_confirmada, update historialEstado, and add to hitorialCarga
        await RutaDespacho.findByIdAndUpdate(
            rutaId,
            {
                estado: TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada,
                $push: {
                    historialEstado: {
                        estado: TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada,
                        fecha: now
                    },
                    hitorialCarga: {
                        esCarga: false,
                        fecha: now,
                        itemMovidoIds: scanCodes
                    }
                }
            }
        );

        // Encuentra la última dirección destino de la ruta
        const lastRoute = rutaDespacho.ruta[rutaDespacho.ruta.length - 1];
        const lastDireccionId = lastRoute.direccionDestinoId?._id || lastRoute.direccionDestinoId;

        // Actualiza la direccionId de cada item movido
        await ItemCatalogo.updateMany(
            { _id: { $in: scanCodes } },
            { $set: { direccionId: lastDireccionId } }
        );

        return NextResponse.json({
            ok: true,
            message: "Unloading confirmation successful"
        });

    } catch (error) {
        console.error("Error in POST /confirmarDescarga:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
