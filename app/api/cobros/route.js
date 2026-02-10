import supabase from "@/lib/supabase";
import { NextResponse } from 'next/server';

// Configurar cliente de Supabase
export async function GET(request) {
    try {
        console.log("Conectando a Supabase...");
        // Obtener parámetros de consulta
        const { searchParams } = new URL(request.url);
        const q = parseInt(searchParams.get("q") ?? "0", 10); // 0: mes actual, 30: mes pasado, etc.
        const page = parseInt(searchParams.get("page") || "1", 10);
        const sortBy = searchParams.get("sortBy") || "nombre";
        const sortOrder = searchParams.get("sortOrder") || "asc";

        console.log("Query params:", { q, page, sortBy, sortOrder });

        // Validar q
        if (![0, 30, 60, 90].includes(q)) {
            console.warn("Parámetro 'q' inválido:", q);
            return NextResponse.json({ ok: false, error: "Invalid 'q' parameter" }, { status: 400 });
        }

        // Calcular periodoFecha
        const now = new Date();
        let targetMonth = now.getMonth() - (q / 30);
        let targetYear = now.getFullYear();
        while (targetMonth < 0) {
            targetMonth += 12;
            targetYear -= 1;
        }
        const periodoFecha = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);

        console.log("Periodo fecha calculada:", periodoFecha);

        // Consultar bi_deudas en Supabase
        const { data: biDeudas, error: biDeudasError } = q === 90 ? await supabase
            .from('bi_deudas')
            .select('id, cliente_id, ultima_venta_id, monto, fecha')
            .eq('periodo', 'M')
            .not('cliente_id', 'is', null) // Corrected to avoid invalid UUID error
            : await supabase
                .from('bi_deudas')
                .select('id, cliente_id, ultima_venta_id, monto, fecha')
                .lte('fecha', periodoFecha.toISOString())
                .not('cliente_id', 'is', null);

        if (biDeudasError) {
            console.error("Error al consultar bi_deudas:", biDeudasError);
            return NextResponse.json({ ok: false, error: biDeudasError.message }, { status: 500 });
        }        
        console.log("biDeudas encontradas:", biDeudas.length);

        // Obtener IDs únicos de clientes con deuda en el periodo
        const clienteIds = [...new Set(biDeudas.map(d => d.cliente_id))];
        console.log("IDs únicos de clientes con deuda:", clienteIds);

        // Consultar clientes en Supabase
        const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('id, nombre, credito, telefono, email')
            .in('id', clienteIds);

        if (clientesError) {
            console.error("Error al consultar clientes:", clientesError);
            return NextResponse.json({ ok: false, error: clientesError.message }, { status: 500 });
        }

        console.log("Clientes activos encontrados:", clientes.length);

        // Agrupar deudas por cliente
        const clientesConDeuda = clientes.map(cliente => {
            const deudasCliente = biDeudas.filter(d => d.cliente_id === cliente.id);
            const totalDeuda = deudasCliente.reduce((sum, d) => sum + d.monto, 0);
            return {
                ...cliente,
                totalDeuda,
                deudas: deudasCliente
            };
        });

        return NextResponse.json({ ok: true, clientes: clientesConDeuda });
    } catch (error) {
        console.error("Error en el endpoint:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
