import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import FormaPago from "@/models/formaPago";

export async function GET() {
    await connectMongoDB();
    const formasPago = await FormaPago.find({
        porPagar: false
    });
    return NextResponse.json(formasPago);
}