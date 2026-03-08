import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();

        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get('id');

        if (!sucursalId) {
            return NextResponse.json({ error: "Sucursal ID is required" }, { status: 400 });
        }

        // Verificar que la sucursal existe
        const { data: sucursal, error: sucursalError } = await supabase
            .from("sucursales")
            .select("id, nombre")
            .eq("id", sucursalId)
            .single();

        if (sucursalError || !sucursal) {
            return NextResponse.json({ error: "Sucursal not found" }, { status: 404 });
        }

        // Calcular fecha de hace un año
        const currentDate = new Date();
        const pastYearDate = new Date();
        pastYearDate.setFullYear(currentDate.getFullYear() - 1);

        // Obtener datos de BI del último año para esta sucursal
        const { data: ventasData, error: ventasError } = await supabase
            .from("bi_principal")
            .select("fecha, monto_vendido")
            .eq("sucursal_id", sucursalId)
            .gte("fecha", pastYearDate.toISOString().split('T')[0])
            .order("fecha", { ascending: true });

        if (ventasError) {
            console.error("Error fetching ventas data:", ventasError);
            return NextResponse.json({ error: ventasError.message }, { status: 500 });
        }

        // Agrupar datos por año y mes
        const ventasByMonth = {};
        (ventasData || []).forEach(venta => {
            const fecha = new Date(venta.fecha);
            const year = fecha.getFullYear();
            const month = fecha.getMonth() + 1; // JavaScript months are 0-indexed
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            
            if (!ventasByMonth[key]) {
                ventasByMonth[key] = {
                    date: new Date(year, month - 1, 1),
                    totalVentas: 0
                };
            }
            
            ventasByMonth[key].totalVentas += venta.monto_vendido || 0;
        });

        // Convertir a array y ordenar por fecha
        const ventas = Object.values(ventasByMonth)
            .sort((a, b) => a.date - b.date);

        const result = {
            ventasMensuales: ventas
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error("Error in mainPanel sucursal endpoint:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}