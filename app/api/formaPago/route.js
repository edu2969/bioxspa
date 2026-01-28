import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { data: formasPago, error } = await supabase
            .from('formas_pago')
            .select('*')
            .eq('por_pagar', false);
        
        if (error) {
            console.error('Error fetching formas pago:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
        
        return NextResponse.json(formasPago);
    } catch (error) {
        console.error('Error in formaPago route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}