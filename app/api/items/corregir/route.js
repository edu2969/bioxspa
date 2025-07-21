import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";
import Direccion from "@/models/direccion";
import ItemCatalogo from "@/models/itemCatalogo";

export async function POST(request) {
    try {
        await connectMongoDB();

        const { id, estado, reubicar } = await request.json();

        if (!id || !estado) {
            return NextResponse.json({ ok: false, error: "id, estado are required" }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Find user's current cargo (active)
        const cargo = await Cargo.findOne({
            userId: userId,
            hasta: null
        }).populate({
            path: 'dependenciaId',
            model: Dependencia,
            select: '_id nombre direccionId',
            populate: {
                path: 'direccionId',
                model: Direccion,
                select: '_id nombre'
            }
        });

        if (!cargo || !cargo.dependenciaId || !cargo.dependenciaId.direccionId) {
            return NextResponse.json({ ok: false, error: "User does not have a valid cargo or dependencia" }, { status: 403 });
        }

        // Prepare update object
        const update = { estado };
        if (reubicar) {
            update.direccionId = cargo.dependenciaId.direccionId._id;
        }

        const item = await ItemCatalogo.findByIdAndUpdate(
            id,
            update,
            { new: true }
        ).populate({
            path: 'direccionId',
            model: Direccion,
            select: '_id nombre'
        });

        if (!item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, item });
    } catch (error) {
        console.error("Error in POST /api/items/corregir:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}