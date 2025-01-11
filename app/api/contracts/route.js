import { connectMongoDB } from "@/lib/mongodb";
import Contract from "@/models/contract";
import Client from "@/models/client";
import { NextResponse } from "next/server";

export async function GET() {
    console.log("getContracts...");
    await connectMongoDB();
    const contracts = await Contract.find();

    const decoratedContracts = await Promise.all(contracts.map(async (c) => {
        const cliente = await Client.findById(c.clientId);
        return {
            _id: c._id,
            clientImg: cliente.imgLogo,
            clientName: cliente.name,
            identifier: c.identifier,
            title: c.title,
            status: c.status,
            currency: c.currency,
            netAmount: c.netAmount,
            rentability: 0,
            termsOfPayment: c.termsOfPayment,
        };
    }));

    return NextResponse.json({ contracts: decoratedContracts });
}

export async function POST(req) {
    const body = await req.json();
    console.log("Create Contract...", body);    
    const contract = new Contract(body);    
    const contractCount = await Contract.countDocuments();
    contract.identifier = contractCount + 1;
    contract.createdAt = new Date();
    await contract.save();
    return NextResponse.json(contract);
}
