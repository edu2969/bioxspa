import { connectMongoDB } from "@/lib/mongodb";
import DocumentoTributario from "@/models/documentoTributario";
import { NextResponse } from "next/server";

export async function GET(req) {
    console.log("GET request received");
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("Successfully connected to MongoDB");

        const { searchParams } = req.nextUrl;
        const venta = searchParams.get("venta") === "true";
        const compra = searchParams.get("compra") === "true";

        console.log("Fetching documentos tributarios...");
        const filter = {};
        if (venta) filter.venta = true;
        if (compra) filter.compra = true;

        const documentosTributarios = await DocumentoTributario.find(filter);
        console.log("Successfully fetched documentos tributarios");

        return NextResponse.json({ documentosTributarios });
    } catch {
        return NextResponse.json({ error: "Error fetching documentos tributarios" }, { status: 500 });
    }
}