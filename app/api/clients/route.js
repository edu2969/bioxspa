import { connectMongoDB } from "@/lib/mongodb";
import Client from "@/models/client";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        console.log("getAll Clients...");
        await connectMongoDB();
        const clients = await Client.find();        
        return NextResponse.json({ clients: clients.map(c => {
            return {
                id: c._id.valueOf(),
                name: c.name,
                email: c.email,
                imgLogo: c.imgLogo,               
            }
        }) });
    } catch (error) {
        console.log(error);
    }
}

export async function POST(req) {
    try {
        await connectMongoDB();
        const params = await req.json();
        console.log("Client POST", params);
        const res = await Client.create(params);
        return NextResponse.json({            
            clientId: res._id.valueOf()
        });
    } catch (error) {
        console.log("ERROR!", error);
        return NextResponse.json(error.message, {
            status: 404,
        })
    }
}