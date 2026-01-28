import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { TIPO_CHECKLIST, TIPO_CHECKLIST_ITEM, TIPO_CARGO } from "@/app/utils/constants";
import { IItemChecklist } from "@/types/checklist";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(req: NextRequest) {    
        const { user, userData } = await getAuthenticatedUser();
        
        const userTipoCargo = userData.role;
        const userId = user.id;
        const ahora = new Date();
        const tiposChecklist = [];

        if ([TIPO_CARGO.conductor, TIPO_CARGO.encargado, TIPO_CARGO.responsable, TIPO_CARGO.despacho].includes(userTipoCargo)) {
            tiposChecklist.push(TIPO_CHECKLIST.personal);
        }

        if (userTipoCargo === TIPO_CARGO.conductor) {
            tiposChecklist.push(TIPO_CHECKLIST.vehiculo);
        }

        if (tiposChecklist.length === 0) {
            return NextResponse.json({ ok: true, passed: true, checklists: [] });
        }

        const startOfDay = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        const { data: checklists, error: checklistError } = await supabase
            .from('checklists')
            .select('tipo, passed, fecha')
            .eq('usuario_id', userId)
            .in('tipo', tiposChecklist)
            .eq('passed', true)
            .gte('fecha', startOfDay.toISOString());

        if (checklistError) {
            return NextResponse.json({ ok: false, error: "Error fetching checklists" }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            passed: checklists.length > 0,
            checklists
        });
}

export async function POST(req: NextRequest) {
    try {
        console.log("Processing checklist submission");

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, tipo_cargo')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

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

        // Crear un nuevo checklist en Supabase
        const checklistPayload = {
            usuario_id: userId,
            tipo: tipo === 'personal' ? TIPO_CHECKLIST.personal : TIPO_CHECKLIST.vehiculo,
            vehiculo_id: tipo === 'vehiculo' ? vehiculoId : null,
            kilometraje: tipo === 'vehiculo' ? kilometraje : null,
            passed,
            items,
            fecha: new Date().toISOString(),
        };

        console.log("Checklist payload:", checklistPayload);

        const { data, error } = await supabase
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
