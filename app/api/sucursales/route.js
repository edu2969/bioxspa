import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET all sucursales
export async function GET() {
    try {
        const { data: sucursales, error } = await supabase
            .from('sucursales')
            .select('*')
            .eq('visible', true)
            .order('prioridad', { ascending: true });
            
        if (error) {
            console.error('Error fetching sucursales:', error);
            return NextResponse.json({ error: "Error fetching sucursales" }, { status: 500 });
        }
        
        return NextResponse.json({ sucursales });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}