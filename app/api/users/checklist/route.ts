import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Checklist from "@/models/checklist";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM, USER_ROLE } from "@/app/utils/constants";
import CheckList from "@/models/checklist";
import { IChecklist, IItemChecklist } from "@/types/checklist";
import { IChecklistlistResult } from "./types";
import { NextRequest } from "next/server";

export async function GET() {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
        }

        const userId = session.user.id;
        console.log("Fetching checklists for user:", userId);

        const ahora = new Date();
        // Buscar ambos tipos de checklist del día actual
        const tiposChecklist = [];

        const role = session.user.role;
        if (role === USER_ROLE.conductor || role === USER_ROLE.encargado
            || role === USER_ROLE.responsable || role === USER_ROLE.despacho) {
            tiposChecklist.push(TIPO_CHECKLIST.personal);
        } 

        if (role === USER_ROLE.conductor) {
            tiposChecklist.push(TIPO_CHECKLIST.vehiculo);
        }

        if (tiposChecklist.length === 0) {
            return new Response(JSON.stringify({ ok: true, passed: true, checklists: [] }));
        }
        
        const checklists = await CheckList.find({
            userId,
            tipo: { $in: tiposChecklist },
            passed: true, // Solo checklists aprobados
            fecha: {
                $gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), // Desde el inicio del día de hoy
            }
        }).select("tipo passed fecha").lean();

        return new Response(JSON.stringify({ 
            ok: true, 
            passed: checklists.length === tiposChecklist.length
        }));
    } catch (error) {
        console.error("Error fetching checklists:", error);
        return new Response(JSON.stringify({ ok: false, error: "Internal Server Error" }), { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectMongoDB();
        console.log("MongoDB connected");

        const session = await getServerSession(authOptions);
        console.log("Session:", session);

        if (!session || !session.user || !session.user.id) {
            console.log("Unauthorized access attempt");
            return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.json();
        console.log("Request body:", body);

        // Adaptar para aceptar formato con result y answers
        const tipo = body.tipo;
        const vehiculoId = body.vehiculoId;
        const kilometraje = body.kilometraje;
        const items: IItemChecklist[] = [];
        let passed = true;


        // Modo legacy: procesar como antes
        Object.entries(TIPO_CHECKLIST_ITEM)
            .filter(([, value]) => tipo === 'vehiculo' ? value < 128 : value >= 128)
            .forEach(([key, value]) => {
                // Buscar el valor real del item en el array recibido
                const found = body.items.find((item: IItemChecklist) => String(item.tipo) === String(key));
                const itemValue = found?.valor;
                items.push({
                    tipo: TIPO_CHECKLIST_ITEM[key as keyof typeof TIPO_CHECKLIST_ITEM], // Guardar como número
                    valor: itemValue
                });
                if (value % 2 === 1 && (itemValue === 0 || itemValue === false)) {
                    passed = false;
                }
            });

        // Crear un nuevo checklist
        const checklistPayload: IChecklist = {
            userId,
            tipo: tipo === 'personal' ? TIPO_CHECKLIST.personal : TIPO_CHECKLIST.vehiculo,
            vehiculoId: tipo === 'vehiculo' ? vehiculoId : null,
            kilometraje: tipo === 'vehiculo' ? kilometraje : null,
            passed,
            items,
            fecha: new Date(),
        };

        console.log("Checklist payload:", checklistPayload);

        const newChecklist = new Checklist(checklistPayload);
        await newChecklist.save();

        return new Response(JSON.stringify({ ok: true, passed, message: "Checklist saved successfully" }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Error saving checklist:", error);
        return new Response(JSON.stringify({ ok: false, error: "Internal Server Error" }), { status: 500 });
    }
}
