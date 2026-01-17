import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Venta from "@/models/venta";

export async function POST(request: NextRequest) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    try {
        const { ventaId, nombreRecibe, rutRecibe } = await request.json();

        console.log("Received data:", { ventaId, nombreRecibe, rutRecibe });

        if (!ventaId || !nombreRecibe || !rutRecibe) {
            return NextResponse.json(
                { ok: false, error: "ventaId, nombreRecibe y rutRecibe son requeridos" },
                { status: 400 }
            );
        }

        console.log("Actualizando entrega en local para venta:", ventaId);

        const venta = await Venta.findByIdAndUpdate(
            ventaId,
            {
                $push: {
                    entregasEnLocal: {
                        nombreRecibe,
                        rutRecibe
                    }
                }
            },
            { new: true, runValidators: true }
        );

        if (!venta) {
            return NextResponse.json(
                { ok: false, error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        console.log("Entrega en local agregada exitosamente");

        return NextResponse.json({
            ok: true,
            message: "Entrega en local agregada exitosamente",
            venta
        });

    } catch (error) {
        console.error("Error al actualizar entrega en local:", error);
        return NextResponse.json(
            { ok: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}