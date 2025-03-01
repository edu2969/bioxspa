import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Comision from "@/models/comision";

// filepath: /d:/git/bioxspa/app/api/comisiones/route.js

export async function GET() {
    await connectMongoDB();
    const users = await User.find().lean();
    const comisiones = await Comision.find().lean();

    const usersWithComision = users.map(user => {
        const comision = comisiones.find(c => c.userId.toString() === user._id.toString());
        return { ...user, comision };
    });

    return NextResponse.json(usersWithComision);
}

export async function POST(req) {
    const body = await req.json();
    await connectMongoDB();

    const comisionData = {
        userId: body.userId,
        fechaDesde: body.fechaDesde ? new Date(body.fechaDesde) : new Date("2021-01-01"),
        fechaHasta: body.fechaHasta ? new Date(body.fechaHasta) : null,
        comisionGeneral: body.comisionGeneral || 0,
        comisionRetiro: body.comisionRetiro || 0,
        comisionEntrega: body.comisionEntrega || 0,
        comisionPtoVta: body.comisionPtoVta || 0,
    };

    const comisionUpdated = await Comision.findOneAndUpdate(
        { userId: body.userId },
        comisionData,
        { new: true, upsert: true }
    );

    if (!comisionUpdated) {
        return NextResponse.json({ error: "Error updating comision" }, { status: 404 });
    }

    return NextResponse.json(comisionUpdated);
}