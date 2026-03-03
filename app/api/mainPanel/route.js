import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { TIPO_DEPENDENCIA } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET() {
    try {
        const { user } = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Obtener todas las sucursales
        const { data: sucursales, error: sucursalesError } = await supabase
            .from("sucursales")
            .select(`
                id,
                nombre,
                dependencia:dependencias(tipo)
            `)
            .eq("visible", true);

        if (sucursalesError) {
            console.error("Error fetching sucursales:", sucursalesError);
            return NextResponse.json({ error: sucursalesError.message }, { status: 500 });
        }

        // Calcular fecha de hace un año
        const currentDate = new Date();
        const pastYearDate = new Date();
        pastYearDate.setFullYear(currentDate.getFullYear() - 1);

        // Obtener datos agregados de BI del último año
        const { data: ventasData, error: ventasError } = await supabase
            .from("bi_principal")
            .select("sucursal_id, monto_vendido, monto_adeudado")
            .gte("fecha", pastYearDate.toISOString().split('T')[0]);

        if (ventasError) {
            console.error("Error fetching ventas data:", ventasError);
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        // Agrupar datos por sucursal_id
        const ventasAgrupadas = {};
        ventasData.forEach(venta => {
            const sucursalId = venta.sucursal_id;
            if (!ventasAgrupadas[sucursalId]) {
                ventasAgrupadas[sucursalId] = {
                    totalVentas: 0,
                    deudaTotal: 0
                };
            }
            ventasAgrupadas[sucursalId].totalVentas += venta.monto_vendido || 0;
            ventasAgrupadas[sucursalId].deudaTotal += venta.monto_adeudado || 0;
        });

        const result = await Promise.all(sucursales.map(async sucursal => {
            const venta = ventasAgrupadas[sucursal.id] || { totalVentas: 0, deudaTotal: 0 };

            // Obtener top 5 deudores para esta sucursal
            const { data: topDeudoresData, error: deudoresError } = await supabase
                .from("bi_principal")
                .select(`
                    cliente_id,
                    monto_adeudado,
                    cliente:clientes(
                        nombre,
                        rut
                    )
                `)
                .eq("sucursal_id", sucursal.id)
                .gte("fecha", pastYearDate.toISOString().split('T')[0]);

            if (deudoresError) {
                console.error(`Error fetching deudores for sucursal ${sucursal.id}:`, deudoresError);
            }

            // Agrupar y ordenar deudores
            const deudoresPorCliente = {};
            (topDeudoresData || []).forEach(item => {
                const clienteId = item.cliente_id;
                if (!deudoresPorCliente[clienteId]) {
                    deudoresPorCliente[clienteId] = {
                        empresa: item.cliente?.nombre || '',
                        rut: item.cliente?.rut || '',
                        deuda: 0
                    };
                }
                deudoresPorCliente[clienteId].deuda += item.monto_adeudado || 0;
            });

            const topDeudores = Object.values(deudoresPorCliente)
                .sort((a, b) => b.deuda - a.deuda)
                .slice(0, 5);

            // Determinar tipo de dependencia
            let tipo = TIPO_DEPENDENCIA.sucursal;
            if (sucursal.dependencia) {
                const tipoDependencia = sucursal.dependencia.tipo;
                if (tipoDependencia === 10) {
                    tipo = TIPO_DEPENDENCIA.bodega;
                } else if (tipoDependencia === 11) {
                    tipo = TIPO_DEPENDENCIA.ambas;
                } else {
                    tipo = TIPO_DEPENDENCIA.sucursal;
                }
            }

            return {
                nombre: sucursal.nombre,
                _id: sucursal.id,
                tipo: tipo,
                totalVentas: venta.totalVentas,
                deudaTotal: venta.deudaTotal,
                m3Vendidos: 0,
                m2Envasados: 0,
                rentabilidad: 0,
                estado: 1,
                despachadosHoy: 0,
                despachadosMesAnterior: 0,
                despachadosMismoMesAnterior: 0,
                topDeudores: topDeudores
            };
        }));

        console.log("MainPanel", result);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Error in mainPanel endpoint:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
