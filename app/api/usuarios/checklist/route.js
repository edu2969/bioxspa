import { getSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM } from "@/app/utils/constants";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(req) {
    const supabase = await getSupabaseServerClient();
    const authResult = await getAuthenticatedUser({ requireAuth: true });
    const authData = authResult.data;

    if (!authData) {
        return NextResponse.json({ ok: false, error: authResult.message || "Unauthorized" }, { status: 401 });
    }

    const userId = authData.userData.id;
    const ahora = new Date();
    const tiposChecklist = [];

    const hasCargoConductor = authData.hasCargo(["conductor"]);
    const hasCargoChecklistPersonal = authData.hasCargo(["conductor", "encargado", "responsable", "despacho"]);

    if (hasCargoChecklistPersonal) {
        tiposChecklist.push(TIPO_CHECKLIST.personal);
    }

    if (hasCargoConductor) {
        tiposChecklist.push(TIPO_CHECKLIST.vehiculo);        
    }

    if (tiposChecklist.length === 0) {
        return NextResponse.json({ ok: true, passed: true, checklists: [] });
    }

    const startOfDay = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    const { data: checklists, error: checklistError } = await supabase
        .from('checklists')
        .select('tipo, passed, created_at')
        .eq('usuario_id', userId)
        .in('tipo', tiposChecklist)
        .eq('passed', true)
        .gte('created_at', startOfDay.toISOString());

    if (checklistError) {
        return NextResponse.json({ ok: false, error: "Error fetching checklists" }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        passed: checklists.filter(c => c.passed).length === tiposChecklist.length,
        checklists
    });
}

export async function POST(req) {
    try {
        console.log("Processing checklist submission");

        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser({ requireAuth: true });
        const authData = authResult.data;

        if (!authData) {
            return NextResponse.json({ ok: false, error: authResult.message || "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const tipo = body.tipo;
        const vehiculoId = body.vehiculoId;
        const kilometraje = body.kilometraje;
        const items = [];
        let passed = true;

        if(tipo === 'vehiculo' && (!vehiculoId || !kilometraje)) {
            return NextResponse.json({ ok: false, error: "vehiculoId and kilometraje are required for vehiculo checklists" }, { status: 400 });
        }       

        // Modo legacy: procesar como antes
        Object.entries(TIPO_CHECKLIST_ITEM)
            .filter(([, value]) => tipo === 'vehiculo' ? value < 128 : value >= 128)
            .forEach(([key, value]) => {
                // Buscar el valor real del item en el array recibido
                const found = body.items.find((item) => String(item.tipo) === String(key));
                const itemValue = found?.valor;
                items.push({
                    tipo: TIPO_CHECKLIST_ITEM[key], // Guardar como número
                    valor: itemValue
                });
                if (value % 2 === 1 && (itemValue === 0 || itemValue === false)) {
                    passed = false;
                }
            });

        // Crear un nuevo checklist en Supabase
        const checklistPayload = {
            usuario_id: authData.userData.id,
            tipo: tipo === 'personal' ? TIPO_CHECKLIST.personal : TIPO_CHECKLIST.vehiculo,
            vehiculo_id: tipo === 'vehiculo' ? vehiculoId : null,
            kilometraje: tipo === 'vehiculo' ? kilometraje : null,
            passed,
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('checklists')
            .insert(checklistPayload)
            .select()
            .single();

        if (error) {
            console.error("Error inserting checklist:", error);
            throw error;
        }

        return NextResponse.json({
            ok: true,
            passed,
            message: "Checklist saved successfully"
        });
    } catch (error) {
        console.error("Error saving checklist:", error);
        return NextResponse.json(
            { ok: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
