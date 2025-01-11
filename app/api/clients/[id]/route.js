import { connectMongoDB } from "@/lib/mongodb";
import Client from "@/models/client";
import { add } from "lodash";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    console.log("getClientById...", params);
    await connectMongoDB();
    const clients = await Client.find({ _id: params.id }, { password: 0, __v: 0 });
    return NextResponse.json(clients.length ? { client: clients[0] } : ("Client " + params + " not found", {
        status: 400,
    }));
}

export async function POST(req, { params }) {
    const body = await req.json();
    console.log("Update/Create Client...", body, params);
    const clientUpdated = await Client.findByIdAndUpdate(params.id, {
        name: body.name,
        completeName: body.completeName,
        identificationId: body.identificationId,
        identificationType: body.identificationType,
        email: body.email,
        address: body.address,
        imgLogo: body.imgLogo
    }, {
        new: true
    });
    return clientUpdated ? NextResponse.json(clientUpdated) : NextResponse.json(error.message, {
        status: 404,
    })
}