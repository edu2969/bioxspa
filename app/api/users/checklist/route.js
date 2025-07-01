import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Checklist from "@/models/checklist";
import mongoose from "mongoose";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM } from "@/app/utils/constants";

export async function GET() {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Buscar el último checklist del usuario
        const ahora = new Date();
        const lastChecklist = await Checklist.findOne({ 
            userId, //: new mongoose.Types.ObjectId(userId),
            tipo: TIPO_CHECKLIST.vehiculo,
            fecha: {
                $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), // Desde el inicio del día de hoy
            }
         });

        if (!lastChecklist) {
            return NextResponse.json({ ok: false });
        }
        
        return NextResponse.json({ ok: true, passed: lastChecklist.passed });
    } catch {
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectMongoDB();
        console.log("MongoDB connected");

        const session = await getServerSession(authOptions);
        console.log("Session:", session);

        if (!session || !session.user || !session.user.id) {
            console.log("Unauthorized access attempt");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.json();
        console.log("Request body:", body);

        const { tipo, vehiculoId, kilometraje } = body;
        let passed = true;
        let items = [];
        
        // Recorre las claves de TIPO_CHECKLIST_ITEM con valor < 128
        Object.entries(TIPO_CHECKLIST_ITEM)
        .filter(([, value]) => tipo === TIPO_CHECKLIST.vehiculo ? value < 128 : value >= 128)  
        .forEach(([key, value]) => {
            const itemValue = body[key];
            items.push({ tipo: TIPO_CHECKLIST_ITEM[key], valor: isNaN(itemValue) ? itemValue : (itemValue === true ? 1 : 0) });

            // Si el valor de la llave es impar y el valor recibido es 0 o false, passed = false
            if (value % 2 === 1 && (itemValue === 0 || itemValue === false)) {
                passed = false;
            }
        });

        console.log("Checklist to save:", {
            tipo,
            userId: new mongoose.Types.ObjectId(userId),
            vehiculoId: new mongoose.Types.ObjectId(vehiculoId),
            kilometraje,
            fecha: new Date(),
            passed,
            items,
        });

        // Crear un nuevo checklist
        const newChecklist = new Checklist({
            tipo,
            userId: new mongoose.Types.ObjectId(userId),
            vehiculoId: new mongoose.Types.ObjectId(vehiculoId),
            kilometraje,
            fecha: new Date(),
            passed,
            items,
        });

        await newChecklist.save();
        console.log("Checklist saved:", newChecklist);

        return NextResponse.json({ ok: true, passed, message: "Checklist saved successfully" });
    } catch (error) {
        console.error("Error saving checklist:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
