import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import dayjs from "dayjs";

export async function GET(req) {
    console.log("Fetching top 10 monthly debtors by branch for the last 6 months...");
    const startTime = dayjs();

    try {
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });
        const authData = authResult.data;

        if (!authData) {
            return NextResponse.json({ ok: false, error: authResult.message || "Unauthorized" }, { status: 401 });
        }

        // Fecha límite para últimos 6 meses
        const sixMonthsAgo = dayjs().subtract(6, "months").format("YYYY-MM-DD");

        // Sucursales visibles
        const { data: branches, error: branchesError } = await supabase
            .from("sucursales")
            .select("id, nombre")
            .eq("visible", true);

        if (branchesError) {
            console.error("Error fetching branches:", branchesError);
            return NextResponse.json({
                message: "Error fetching top monthly debtors by branch",
                error: branchesError.message,
            }, { status: 500 });
        }

        const MainPanel = (branches || []).map(branch => ({
            nombre: branch.nombre,
            _id: branch.id,
            tipo: undefined,
            totalVentas: 0,
            deudaTotal: 0,
            m3Vendidos: 0,
            m2Envasados: 0,
            rentabilidad: 0,
            estado: 1,
            despachadosHoy: 0,
            despachadosMesAnterior: 0,
            despachadosMismoMesAnterior: 0,
            topDeudores: []
        }));

        // Obtener top 10 deudores mensuales por sucursal
        for (const panel of MainPanel) {
            const { data: topDebtors, error: debtorsError } = await supabase
                .from("bi_principal")
                .select(`
                    id,
                    sucursal_id,
                    cliente_id,
                    fecha,
                    periodo,
                    monto_adeudado,
                    monto_vendido,
                    monto_arrendado,
                    cliente:clientes(nombre, rut)
                `)
                .eq("sucursal_id", panel._id)
                .eq("periodo", "M")
                .gt("monto_adeudado", 0)
                .gte("fecha", sixMonthsAgo)
                .order("monto_adeudado", { ascending: false })
                .limit(10);

            if (debtorsError) {
                console.error(`Error fetching debtors for branch ${panel._id}:`, debtorsError);
                panel.topDeudores = [];
                continue;
            }

            panel.topDeudores = (topDebtors || []).map((debtor) => ({
                ...debtor,
                montoAdeudado: Number(debtor.monto_adeudado || 0),
                montoVendido: Number(debtor.monto_vendido || 0),
                montoArrendado: Number(debtor.monto_arrendado || 0),
                sucursal: panel.nombre,
            }));
        }

        const endTime = dayjs();
        console.log(
            `Top 10 monthly debtors by branch fetched successfully on ${endTime.format("DD/MM HH:mm")} in ${endTime.diff(startTime, "millisecond")}ms`
        );

        return NextResponse.json({
            branches: MainPanel,
        });
    } catch (error) {
        console.error("Error fetching top monthly debtors by branch:", error?.message || error);
        return NextResponse.json({
            message: "Error fetching top monthly debtors by branch",
            error: error?.message || "Unknown error",
        }, { status: 500 });
    }
}
