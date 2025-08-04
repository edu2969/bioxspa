import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";

export async function GET(request) {
    try {
        await connectMongoDB();

        // Get query param q (0, 30, 60, 90)
        const { searchParams } = new URL(request.url);
        const q = parseInt(searchParams.get("q"), 10);

        // Validate q
        if (![0, 30, 60, 90].includes(q)) {
            return NextResponse.json({ ok: false, error: "Invalid 'q' parameter" }, { status: 400 });
        }

        const now = new Date();

        // Get all clientes
        const clientes = await Cliente.find({ activo: true }).select("nombre credito telefono email");

        // Get all ventas por cobrar
        const ventas = await Venta.find({ porCobrar: true }).select("clienteId fecha valorTotal numeroDocumento");

        // Agrupar ventas por cliente y filtrar por rango de días
        const resumen = clientes.map(cliente => {
            const ventasCliente = ventas.filter(v => String(v.clienteId) === String(cliente._id)).filter(v => {
                const fechaVenta = new Date(v.fecha);
                const diffDays = Math.floor((now - fechaVenta) / (1000 * 60 * 60 * 24));
                if (q === 0) return diffDays < 30;
                if (q === 30) return diffDays >= 30 && diffDays < 60;
                if (q === 60) return diffDays >= 60 && diffDays < 90;
                if (q === 90) return diffDays >= 90;
                return false;
            });

            const totalDeuda = ventasCliente.reduce((sum, v) => sum + v.valorTotal, 0);
            const disponible = cliente.credito - totalDeuda;

            return {
                _id: cliente._id,
                nombre: cliente.nombre,
                credito: cliente.credito,
                telefono: cliente.telefono,
                email: cliente.email,
                totalDeuda,
                disponible,
                ventas: ventasCliente.map(v => ({
                    _id: v._id,
                    fecha: v.fecha,
                    valorTotal: v.valorTotal,
                    numeroDocumento: v.numeroDocumento
                }))
            };
        }).filter(c => c.totalDeuda > 0); // Solo clientes con deuda

        return NextResponse.json({ ok: true, clientes: resumen });
    } catch (error) {
        console.error("Error in GET /deudas:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}