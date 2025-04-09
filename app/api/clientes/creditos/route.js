import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

export async function GET(req) {
    const params = await req.nextUrl;
    console.log("CLIENTE getById...", params);
    await connectMongoDB();
    const cliente = await Cliente.findById(params.id).lean();
    if (!cliente) {
        return NextResponse.json({ error: "Cliente not found" }, { status: 400 });
    }

    // Add credito information
    cliente.credito = {
        actual: 1000000,
        maximo: 2500000
    };

    console.log("SALDRÁ", { cliente });
    return NextResponse.json({ cliente });
}