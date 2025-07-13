import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import BIDeuda from "@/models/biDeuda";

export async function GET(req) {
    const params = req.nextUrl.searchParams;
    const clienteId = params.get("id");
    console.log("CLIENTE getById...", clienteId);

    await connectMongoDB();

    const cliente = await Cliente.findById(clienteId).lean();
    if (!cliente) {
        return NextResponse.json({ error: "Cliente not found" }, { status: 400 });
    }

    // Obtener deuda utilizada
    const deuda = await BIDeuda.aggregate([
        { $match: { clienteId: cliente._id } },
        { $group: { _id: null, utilizado: { $sum: "$monto" } } }
    ]);
    const utilizado = deuda.length > 0 ? deuda[0].utilizado : 0;
    const autorizado = cliente.credito || 0;    

    return NextResponse.json({ autorizado, utilizado });
}