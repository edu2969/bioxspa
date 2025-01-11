import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Contract from "@/models/contract";

export async function POST(req, { params }) {
    const body = await req.json();
    await connectMongoDB();
    console.log("Updating contract...", params.id, body);
    const resp = await Contract.findByIdAndUpdate(params.id, body);
    return resp ? NextResponse.json(resp) : NextResponse.json(error.message, {
        status: 404,
    })
}

export async function GET(req, { params }) {
    console.log("getContratoById...", params);
    await connectMongoDB();
    const contrato = await Contract.find({ _id: params.id });
    return NextResponse.json(contrato.length ? { contract: contrato[0] } : ("Contrato " + params + " not found", {
        status: 400,
    }));
}
