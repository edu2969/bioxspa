"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const biPrincipal_1 = __importDefault(require("@/models/biPrincipal"));
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const dayjs_1 = __importDefault(require("dayjs"));
async function GET() {
    console.log("Fetching top 10 monthly debtors by branch for the last 6 months...");
    const startTime = (0, dayjs_1.default)();
    await (0, mongodb_1.connectMongoDB)();
    try {
        // Calculate the date 6 months ago
        const sixMonthsAgo = (0, dayjs_1.default)().subtract(6, "months").toDate();
        // Fetch all visible branches from Sucursal
        const branches = await sucursal_1.default.find({ visible: true }).lean();
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
            const topDebtors = await biPrincipal_1.default.find({
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
        const endTime = (0, dayjs_1.default)();
        console.log(`Top 10 monthly debtors by branch fetched successfully on ${endTime.format("DD/MM HH:mm")} in ${endTime.diff(startTime, "millisecond")}ms`);
        return server_1.NextResponse.json({
            branches: MainPanel,
        });
    }
    catch (error) {
        console.error("Error fetching top monthly debtors by branch:", error.message);
        return server_1.NextResponse.json({
            message: "Error fetching top monthly debtors by branch",
            error: error.message,
        });
    }
}
