import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import Pago from "@/models/pago";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/cobros/pagar/route.js

export async function POST(request) {
    await connectMongoDB();
    console.log("Conexión a MongoDB establecida");

    const body = await request.json();
    console.log("Body recibido:", body);

    const { ventas, formaPagoId, fecha, adjuntoUrls = [] } = body;

    if (!Array.isArray(ventas) || !formaPagoId || !fecha) {
        console.error("Datos inválidos:", { ventas, formaPagoId, fecha });
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    let pagos = [];
    for (const ventaObj of ventas) {
        const ventaId = ventaObj._id;
        const pagoMonto = ventaObj.monto;

        console.log(`Procesando venta: ${ventaId}, monto: ${pagoMonto}`);

        const venta = await Venta.findById(ventaId);
        if (!venta) {
            console.warn(`Venta no encontrada: ${ventaId}`);
            continue;
        }

        // Ajustar saldo
        let nuevoSaldo = (venta.saldo || venta.valorTotal) - pagoMonto;
        if (nuevoSaldo < 0) nuevoSaldo = 0;

        // Determinar estado y porCobrar
        let nuevoEstado = venta.estado;
        let nuevoPorCobrar = venta.porCobrar;

        if (nuevoSaldo === 0) {
            nuevoEstado = TIPO_ESTADO_VENTA.pagado;
            nuevoPorCobrar = false;
        } else if (nuevoSaldo > 0) {
            nuevoEstado = venta.estado; // Mantener estado actual
            nuevoPorCobrar = true;
        }

        console.log(`Actualizando venta ${ventaId}: saldo=${nuevoSaldo}, estado=${nuevoEstado}, porCobrar=${nuevoPorCobrar}`);

        await Venta.updateOne(
            { _id: ventaId },
            {
                saldo: nuevoSaldo,
                estado: nuevoEstado,
                porCobrar: nuevoPorCobrar
            }
        );

        // Crear registro de pago
        pagos.push({
            ventaId,
            monto: pagoMonto,
            formaPagoId,
            adjuntoUrls,
            fecha: new Date(fecha)
        });
    }

    // Insertar todos los pagos
    if (pagos.length > 0) {
        console.log("Insertando pagos:", pagos);
        await Pago.insertMany(pagos);
    } else {
        console.warn("No se registraron pagos");
    }

    console.log("Pagos registrados correctamente");
    return NextResponse.json({ message: "Pagos registrados", pagos });
}