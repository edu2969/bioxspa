import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Xehiculo from "@/models/xehiculo";
import Vehiculo from "@/models/vehiculo";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Starting migration of Xehiculos...");
    await migrateXehiculos();
    console.log("Finished migration of Xehiculos.");

    return NextResponse.json({ message: "Success migrate and improve" });
}

const migrateXehiculos = async () => {
    const xehiculos = await Xehiculo.find();

    for (const xehiculo of xehiculos) {
        await Vehiculo.create({
            temporalId: xehiculo.id,
            patente: xehiculo.patente,
            marca: xehiculo.marca,
            modelo: xehiculo.modelo,
            nmotor: xehiculo.nmotor,
            numeroChasis: xehiculo.nchasis,
            ano: xehiculo.ano,
            empresaId: xehiculo.datosempresas_id,
            revisionTecnica: xehiculo.revisiontecnica,
            fechaVencimientoExtintor: xehiculo.fecha_vencimiento_extintor,
            direccionDestinoId: null, 
            posicionActual: {
                latitud: null, 
                longitud: null 
            }
        });
    }
}