import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import { USER_ROLE } from "@/app/utils/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import User from "@/models/user";
import { IUser } from "@/types/user";

export async function GET() {
    try {
        console.log("GET /api/flota/porConductor called...");
        await connectMongoDB();

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = await User.findById(userId).select('role').lean<IUser>();
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const cargo = await Cargo.findOne({ userId });
        if (!cargo) {
            return NextResponse.json({ error: "User has no assigned cargo" }, { status: 400 });
        }

        if (cargo.tipo !== USER_ROLE.conductor) {
            return NextResponse.json({ error: "User is not a conductor" }, { status: 403 });
        }

        const vehiculos = await Vehiculo.find({ 
            choferIds: { $in: [userId] } 
        })
        .select('_id marca modelo patente')
        .lean();

        return NextResponse.json({ 
            vehiculos 
        });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}