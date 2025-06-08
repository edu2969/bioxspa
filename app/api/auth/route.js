import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";
import User from "@/models/user";
import Cargo from "@/models/cargo";

export async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        await connectMongoDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            console.warn("User not found.");
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        const cargo = await Cargo.findOne({ userId: user._id });

        if (!cargo) {
            console.warn("Cargo not found for the user.");
            return NextResponse.json({ ok: false, error: "Cargo not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, cargo: cargo.tipo, userId: user._id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}