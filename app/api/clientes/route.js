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
            .select("nombre giro  rut direccionId telefono email emailIntercambio ordenCompra arriendo cilindrosMin cilindrosMax activo enQuiebra tipoPrecio direccionesDespacho documentoTributarioId credito mesesAumento")
            .populate({
                path: "direccionesDespacho.direccionId",
                model: "Direccion",
                select: "_id nombre latitud longitud"
            })
            .lean();
        
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
        console.log("[POST] Conectado a MongoDB");
        const entity = await req.json();
        console.log("[POST] Datos recibidos:", entity);

        const exists = await Cliente.findOne({ _id: entity._id });
        console.log("[POST] Cliente existente:", exists ? "Sí" : "No");

        if (exists) {
            exists.set(entity);
            try {
                await exists.save();
                console.log("[POST] Cliente actualizado correctamente");
            } catch (saveError) {
                console.error("[POST] Error al actualizar cliente:", saveError);
                throw saveError;
            }
            return NextResponse.json({ ok: true, cliente: exists });
        } else {
            try {
                const newCliente = await Cliente.create(entity);
                console.log("[POST] Nuevo cliente creado:", newCliente);
                return NextResponse.json({ ok: true, cliente: newCliente });
            } catch (createError) {
                console.error("[POST] Error al crear cliente:", createError);
                throw createError;
            }
        }
    } catch (error) {
        console.log("[POST] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}