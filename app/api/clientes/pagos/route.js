import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Pago from "@/models/pago";
import Venta from "@/models/venta";
import DocumentoTributario from "@/models/documentoTributario";
import FormaPago from "@/models/formaPago";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    if (!mongoose.models.FormaPago) {
        mongoose.model("FormaPago", FormaPago.schema);
    }

    //  Busca formas de pago
    const documentoIds = await DocumentoTributario.find({
        venta: true
    }).select("_id");

    // Busca ventas por cobrar del cliente
    const ventas = await Venta.find({ 
        clienteId, 
        porCobrar: true, 
        estado: TIPO_ESTADO_VENTA.entregado,
        valorTotal: { $gt: 0 },
        documentoTributarioId: { $in: documentoIds }
    }).select("_id").lean();
    const ventaIds = ventas.map(v => v._id);

    // Busca pagos asociados a esas ventas
    const pagos = await Pago.find({ ventaId: { $in: ventaIds } })
        .populate("formaPagoId", "nombre")
        .sort({ fecha: -1 })
        .lean();

    return NextResponse.json({
        ok: true,
        pagos,
    });
}