import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

export async function POST(req) {
    try {
        const { clienteId, credito } = await req.json();

        if (!clienteId || typeof credito !== "number") {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }

        await connectMongoDB();

        const cliente = await Cliente.findById(clienteId);
        if (!cliente) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        cliente.credito = credito;
        await cliente.save();

        return NextResponse.json({ ok: true, credito: cliente.credito });
    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}