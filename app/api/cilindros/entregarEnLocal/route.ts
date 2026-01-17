import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Venta from "@/models/venta";
import Direccion from "@/models/direccion";
import DetalleVenta from "@/models/detalleVenta";
import ItemCatalogo from "@/models/itemCatalogo";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";
import { ICargo } from "@/types/cargo";
import { IItemCatalogo } from "@/types/itemCatalogo";
import { IDependencia } from "@/types/dependencia";
import { IVenta } from "@/types/venta";
import { IDetalleVenta } from "@/types/detalleVenta";

export async function POST(request: NextRequest) {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("Connected to MongoDB");

        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }

        // Get user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Usuario no autenticado" }, { status: 401 });
        }

        const userId = session.user.id;
        const { ventaId, codigo } = await request.json();

        if (!ventaId || !codigo) {
            return NextResponse.json({ ok: false, error: "ventaId y codigo son requeridos" }, { status: 400 });
        }

        // Find item by codigo
        const item = await ItemCatalogo.findOne({ codigo })
        .populate({
            path: "direccionId",
            select: "_id"
        })
        .populate({
            path: "subcategoriaCatalogoId",
            select: "_id"
        })
        .lean<IItemCatalogo>();
        if (!item) {
            return NextResponse.json({ ok: false, error: "Item no encontrado" }, { status: 404 });
        }

        // Get user's cargo to find their dependencia and direccion
        const cargo = await Cargo.findOne({
            userId,
            desde: { $lte: new Date() },
            $or: [
                { hasta: { $exists: false } },
                { hasta: null },
                { hasta: { $gte: new Date() } }
            ]
        }).lean<ICargo>();

        if (!cargo || !cargo.dependenciaId) {
            return NextResponse.json({ ok: false, error: "Usuario no tiene cargo activo con dependencia" }, { status: 403 });
        }

        // Get dependencia to find direccion
        const dependencia = await Dependencia.findById(cargo.dependenciaId)
        .populate({
            path: "direccionId",
            select: "_id"
        }).lean<IDependencia>();

        if (!dependencia) {
            return NextResponse.json({ ok: false, error: "Dependencia no encontrada" }, { status: 404 });
        }

        // Validate item is in the same direccion as user's dependencia
        if (!item.direccionId || !dependencia.direccionId || 
            item.direccionId.toString() !== dependencia.direccionId.toString()) {
            return NextResponse.json({ ok: false, error: "El item no está en la dirección de entrega" }, { status: 400 });
        }

        // Get venta and its detalles
        const venta = await Venta.findById(ventaId).lean<IVenta>();
        if (!venta) {
            return NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
        }

        const detallesVenta = await DetalleVenta.find({ ventaId })
        .populate({
            path: "subcategoriaCatalogoId",
            select: "_id"
        })
        .populate({
            path: "itemCatalogoIds",
            select: "_id"
        })
        .lean<IDetalleVenta[]>();

        if (!detallesVenta || detallesVenta.length === 0) {
            return NextResponse.json({ ok: false, error: "No se encontraron detalles para la venta" }, { status: 404 });
        }

        // Check if item belongs to any subcategoria in the venta detalles
        const subcategoriaIds = detallesVenta.map(detalle => String(detalle.subcategoriaCatalogoId?._id));
        const itemSubcategoriaId = String(item.subcategoriaCatalogoId?._id);

        if (!itemSubcategoriaId || !subcategoriaIds.includes(itemSubcategoriaId)) {
            return NextResponse.json({ ok: false, error: "El item no pertenece a ninguna subcategoría de la venta" }, { status: 400 });
        }

        // Find the detalle that matches the item's subcategoria
        const detalleCorrespondiente = detallesVenta.find(
            detalle => String(detalle.subcategoriaCatalogoId?._id) === itemSubcategoriaId
        );

        if (!detalleCorrespondiente) {
            return NextResponse.json({ ok: false, error: "No se encontró el detalle correspondiente" }, { status: 404 });
        }

        // Check if item is already in the itemCatalogoIds array
        const itemCatalogoIds = detalleCorrespondiente.itemCatalogoIds || [];
        const itemIdString = String(item._id);

        if (itemCatalogoIds.some(item => String(item._id) === itemIdString)) {
            return NextResponse.json({ ok: false, error: "El item ya está registrado en esta venta" }, { status: 400 });
        }

        // Add item to itemCatalogoIds array
        await DetalleVenta.findByIdAndUpdate(
            detalleCorrespondiente._id,
            {
                $push: { itemCatalogoIds: item._id }
            }
        );

        // TODO: Add to historial de carga (this would require the carga model structure)
        // This part would need the carga/movimiento model definitions to implement properly

        return NextResponse.json({
            ok: true,
            message: "Item entregado exitosamente",
            itemId: item._id,
            codigo: item.codigo
        });

    } catch (error) {
        console.error("Error in entregarEnLocal:", error);
        return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
    }
}