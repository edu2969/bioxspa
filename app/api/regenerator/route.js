import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    await resetVentas();
    console.log("resetVentas function executed successfully");
    
    return NextResponse.json({ message: "Success migrate and improve" });
}

const resetVentas = async () => {
    // Delete all RutaDespacho documents
    await RutaDespacho.deleteMany({});
    console.log("All RutaDespacho documents deleted");

    // Update all Venta documents to set estado to 0
    await Venta.updateMany({}, { estado: 0 });
    console.log("All Venta documents updated with estado set to 0");
};
