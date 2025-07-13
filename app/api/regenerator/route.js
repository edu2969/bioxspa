import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    return NextResponse.json({ message: "Success migrate and improve" });
}


