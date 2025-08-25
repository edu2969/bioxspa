import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import User from "@/models/user";
import Cliente from "@/models/cliente"; // Asumiendo que existe el modelo Cliente
import DocumentoTributario from "@/models/documentoTributario";
import Direccion from "@/models/direccion";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET(request) {
    await connectMongoDB();

    if (!mongoose.models.User) {
        mongoose.model("User", User.schema);
    }
    if (!mongoose.models.DocumentoTributario) {
        mongoose.model("DocumentoTributario", DocumentoTributario.schema);
    }
    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("id");
    if (!clienteId) {
        return NextResponse.json({ ok: false, error: "Missing clienteId" }, { status: 400 });
    }

    // Busca el cliente
    const cliente = await Cliente.findById(clienteId).lean();
    if (!cliente) {
        return NextResponse.json({ ok: false, error: "Cliente not found" }, { status: 404 });
    }

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
    })
        .populate("vendedorId", "name email")
        .populate("documentoTributarioId", "nombre")
        .sort({ fecha: -1 })
        .lean();

    // Busca detalles de cada venta
    const ventaIds = ventas.map(v => v._id);
    const detalles = await DetalleVenta.find({ ventaId: { $in: ventaIds } }).populate({
        path: "subcategoriaCatalogoId",
        select: "cantidad unidad sinSifon categoriaCatalogoId",
        populate: {
            path: "categoriaCatalogoId",
            select: "esIndustrial codigo elemento"
        }
    }).lean();

    // Adorna ventas con detalles y vendedor
    const ventasDetalladas = ventas.map(v => {
        const detallesVenta = detalles.filter(d => d.ventaId.toString() === v._id.toString());
        return {
            ventaId: v._id,
            folio: v.codigo,
            fecha: v.fecha,
            total: v.valorTotal,
            saldo: v.saldo ?? 0,
            vendedor: v.vendedorId?.name || "",
            documento: v.documentoTributarioId?.nombre || "",
            direccion: v.direccionDespachoId?.direccion || "",
            detalles: detallesVenta.map(d => ({
                glosa: (d.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || "") + " " + (d.subcategoriaCatalogoId?.cantidad || 0) + (d.subcategoriaCatalogoId?.unidad || ""),
                cantidad: d.cantidad,
                neto: d.neto,
                iva: d.iva,
                total: d.total,
                sinSifon: d.subcategoriaCatalogoId?.sinSifon || false,
                esIndustrial: d.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false,
            }))
        };
    });    

    // Respuesta
    return NextResponse.json({
        ok: true,
        ventas: ventasDetalladas
    });
}