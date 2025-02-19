import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Sucursal from '../../../models/sucursal';
import BiPrincipal from "../../../models/biPrincipal";
import { TIPO_SUCURSAL } from "@/app/utils/constants";

export async function GET() {
    await connectMongoDB();

    try {
        const sucursales = await Sucursal.find({}, 'nombre _id tipoSucursal');
        const currentDate = new Date();
        const pastYearDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));

        const ventas = await BiPrincipal.aggregate([
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

        const result = await Promise.all(sucursales.map(async sucursal => {
            const venta = ventas.find(v => v._id && v._id.equals(sucursal._id));

            const topDeudores = await BiPrincipal.aggregate([
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
                tipo: sucursal.tipoSucursal == "Sucursal" ? TIPO_SUCURSAL.sucursal
                    : sucursal.tipoSucursal == "Bodega" ? TIPO_SUCURSAL.bodega : TIPO_SUCURSAL.ambas,
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

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
