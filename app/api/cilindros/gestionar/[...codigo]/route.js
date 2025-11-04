import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Direccion from "@/models/direccion";
import Cliente from "@/models/cliente";
import Cargo from "@/models/cargo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { TIPO_CARGO } from "@/app/utils/constants";

const ROLES_PERMITIDOS = [
    TIPO_CARGO.encargado,
    TIPO_CARGO.cobranza,
    TIPO_CARGO.responsable,
    TIPO_CARGO.despacho,
    TIPO_CARGO.conductor,
    TIPO_CARGO.gerente
];

async function verificarAutorizacion() {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
        return { authorized: false, error: "Unauthorized" };
    }

    const cargo = await Cargo.findOne({
        userId: session.user.id,
        tipo: { $in: ROLES_PERMITIDOS }
    }).lean();

    if (!cargo) {
        return { authorized: false, error: "Cargo not found or insufficient permissions" };
    }

    return { authorized: true, userId: session.user.id };
}

export async function GET(request, { params }) {
    await connectMongoDB();

    const { codigo } = params;

    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.Cliente) {
        mongoose.model("Cliente", Cliente.schema);
    }

    const auth = await verificarAutorizacion();
    if (!auth.authorized) {
        return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    if (!codigo || !codigo[0]) {
        return NextResponse.json({ ok: false, error: "Missing codigo parameter" }, { status: 400 });
    }

    try {
        const item = await ItemCatalogo.findOne({ codigo: codigo[0] })
            .populate({
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo"
                }
            })
            .populate({
                path: "direccionId",
                model: "Direccion"
            })
            .populate({
                path: "ownerId",
                model: "Cliente"
            })
            .lean();

        if (!item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, item });
    } catch (error) {
        console.error("Error fetching item:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}