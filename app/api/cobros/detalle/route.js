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
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/deudas/detalle/route.js

function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString("es-CL", { month: "short", year: "2-digit" }),
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }
    return months;
}

function generateFakeDebtData(ventas, pagos) {
    // Genera datos ficticios para los últimos 6 meses
    const months = getLast6Months();
    let deudaAcumulada = 0;
    let pagoAcumulado = 0;
    return months.map((m) => {
        // Suma ventas y pagos de ese mes
        const ventasMes = ventas.filter(v => {
            const d = new Date(v.fecha);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
        });
        const pagosMes = pagos.filter(p => {
            const d = new Date(p.fecha);
            return d.getFullYear() === m.year && d.getMonth() === m.month;
        });
        deudaAcumulada += ventasMes.reduce((sum, v) => sum + v.valorTotal, 0);
        pagoAcumulado += pagosMes.reduce((sum, p) => sum + p.monto, 0);
        return {
            mes: m.label,
            deuda: deudaAcumulada,
            pago: pagoAcumulado
        };
    });
}

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
        documentoTributarioId: { $in: documentoIds }
    })
        .populate("vendedorId", "name email telefono")
        .populate("documentoTributarioId", "nombre")
        .populate("direccionDespachoId", "direccion")
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
            folio: v.codigo,
            fecha: v.fecha,
            total: v.valorTotal,
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

    // Datos ficticios de pagos (puedes reemplazar por pagos reales si tienes modelo)
    const pagos = getLast6Months().map(m => ({
        fecha: new Date(m.year, m.month, 10),
        monto: Math.floor(Math.random() * 500000)
    }));

    // Genera gráfico de deuda/pago últimos 6 meses
    const graficoDeuda = generateFakeDebtData(ventas, pagos);

    // Obtiene los IDs de direcciones de despacho del cliente
    const despachoIds = cliente.direccionesDespacho?.map(d => d.direccionId) || [];

    // Busca items del catálogo cuya direccionId coincida con alguna dirección de despacho
    const items = await (
        despachoIds.length > 0
            ? ItemCatalogo.find({ direccionId: { $in: despachoIds } })
                .populate({
                    path: "subcategoriaCatalogoId",
                    select: "cantidad unidad sinSifon categoriaCatalogoId",
                    populate: {
                        path: "categoriaCatalogoId",
                        select: "esIndustrial codigo elemento"
                    }
                })
                .lean()
            : []
    );

    // Adorna los items con los datos requeridos
    const cilindros = items.map(item => ({
        _id: item._id,
        codigo: item.codigo,
        elemento: item.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || null,
        cantidad: item.subcategoriaCatalogoId?.cantidad || null,
        unidad: item.subcategoriaCatalogoId?.unidad || null,
        sinSifon: item.subcategoriaCatalogoId?.sinSifon || false,
        esIndustrial: item.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false        
    }));

    // Respuesta
    return NextResponse.json({
        ok: true,
        cliente: {
            _id: cliente._id,
            nombre: cliente.nombre,
            rut: cliente.rut,
            credito: cliente.credito ?? 0,
            totalDeuda: ventas.reduce((sum, v) => sum + v.valorTotal, 0),
            disponible: (cliente.credito ?? 0) - ventas.reduce((sum, v) => sum + v.valorTotal, 0),
            ultimaVenta: ventas[0]?.fecha || null,
            ultimoPago: pagos[pagos.length - 1]?.fecha || null,
            ventas: ventasDetalladas,
            graficoDeuda,
            cilindros
        }
    });
}