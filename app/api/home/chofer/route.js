import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants"; 
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";

export async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await connectMongoDB();
        const unaRuta = await RutaDespacho.findOne({ 
            estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion, 
            choferId: session.user.id 
        });
        return NextResponse.json({ ok: true, tienePedidos: unaRuta ? true : false });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}