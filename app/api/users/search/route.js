import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = req.nextUrl;
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        });

        return NextResponse.json({ ok: true, users });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}