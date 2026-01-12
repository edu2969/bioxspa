import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Venta from "@/models/venta";

export async function POST(request: NextRequest) {
    try {
        await connectMongoDB();

        // Get ventaId and comentario from request body
        const { ventaId, comentario } = await request.json();

        if (!ventaId) {
            return NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Update the comentario field of the venta
        const venta = await Venta.findByIdAndUpdate(
            ventaId,
            { comentario }
        );

        if (!venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, message: "Comentario actualizado", venta });
    } catch (error) {
        console.error("Error in POST /ventas/comentar:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}