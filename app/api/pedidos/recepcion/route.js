import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(request) {
    try {
        await connectMongoDB();
        const { items } = await request.json();

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid payload format. 'items' should be an array." }, { status: 400 });
        }

        const updatePromises = items.map(async ({ codigo, nuevoEstado }) => {
            if (!codigo || nuevoEstado === undefined || !(nuevoEstado in TIPO_ESTADO_VENTA)) {
                throw new Error(`Invalid item data: { codigo: ${codigo}, nuevoEstado: ${nuevoEstado} }`);
            }

            return ItemCatalogo.updateOne(
                { codigo },
                { $set: { estado: nuevoEstado } }
            );
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ message: "Estados actualizados correctamente." });
    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}