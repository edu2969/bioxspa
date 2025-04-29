import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

export async function GET() {
    try {
        await connectMongoDB();
        const clientes = await Cliente.find();
        return NextResponse.json({ ok: true, clientes });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectMongoDB();
        const entity = await req.json();
        const exists = await Cliente.findOne({ id: entity.id });

        if (exists) {
            exists.set(entity);
            await exists.save();
            return NextResponse.json({ ok: true, cliente: exists });
        } else {
            const newCliente = await Cliente.create(entity);
            return NextResponse.json({ ok: true, cliente: newCliente });
        }
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}