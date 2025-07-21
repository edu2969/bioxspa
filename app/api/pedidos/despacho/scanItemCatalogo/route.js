import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";
import Direccion from "@/models/direccion";
import Cliente from "@/models/cliente";
import User from "@/models/user";
import ItemCatalogo from "@/models/itemCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import mongoose from "mongoose";

export async function GET(request) {
    try {
        await connectMongoDB();

        const { searchParams } = new URL(request.url);
        const codigo = searchParams.get("codigo");

        if (!codigo) {
            return NextResponse.json({ ok: false, error: "Codigo is required" }, { status: 400 });
        }

        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Verify the user is a driver (conductor)
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        // Verify the user has a conductor cargo assigned
        const cargo = await Cargo.findOne({
            userId: userId,
            hasta: null
        }).populate({
            path: 'dependenciaId',
            model: Dependencia,
            select: '_id nombre direccionId clienteId',
            populate: [{
                path: 'direccionId',
                model: Direccion,
                select: '_id nombre'
            }, {
                path: 'clienteId',
                model: Cliente,
                select: '_id nombre'
            }]
        });

        if (!cargo) {
            return NextResponse.json({ ok: false, error: "User is not authorized" }, { status: 403 });
        }

        const item = await ItemCatalogo.findOne({ codigo: codigo })
            .populate({
                path: 'direccionId',
                model: Direccion,
                select: '_id nombre latitud longitud'
            })
            .populate({
                path: 'ownerId',
                model: 'Cliente',
                select: '_id nombre'
            })
            .populate({
                path: 'subcategoriaCatalogoId',
                model: 'SubcategoriaCatalogo',
                select: '_id nombre unidad cantidad nombreGas sinSifon',
                populate: {
                    path: 'categoriaCatalogoId',
                    model: 'CategoriaCatalogo',
                    select: '_id nombre gas elemento esIndustrial esMedicinal'
                }
            })
            .lean();


        console.log("Item found:", item);

        return NextResponse.json({
            ok: true,
            tipo: item.tipo,
            gas: item.subcategoriaCatalogoId.categoriaCatalogoId.gas,
            elemento: item.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
            esIndustrial: item.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial,
            esMedicinal: item.subcategoriaCatalogoId.categoriaCatalogoId.esMedicinal,
            cantidad: item.subcategoriaCatalogoId.cantidad,
            unidad: item.subcategoriaCatalogoId.unidad,
            nombreGas: item.subcategoriaCatalogoId.nombreGas,
            sinSifon: item.subcategoriaCatalogoId.sinSifon,
            itemId: item._id,
            direccion: item.direccionId,
            categoria: item.subcategoriaCatalogoId.categoriaCatalogoId,
            subcategoria: item.subcategoriaCatalogoId,
            cliente: item.ownerId,
            direccionInvalida: cargo.dependenciaId.direccionId._id.toString() !== item.direccionId._id.toString(),
            codigo,
            direccionActual: {
                nombreDependencia: cargo.dependenciaId.nombre,
                direccion: cargo.dependenciaId.direccionId,
                cliente: cargo.dependenciaId.clienteId,
            },
            estado: item.estado,
        });
    } catch (error) {
        console.error("Error in GET /api/pedidos/despacho/scanItemCatalogo:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}