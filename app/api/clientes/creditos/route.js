import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

// filepath: d:/git/bioxspa/app/api/clientes/creditos/route.js

export async function GET(req, props) {
    const params = await props.params;
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