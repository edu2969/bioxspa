import { connectMongoDB } from "@/lib/mongodb";
import Sucursal from "@/models/sucursal";
import { NextResponse } from "next/server";

// GET all sucursales
export async function GET() {
    try {
        await connectMongoDB();
        const sucursales = await Sucursal.find({ visible: true }).sort({ prioridad: 1 });
        return NextResponse.json({ sucursales });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}