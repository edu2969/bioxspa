import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(req) {
    try {
        await connectMongoDB();
        const body = await req.json();

        // Validate required fields
        const requiredFields = [
            "temporalId",
            "clienteId",
            "codigo",
            "vendedorId",
            "fecha",
            "valorNeto",
            "valorIva",
            "valorBruto",
            "valorTotal",
            "documentoTributarioId"
        ];

        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `Field '${field}' is required` }, { status: 400 });
            }
        }

        // Create a new Venta with estado set to BORRADOR
        const nuevaVenta = new Venta({
            ...body,
            estado: TIPO_ESTADO_VENTA.borrador
        });

        // Save the Venta to the database
        const savedVenta = await nuevaVenta.save();

        return NextResponse.json({ ok: true, venta: savedVenta });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}