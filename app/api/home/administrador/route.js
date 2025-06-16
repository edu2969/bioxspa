import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants"; 

export async function GET() {
    try {
        await connectMongoDB();

        const porAsignarCount = await Venta.countDocuments({ 
            estado: TIPO_ESTADO_VENTA.por_asignar
        });

        const resultado = [
            { pedido: 0, flota: porAsignarCount, deudas: 0 }
        ];

        return NextResponse.json({ ok: true, resultado });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}