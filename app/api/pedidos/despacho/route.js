import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";
import { getNUCode } from "@/lib/nuConverter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import DetalleVenta from "@/models/detalleVenta";
import RutaDespacho from "@/models/rutaDespacho";
import Dependencia from "@/models/dependencia";
import ItemCatalogo from "@/models/itemCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import User from "@/models/user";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET() {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        if (!mongoose.models.User) {
            mongoose.model("User", User.schema);
        }
        if (!mongoose.models.Dependencia) {
            mongoose.model("Dependencia", Dependencia.schema);
        }
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }
        if (!mongoose.models.Vehiculo) {
            mongoose.model("Vehiculo", Vehiculo.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }        
        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
        }
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log(`Fetching cargo for userId: ${userId}`);
        const cargo = await Cargo.findOne({ userId, tipo: TIPO_CARGO.despacho }).populate("dependenciaId").lean();

        if (!cargo || !cargo.dependenciaId) {
            console.warn(`No cargo or dependencia found for userId: ${userId}`);
            return NextResponse.json({ ok: false, error: "No cargo or dependencia found" }, { status: 404 });
        }

        const dependenciaId = cargo.dependenciaId._id;
        console.log(`Fetching choferes for dependenciaId: ${dependenciaId}`);
        const choferes = await Cargo.find({ dependenciaId, tipo: TIPO_CARGO.conductor }).populate("userId").lean();

        if (choferes.length === 0) {
            console.warn(`No choferes found for dependenciaId: ${dependenciaId}`);
            return NextResponse.json({ ok: true, cargamentos: [] });
        }

        const choferIds = choferes.map((chofer) => chofer.userId._id);
        console.log("Fetching rutasDespacho for choferes...");
        const rutasDespacho = await RutaDespacho.find({ choferId: { $in: choferIds } })
            .populate("choferId vehiculoId ventaIds")
            .lean();

        if (rutasDespacho.length === 0) {
            console.warn("No rutasDespacho found for choferes.");
            return NextResponse.json({ ok: true, cargamentos: [] });
        }

        console.log("Fetching detalleVentas...");
        const detalleVentas = await DetalleVenta.find()
            .populate({
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                select: "nombre unidad categoriaCatalogoId cantidad sinSifon",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo",
                    select: "nombre tipo gas elemento esIndustrial"
                }
            })
            .populate({
                path: "itemCatalogoIds",
                model: "ItemCatalogo",
                select: "codigo"
            })
            .lean();

        console.log("Mapping cargamentos...");
        const cargamentos = rutasDespacho.map((ruta) => {
            const items = [];
            let fechaVentaMasReciente = null;

            ruta.ventaIds.forEach((venta) => {
                const detalles = detalleVentas.filter(
                    (detalle) => detalle.ventaId.toString() === venta._id.toString()
                );

                detalles.forEach((detalle) => {
                    const subcategoria = detalle.subcategoriaCatalogoId;
                    const itemCatalogoIds = detalle.itemCatalogoIds || [];
                    const nuCode = subcategoria?.categoriaCatalogoId?.elemento
                        ? getNUCode(subcategoria.categoriaCatalogoId.elemento)
                        : null;

                    const existingItem = items.find((item) => item.subcategoriaId === subcategoria?._id);

                    if (existingItem) {
                        existingItem.multiplicador += detalle.cantidad;
                        existingItem.restantes += detalle.cantidad - itemCatalogoIds.length;
                    } else {
                        items.push({
                            nombre: (subcategoria?.categoriaCatalogoId?.nombre + subcategoria?.nombre) || null,
                            multiplicador: detalle.cantidad,
                            cantidad: subcategoria?.cantidad || "??",
                            unidad: subcategoria?.unidad || null,
                            restantes: detalle.cantidad - itemCatalogoIds.length,
                            elemento: subcategoria?.categoriaCatalogoId?.elemento,
                            sinSifon: subcategoria?.sinSifon || false,
                            esIndustrial: subcategoria?.categoriaCatalogoId?.esIndustrial || false,
                            nuCode: nuCode,
                            subcategoriaId: subcategoria?._id || null,
                            items: itemCatalogoIds.map((item) => ({
                                codigo: item.codigo,
                                _id: item._id
                            }))
                        });
                    }
                });

                if (!fechaVentaMasReciente || new Date(venta.createdAt) > new Date(fechaVentaMasReciente)) {
                    fechaVentaMasReciente = venta.createdAt;
                }
            });

            return {
                rutaId: ruta._id,
                nombreChofer: ruta.choferId.name,
                patenteVehiculo: ruta.vehiculoId?.patente || null,
                fechaVentaMasReciente,
                items
            };
        });

        console.log("Returning response with cargamentos.");
        return NextResponse.json({ ok: true, cargamentos });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectMongoDB();
        const { rutaId, scanCodes } = await request.json();

        if (!Array.isArray(scanCodes) || scanCodes.length === 0 || !rutaId) {
            return NextResponse.json({ error: "Invalid payload format. {rutaId, scanCodes[]}" }, { status: 400 });
        }

        // Buscar la ruta de despacho por rutaId
        const ruta = await RutaDespacho.findById(rutaId);
        if (!ruta) {
            return NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }

        // Agregar historial de carga
        ruta.hitorialCarga.push({
            esCarga: true,
            fecha: new Date(),
            itemMovidoIds: scanCodes
        });

        ruta.cargaItemIds.push(...scanCodes);

        // Cambiar estado y agregar historial de estado
        ruta.estado = TIPO_ESTADO_RUTA_DESPACHO.orden_cargada;
        ruta.historialEstado.push({
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_cargada,
            fecha: new Date()
        });

        console.log("Updating item states...", ruta);

        await ruta.save();

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}