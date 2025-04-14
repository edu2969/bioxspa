import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";
import DetalleVenta from "@/models/detalleVenta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(req) {
    try {
        await connectMongoDB();
        const body = await req.json();

        console.log("BODY 2", body);

        const requiredFields = [
            "clienteId",
            "sucursalId",
            "usuarioId",
            "documentoTributarioId",
            "items"
        ];

        for (const field of requiredFields) {
            if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
            const errorMessage = `Field '${field}' is required and cannot be empty`;
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }

        for (const item of body.items) {
            if (!item.cantidad || !item.precio || !item.subcategoriaId) {
            const errorMessage = "Each item must have 'cantidad', 'precio', and 'subcategoriaId'";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }
        
        const valorNeto = body.items.reduce((total, item) => {
            return total + (item.cantidad * item.precio);
        }, 0);

        const cliente = await Cliente.findById(body.clienteId);
        if (!cliente) {
            const errorMessage = "Cliente not found";
            console.error("Validation Error:", errorMessage);
            return NextResponse.json({ error: errorMessage }, { status: 404 });
        }

        const tieneArriendo = cliente.arriendo;

        const nuevaVenta = new Venta({
            clienteId: body.clienteId,
            vendedorId: body.usuarioId,
            fecha: new Date(),
            estado: TIPO_ESTADO_VENTA.borrador,
            valorNeto,
            valorIva: valorNeto * 0.19,
            valorBruto: valorNeto * (1 - 0.19),
            valorTotal: valorNeto * 1.19,
            documentoTributarioId: body.documentoTributarioId,
            porCobrar: true,
            tieneArriendo
        });
        const savedVenta = await nuevaVenta.save();

        for (const item of body.items) {
            const detalleVenta = new DetalleVenta({
                ventaId: savedVenta._id,
                subcategoriaCatalogoId: item.subcategoriaId || null,
                itemsCatalogoId: item.itemCategoriaId || null,
                cantidad: item.cantidad,
                neto: item.cantidad * item.precio,
                iva: item.cantidad * item.precio * 0.19,
                total: item.cantidad * item.precio * 1.19
            });
            await detalleVenta.save();
        }

        return NextResponse.json({ ok: true, venta: savedVenta });
    } catch (error) {
        console.error("ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}