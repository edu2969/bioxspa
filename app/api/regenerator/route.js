import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    //await remigrateDireccionesDespacho();
    //console.log("Remigrated direccionesDespacho...");

    await cleanVentas();
    console.log("Cleaned ventas, detalles de venta and rutas de despacho...");
 
    return NextResponse.json({ message: "Success migrate and improve" });
}


const cleanVentas = async () => {
    // Borra todas las rutas de despacho
    await RutaDespacho.deleteMany({});
    // Borra todos los detalles de venta
    await DetalleVenta.deleteMany({});
    // Borra todas las ventas
    await Venta.deleteMany({});
}