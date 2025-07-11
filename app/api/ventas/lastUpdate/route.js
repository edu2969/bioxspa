import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Venta from "@/models/venta";

export async function GET() {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Buscar la venta más reciente por updatedAt
        const lastVenta = await Venta.findOne({})
            .sort({ updatedAt: -1 })
            .select("updatedAt")
            .lean();

        if (!lastVenta) {
            return NextResponse.json({ ok: true, updatedAt: null });
        }

        return NextResponse.json({ ok: true, updatedAt: lastVenta.updatedAt });
    } catch (error) {
        console.error("Error fetching last venta update:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}