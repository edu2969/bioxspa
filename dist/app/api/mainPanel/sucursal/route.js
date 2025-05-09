"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const biPrincipal_1 = __importDefault(require("@/models/biPrincipal"));
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const server_1 = require("next/server");
async function GET(request) {
    await (0, mongodb_1.connectMongoDB)();
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('id');
    if (!sucursalId) {
        return server_1.NextResponse.json({ error: "Sucursal ID is required" }, { status: 400 });
    }
    try {
        const sucursal = await sucursal_1.default.findById(sucursalId, 'nombre _id');
        if (!sucursal) {
            return server_1.NextResponse.json({ error: "Sucursal not found" }, { status: 404 });
        }
        const currentDate = new Date();
        const pastYearDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));
        const ventas = await biPrincipal_1.default.aggregate([
            {
                $match: {
                    sucursalId: sucursal._id,
                    fecha: { $gte: pastYearDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$fecha" },
                        month: { $month: "$fecha" }
                    },
                    totalVentas: { $sum: "$monto" }
                }
            },
            {
                $project: {
                    date: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    totalVentas: 1
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);
        const result = {
            ventasMensuales: ventas
        };
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
