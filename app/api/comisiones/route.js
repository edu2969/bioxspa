import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Comision from "@/models/comision";
import { USER_ROLE } from "@/app/utils/constants";
import Cliente from "@/models/cliente";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching users...");
    const users = await User.find({ role: { $ne: USER_ROLE.neo }}).lean();
    console.log(`Fetched ${users.length} users`);

    console.log("Mapping users with comision...");
    const usersWithComision = await Promise.all(users.map(async user => {
        const now = new Date();
        const comisiones = await Comision.find({
            userId: user._id,
            $or: [
                { fechaHasta: null },
                { fechaHasta: { $gte: now } }
            ],
        }).lean();
        const comisionesWithCliente = await Promise.all(comisiones.map(async comision => {
            if (comision.clienteId) {
                comision.cliente = await Cliente.findOne({ _id: comision.clienteId }).lean();
            }
            return comision;
        }));
        return { ...user, comisiones: comisionesWithCliente };
    }));

    console.log("Returning users with comision");
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