import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import BiPrincipal from "@/models/biPrincipal";
import Sucursal from "@/models/sucursal";
import dayjs from "dayjs";

export async function GET(req) {
    console.log("Fetching top 10 monthly debtors by branch for the last 6 months...");
    const startTime = dayjs();
    await connectMongoDB();

    try {
        // Calculate the date 6 months ago
        const sixMonthsAgo = dayjs().subtract(6, "months").toDate();

        // Fetch all visible branches from Sucursal
        const branches = await Sucursal.find({ visible: true }).lean();

        // Initialize the MainPanel structure
        const MainPanel = branches.map(branch => ({
            nombre: branch.nombre,
            _id: branch._id,
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

        // Populate data for each branch
        for (const panel of MainPanel) {
            // Fetch top 10 debtors for the branch
            const topDebtors = await BiPrincipal.find({
                sucursal: panel.nombre,
                montoAdeudado: { $gt: 0 },
                periodo: "M",
                fecha: { $gte: sixMonthsAgo }
            })
                .sort({ montoAdeudado: -1 })
                .limit(10)
                .lean();

            // Assign top debtors to the branch
            panel.topDeudores = topDebtors;
        }

        const endTime = dayjs();
        console.log(
            `Top 10 monthly debtors by branch fetched successfully on ${endTime.format("DD/MM HH:mm")} in ${endTime.diff(startTime, "millisecond")}ms`
        );

        return NextResponse.json({
            branches: MainPanel,
        });
    } catch (error) {
        console.error("Error fetching top monthly debtors by branch:", error.message);
        return NextResponse.json({
            message: "Error fetching top monthly debtors by branch",
            error: error.message,
        });
    }
}
