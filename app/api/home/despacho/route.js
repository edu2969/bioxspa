import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants"; 
import { authOptions } from "@/app/utils/authOptions";
import { getServerSession } from "next-auth";
import Cargo from "@/models/cargo";
import Venta from "@/models/venta";

export async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await connectMongoDB();
        const userId = session.user.id;

        // Find the user's cargo
        const userCargo = await Cargo.findOne({ 
            userId, 
            tipo: TIPO_CARGO.despacho 
        });

        if (!userCargo) {
            console.warn("User does not have a despacho cargo.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
        }

        console.log("User cargo found:", userCargo);

        // Find all chofer cargos in the same dependencia
        const choferCargos = await Cargo.find({ 
            dependenciaId: userCargo.dependenciaId, 
            tipo: TIPO_CARGO.conductor 
        });

        const choferIds = choferCargos.map(cargo => cargo.userId);

        console.log("Chofer IDs found:", choferIds);

        // Find ventas in estado 'preparacion' for choferes in the dependencia
        const ventas = await Venta.find({ 
            estado: TIPO_ESTADO_VENTA.preparacion 
        });

        const ventaIds = ventas.map(venta => venta._id);

        // Count rutasDespacho where the ventas are present
        const cantidadRutas = await RutaDespacho.countDocuments({ 
            ventaIds: { $in: ventaIds },
            choferId: { $in: choferIds }
        });

        return NextResponse.json({ ok: true, cantidadRutas });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}