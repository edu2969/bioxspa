import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";

export async function GET(req) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const params = req.nextUrl.searchParams;
        const clienteId = params.get("id");
        console.log("CLIENTE getById...", clienteId);

        if (!clienteId) {
            return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
        }

        // Buscar el cliente por ID
        const { data: cliente, error: clienteError } = await supabase
            .from("clientes")
            .select("id, credito")
            .eq("id", clienteId)
            .single();

        if (clienteError || !cliente) {
            return NextResponse.json({ error: "Cliente not found" }, { status: 400 });
        }

        // Obtener deuda utilizada - suma de montos de bi_deudas para el cliente
        const { data: deudaData, error: deudaError } = await supabase
            .from("bi_deudas")
            .select("monto")
            .eq("cliente_id", clienteId);

        if (deudaError) {
            console.error("Error fetching debt data:", deudaError);
            return NextResponse.json({ error: "Error fetching debt data" }, { status: 500 });
        }

        // Calcular total utilizado
        const utilizado = deudaData?.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0) || 0;
        const autorizado = parseFloat(cliente.credito) || 0;

        return NextResponse.json({ autorizado, utilizado });
    } catch (error) {
        console.error("Error in creditos endpoint:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}