import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants"; 

export async function GET(req) {
    try {
        await connectMongoDB();

        const borradorCount = await Venta.countDocuments({ estado: TIPO_ESTADO_VENTA.borrador, porCobrar: true });

        const resultado = [
            { pedido: 0, flota: borradorCount, deudas: 0 }
        ];

        return NextResponse.json({ ok: true, resultado });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}