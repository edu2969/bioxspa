import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Checklist from "@/models/checklist";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM } from "@/app/utils/constants";
import CheckList from "@/models/checklist";

export async function GET() {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log("Fetching checklists for user:", userId);

        const ahora = new Date();
        // Buscar ambos tipos de checklist del día actual
        const tiposChecklist = [TIPO_CHECKLIST.vehiculo, TIPO_CHECKLIST.personal];
        const checklists = await CheckList.find({
            userId,
            tipo: { $in: tiposChecklist },
            passed: true, // Solo checklists aprobados
            fecha: {
                $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), // Desde el inicio del día de hoy
            }
        }).select("tipo passed fecha").lean();

        // Formatear la salida como arreglo de objetos con tipo, aprobado y fecha
        const checklistResults = checklists.map(cl => ({
            tipo: cl.tipo,
            aprobado: !!cl.passed,
            fecha: cl.fecha
        }));
        return NextResponse.json({ ok: true, checklists: checklistResults });
    } catch (error) {
        console.error("Error fetching checklists:", error);
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

        // Crear un nuevo checklist
        const checklistPayload = {
            userId,
            tipo,
            vehiculoId: tipo === TIPO_CHECKLIST.vehiculo ? vehiculoId : null,
            kilometraje: tipo === TIPO_CHECKLIST.vehiculo ? kilometraje : null,
            passed,
            items,
            fecha: new Date(),
        };
        const newChecklist = new Checklist(checklistPayload);
        await newChecklist.save();
        console.log("Checklist saved:", newChecklist);

        return NextResponse.json({ ok: true, passed, message: "Checklist saved successfully" });
    } catch (error) {
        console.error("Error saving checklist:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
