import { connectMongoDB } from "@/lib/mongodb";
import BiVentas from '../../../models/biVentas';
import Sucursal from '../../../models/sucursal';
import { NextResponse } from "next/server";

export async function GET(request) {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('id');

    if (!sucursalId) {
        return NextResponse.json({ error: "Sucursal ID is required" }, { status: 400 });
    }

    try {
        const sucursal = await Sucursal.findById(sucursalId, 'nombre _id');
        if (!sucursal) {
            return NextResponse.json({ error: "Sucursal not found" }, { status: 404 });
        }

        const currentDate = new Date();
        const pastYearDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));

        const ventas = await BiVentas.aggregate([
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

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}