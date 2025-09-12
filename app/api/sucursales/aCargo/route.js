import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Cargo from "@/models/cargo";
import Sucursal from "@/models/sucursal";
import { USER_ROLE } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/sucursales/aCargo/route.js

export async function GET() {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        // Buscar cargos del usuario con tipo gerente o cobranza y sucursal activa
        const tiposCargo = [USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado];

        // Buscar cargos activos (sin hasta o hasta en el futuro)
        const cargos = await Cargo.find({
            userId,
            tipo: { $in: tiposCargo },
            sucursalId: { $ne: null },
            $or: [
                { hasta: null },
                { hasta: { $gte: new Date() } }
            ]
        }).select("sucursalId").lean();

        const sucursalIds = cargos.map(c => c.sucursalId);

        // Buscar sucursales activas
        const sucursales = await Sucursal.find({
            _id: { $in: sucursalIds },
            visible: true
        }).select("_id nombre").lean();

        return NextResponse.json({ ok: true, sucursales });
    } catch (error) {
        console.error("Error fetching sucursales aCargo:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}