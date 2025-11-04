import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ItemCatalogo from "@/models/itemCatalogo";
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

export async function POST(request) {
    await connectMongoDB();

    const auth = await verificarAutorizacion();
    if (!auth.authorized) {
        return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { itemId, ...updateData } = body;

        if (!itemId) {
            return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 });
        }

        // Campos permitidos para actualizar
        const camposPermitidos = [
            'codigo',
            'estado',
            'nombre',
            'descripcion',
            'descripcionCorta',
            'fichaTecnica',
            'urlFichaTecnica',
            'urlImagen',
            'garantiaAnual',
            'destacado',
            'stockMinimo',
            'stockActual',
            'visible',
            'url',
            'fechaMantencion'
        ];

        const datosActualizacion = {};
        for (const campo of camposPermitidos) {
            if (updateData.hasOwnProperty(campo)) {
                datosActualizacion[campo] = updateData[campo];
            }
        }

        if (Object.keys(datosActualizacion).length === 0) {
            return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
        }

        const itemActualizado = await ItemCatalogo.findByIdAndUpdate(
            itemId,
            datosActualizacion,
            { new: true, runValidators: true }
        ).lean();

        if (!itemActualizado) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json({ 
            ok: true, 
            message: "Item updated successfully",
            item: itemActualizado 
        });

    } catch (error) {
        console.error("Error updating item:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}