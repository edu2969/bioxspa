import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import BIDeuda from "@/models/biDeuda";
import Venta from "@/models/venta";

export async function GET(request: NextRequest) {
    try {
        console.log("Conectando a MongoDB...");
        await connectMongoDB();

        // Get query params
        const { searchParams } = new URL(request.url);
        const q = parseInt(searchParams.get("q") ?? "0", 10); // 0: mes actual, 30: mes pasado, etc.
        const page = parseInt(searchParams.get("page") || "1", 10);
        const sortBy = searchParams.get("sortBy") || "nombre";
        const sortOrder = searchParams.get("sortOrder") || "asc";

        console.log("Query params:", { q, page, sortBy, sortOrder });

        // Validar q
        if (![0, 30, 60, 90].includes(q)) {
            console.warn("Parámetro 'q' inválido:", q);
            return NextResponse.json({ ok: false, error: "Invalid 'q' parameter" }, { status: 400 });
        }
        
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }

        // Calcular periodoFecha
        const now = new Date();
        let targetMonth = now.getMonth() - (q / 30);
        let targetYear = now.getFullYear();
        while (targetMonth < 0) {
            targetMonth += 12;
            targetYear -= 1;
        }
        const periodoFecha = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);

        console.log("Periodo fecha calculada:", periodoFecha);

        // Construir query para biDeuda
        let biDeudaQuery: {
            periodo: string;
            clienteId: { $ne: null };
            fecha?: { $lte: Date } | Date;            
        } = {
            periodo: "M",
            clienteId: { $ne: null }
        };
        if (q === 90) {
            biDeudaQuery.fecha = { $lte: periodoFecha };
        } else {
            biDeudaQuery.fecha = periodoFecha;
        }

        // Buscar biDeudas del periodo mensual, con clienteId válido
        const biDeudas = await BIDeuda.find(biDeudaQuery).populate("lastVentaId");

        console.log("biDeudas encontradas:", biDeudas.length);
        if (biDeudas.length > 0) {
            console.log("Ejemplo biDeuda:", biDeudas[0]);
        }

        // Obtener IDs únicos de clientes con deuda en el periodo
        const clienteIds = biDeudas.map(d => String(d.clienteId));
        console.log("IDs únicos de clientes con deuda:", clienteIds);

        // Buscar clientes activos con deuda en el periodo
        const clientes = await Cliente.find({ _id: { $in: clienteIds } })
            .select("nombre credito telefono email");

        console.log("Clientes activos encontrados:", clientes.length);
        if (clientes.length > 0) {
            console.log("Ejemplo cliente:", clientes[0]);
        }

        // Agrupar deudas por cliente
        let resumen = clientes.map(cliente => {
            const deudasCliente = biDeudas.filter(d => String(d.clienteId) === String(cliente._id));
            const totalDeuda = deudasCliente.reduce((sum, d) => sum + d.monto, 0);
            const disponible = cliente.credito - totalDeuda;
            // Usar ventasPorCobrar directamente del modelo
            const ventasPorCobrar = deudasCliente.reduce((sum, d) => sum + (d.ventasPorCobrar || 0), 0);

            // Obtener la última venta desde lastVentaId
            let ultimaVenta = null;
            if (deudasCliente.length > 0) {
                // Tomar la venta con la fecha más reciente
                const lastVenta = deudasCliente.reduce((a, b) => {
                    if (!a.lastVentaId || !b.lastVentaId) return a;
                    return new Date(a.lastVentaId.fecha) > new Date(b.lastVentaId.fecha) ? a : b;
                });
                ultimaVenta = lastVenta.lastVentaId ? lastVenta.lastVentaId.fecha : null;
            }

            return {
                _id: cliente._id,
                nombre: cliente.nombre,
                credito: cliente.credito,
                telefono: cliente.telefono,
                email: cliente.email,
                totalDeuda,
                disponible,
                ventasPorCobrar,
                ultimaVenta
            };
        }).filter(c => c.totalDeuda > 0);

        console.log("Resumen agrupado por cliente:", resumen.length);
        if (resumen.length > 0) {
            console.log("Ejemplo resumen cliente:", resumen[0]);
        }

        // Ordenamiento
        if (sortOrder !== "neutro") {
            resumen.sort((a, b) => {
                let valA, valB;
                switch (sortBy) {
                    case "nombre":
                        valA = a.nombre?.toLowerCase() || "";
                        valB = b.nombre?.toLowerCase() || "";
                        break;
                    case "ultimaVenta":
                        valA = a.ultimaVenta ? new Date(a.ultimaVenta).getTime() : 0;
                        valB = b.ultimaVenta ? new Date(b.ultimaVenta).getTime() : 0;
                        break;
                    case "totalDeuda":
                        valA = a.totalDeuda || 0;
                        valB = b.totalDeuda || 0;
                        break;
                    default:
                        valA = a.nombre?.toLowerCase() || "";
                        valB = b.nombre?.toLowerCase() || "";
                }
                if (valA < valB) return sortOrder === "asc" ? -1 : 1;
                if (valA > valB) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
            console.log(`Resumen ordenado por ${sortBy} (${sortOrder})`);
        }

        // Paginación
        const pageSize = 8;
        const total = resumen.length;
        const totalPages = Math.ceil(total / pageSize);
        const pagedResumen = resumen.slice((page - 1) * pageSize, page * pageSize);

        console.log("Paginación:", { page, pageSize, total, totalPages });
        console.log("Clientes en página actual:", pagedResumen.length);
        if (pagedResumen.length > 0) {
            console.log("Ejemplo cliente página:", pagedResumen[0]);
        }

        // Mostrar resultados parciales en pantalla (en la respuesta)
        return NextResponse.json({
            ok: true,
            clientes: pagedResumen,
            pagination: {
                page,
                pageSize,
                total,
                totalPages
            },
            debug: {
                query: { q, page, sortBy, sortOrder },
                periodoFecha,
                biDeudasCount: biDeudas.length,
                clienteIds,
                clientesCount: clientes.length,
                resumenCount: resumen.length,
                ejemploResumen: resumen[0] || null
            }
        });
    } catch (error) {
        console.error("Error en GET /cobros:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
