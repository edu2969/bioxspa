import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Xser from "@/models/xser";
import User from "@/models/user";
import Comision from "@/models/comision";

export async function GET(req) {
    await connectMongoDB();

    const xserUsers = await Xser.find().lean();
    const users = await User.find().lean();

    const comisionesToInsert = [];

    for (const xserUser of xserUsers) {
        console.log("PROCESAN xserUser", xserUser.email, xserUser.comision, xserUser.comi_retiro, xserUser.comi_entrega, xserUser.comi_punto_vta);
        const user = users.find(u => u.email === xserUser.email);
        if (user) {
            const comisionGeneral = parseFloat(xserUser.comision || "0");
            const comisionRetiro = parseFloat(xserUser.comi_retiro || "0");
            const comisionEntrega = parseFloat(xserUser.comi_entrega || "0");
            const comisionPtoVta = parseFloat(xserUser.comi_punto_vta || "0");

            if (comisionGeneral === 0 && comisionRetiro === 0 && comisionEntrega === 0 && comisionPtoVta === 0) {
                continue; // Omitir si todos los valores de comisiones son "cero"
            }

            const comisionData = {
                userId: user._id,
                fechaDesde: new Date("2021-01-01"),
                fechaHasta: null,
                comisionGeneral,
                comisionRetiro,
                comisionEntrega,
                comisionPtoVta,
            };

            console.log("Creating Comision with data:", user.name, comisionData);

            comisionesToInsert.push(comisionData);
        }
    }

    console.log("Comisiones to insert:", comisionesToInsert);

    await Comision.insertMany(comisionesToInsert);

    return NextResponse.json({ message: "Comisiones creadas exitosamente" });
}