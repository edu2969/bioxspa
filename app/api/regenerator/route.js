import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Xehiculo from "@/models/xehiculo";
import Vehiculo from "@/models/vehiculo";
import Trabajador from "@/models/trabajador";
import User from "@/models/user";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Starting migration of vehiculos...");
    await migrateVehiculos();
    console.log("Finished migration of vehiculos.");

    return NextResponse.json({ message: "Success migrate and improve" });
}

const migrateVehiculos = async () => {
    const trabajadores = await Trabajador.find();

    for (const trabajador of trabajadores) {
        const user = await User.findOne({ email: trabajador.email });

        if (user) {
            const xehiculo = await Xehiculo.findOne({ patente: trabajador.patente });

            const vehiculoData = {
                patente: trabajador.patente || `TEMP-${trabajador.id}`,
                marca: xehiculo?.marca || "Desconocida",
                modelo: xehiculo?.modelo || "Desconocido",
                empresaId: trabajador.datosempresas_id === "1" ? "67c5f5b529b5503c0db925c9" : "67c5f5b529b5503c0db925b9",
                revisionTecnica: xehiculo?.revisiontecnica || new Date(),
                choferIds: [user._id],
                nmotor: xehiculo?.nmotor || null,
                nchasis: xehiculo?.nchasis || null,
                ano: xehiculo?.ano || null,
                fechaVencimientoExtintor: xehiculo?.fecha_vencimiento_extintor || null,
            };

            const existingVehiculo = await Vehiculo.findOne({ patente: vehiculoData.patente });

            if (existingVehiculo) {
                if (!existingVehiculo.choferIds.includes(user._id)) {
                    existingVehiculo.choferIds.push(user._id);
                    await existingVehiculo.save();
                }
            } else {
                const newVehiculo = new Vehiculo(vehiculoData);
                await newVehiculo.save();
            }
        }
    }
}
