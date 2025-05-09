"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const biPrincipal_1 = __importDefault(require("@/models/biPrincipal"));
const constants_1 = require("@/app/utils/constants");
async function GET() {
    await (0, mongodb_1.connectMongoDB)();
    try {
        const sucursales = await sucursal_1.default.find({}, 'nombre _id tipoSucursal');
        const currentDate = new Date();
        const pastYearDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));
        const ventas = await biPrincipal_1.default.aggregate([
            {
                $match: {
                    fecha: { $gte: pastYearDate }
                }
            },
            {
                $group: {
                    _id: "$sucursalId",
                    totalVentas: { $sum: "$montoVendido" },
                    deudaTotal: { $sum: "$montoAdeudado" }
                }
            },
            {
                $project: {
                    totalVentas: 1,
                    deudaTotal: 1
                }
            }
        ]);
        const result = await Promise.all(sucursales.map(async (sucursal) => {
            const venta = ventas.find(v => v._id && v._id.equals(sucursal._id));
            const topDeudores = await biPrincipal_1.default.aggregate([
                {
                    $match: {
                        fecha: { $gte: pastYearDate },
                        sucursalId: sucursal._id
                    }
                },
                {
                    $group: {
                        _id: "$clienteId",
                        deuda: { $sum: "$montoAdeudado" }
                    }
                },
                {
                    $sort: { deuda: -1 }
                },
                {
                    $limit: 5
                },
                {
                    $lookup: {
                        from: "clientes",
                        localField: "_id",
                        foreignField: "_id",
                        as: "cliente"
                    }
                },
                {
                    $unwind: "$cliente"
                },
                {
                    $project: {
                        empresa: "$cliente.nombre",
                        deuda: 1,
                        rut: "$cliente.rut"
                    }
                }
            ]);
            return {
                nombre: sucursal.nombre,
                _id: sucursal._id,
                tipo: sucursal.tipoSucursal == "Sucursal" ? constants_1.TIPO_DEPENDENCIA.sucursal
                    : sucursal.tipoSucursal == "Bodega" ? constants_1.TIPO_DEPENDENCIA.bodega : constants_1.TIPO_DEPENDENCIA.ambas,
                totalVentas: venta ? venta.totalVentas : 0,
                deudaTotal: venta ? venta.deudaTotal : 0,
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
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
