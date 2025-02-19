import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const clientes = await Cliente.find({
            $or: [
                { nombre: { $regex: query, $options: "i" } },
                { direccion: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        });

        return NextResponse.json({ ok: true, clientes });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}