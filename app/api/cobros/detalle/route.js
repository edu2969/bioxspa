import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import User from "@/models/user";
import Cliente from "@/models/cliente"; // Asumiendo que existe el modelo Cliente
import DocumentoTributario from "@/models/documentoTributario";
import Direccion from "@/models/direccion";

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

    // Busca ventas por cobrar del cliente
    const ventas = await Venta.find({ clienteId, porCobrar: true })
        .populate("vendedorId", "name email telefono")
        .populate("documentoTributarioId", "nombre")
        .populate("direccionDespachoId", "direccion")
        .sort({ fecha: -1 })
        .lean();

    // Busca detalles de cada venta
    const ventaIds = ventas.map(v => v._id);
    const detalles = await DetalleVenta.find({ ventaId: { $in: ventaIds } }).lean();

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
                glosa: d.glosa,
                cantidad: d.cantidad,
                neto: d.neto,
                iva: d.iva,
                total: d.total
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
            graficoDeuda
        }
    });
}