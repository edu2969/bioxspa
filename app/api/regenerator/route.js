import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
/*import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";*/

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    /*console.log("Starting migration...");
    await resetVentas();
    console.log("Migration completed successfully");*/

    return NextResponse.json({ message: "Success migrate and improve" });
}

/*const resetVentas = async () => {
    const ventas = await Venta.find({});
    for (const venta of ventas) {
        venta.estado = 14; // TIPO_ESTADO_VENTA.preparacion

        // Buscar rutas de despacho asociadas a la venta
        const rutas = await RutaDespacho.find({ ventaIds: venta._id });
        for (const ruta of rutas) {
            // Eliminar del historialCarga los registros donde esCarga: false
            ruta.historialCarga = ruta.historialCarga.filter(h => h.esCarga);
            ruta.ruta = []; // Limpiar la ruta

            // Cambiar estado a orden_confirmada
            ruta.estado = TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada;

            if (Array.isArray(ruta.historialEstado) && ruta.historialEstado.length > 3) {
                ruta.historialEstado = ruta.historialEstado.slice(0, 3);
            }
            ruta.historialEstado[0].fechaArribo = null;
            await ruta.save();
        }

        await venta.save();
    }
}*/

