import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import mongoose from "mongoose";
import Direccion from "@/models/direccion";

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }
        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
            console.log("[GET] Registered Direccion model");
        }

        // Busca el cliente y popula documentoTributarioId y direccionDespachoIds
        const cliente = await Cliente.findById(id)
            .select("nombre rut direccionId telefono email emailIntercambio ordenCompra arriendo cilindrosMin cilindrosMax activo enQuiebra tipoPrecio direccionDespachoIds documentoTributarioId")
            .populate({
                path: "direccionDespachoIds",
                select: "_id nombre"
            }).lean();

        if (!cliente) {
            return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, cliente });
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