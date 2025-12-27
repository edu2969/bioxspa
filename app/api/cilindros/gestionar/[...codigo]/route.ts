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
import { TIPO_CARGO, TIPO_ESTADO_ITEM_CATALOGO } from "@/app/utils/constants";
import { IItemCatalogoPowerScanView } from "@/components/prefabs/types";
import { IItemCatalogo } from "@/types/itemCatalogo";
import { ICliente } from "@/types/cliente";
import { IDireccion } from "@/types/direccion";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";

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

export async function GET(request: Request, { params }: { params: { codigo: string } }) {
    await connectMongoDB();

    const { codigo } = await params;

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
            .lean<IItemCatalogo>();

        if (!item) {
            return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }

        const view: IItemCatalogoPowerScanView = {
            _id: item._id!,
            ownerId: (item.ownerId && typeof item.ownerId === "object" && "nombre" in item.ownerId) ? item.ownerId as ICliente : null,
            direccionId: (item.direccionId && typeof item.direccionId === "object" && "calle" in item.direccionId) ? item.direccionId as IDireccion : null,
            elemento: item.subcategoriaCatalogoId.categoriaCatalogoId.elemento ?? "", // If 'elemento' does not exist on IItemCatalogo, set to empty string or remove if not needed
            subcategoriaCatalogoId: item.subcategoriaCatalogoId._id ?? "",
            categoriaCatalogoId: item.subcategoriaCatalogoId.categoriaCatalogoId._id ?? "",
            esIndustrial: item.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial ?? false,
            esMedicinal: item.subcategoriaCatalogoId.categoriaCatalogoId.esMedicinal ?? false,
            sinSifon: item.subcategoriaCatalogoId.sinSifon ?? false,
            cantidad: item.subcategoriaCatalogoId.cantidad ?? 0,
            unidad: item.subcategoriaCatalogoId.unidad ?? "",
            codigo: item.codigo ?? "",
            nombre: item.nombre ?? "",
            descripcion: item.descripcion ?? "",
            descripcionCorta: item.descripcionCorta ?? "",
            stockActual: item.stockActual ?? 0,
            stockMinimo: item.stockMinimo ?? 0,
            garantiaAnual: item.garantiaAnual ?? 0,
            estado: item.estado ?? TIPO_ESTADO_ITEM_CATALOGO.no_aplica,
            destacado: item.destacado === true,
            visible: item.visible === true,
            url: item.url ?? "",
            urlImagen: item.urlImagen ?? "",
            urlFichaTecnica: item.urlFichaTecnica ?? "",
            fichaTecnica: item.fichaTecnica ?? "",
            fechaMantencion: item.fechaMantencion ?? null
        }

        return NextResponse.json({ ok: true, item: view }, { status: 200 });
    } catch (error) {
        console.error("Error fetching item:", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { 
    params: { 
        codigo: string,
        rutaId?: string,
        ventaId?: string
    } }) {
    await connectMongoDB();
    const { codigo } = await params;
    const body = await request.json();
    const { rutaId, ventaId } = body;

    if(!rutaId && !ventaId) {
        return NextResponse.json({ ok: false, error: "Missing both rutaId/ventaId parameter" }, { status: 400 });
    }

    console.log("POST /api/cilindros/gestionar/[...codigo] called with codigo:", codigo, "rutaId:", rutaId, "ventaId:", ventaId);

    const item = await ItemCatalogo.findOne({ codigo: codigo[0] }).lean<IItemCatalogo>();

    if(!item) {
        return NextResponse.json({ ok: false, error: `Item codigo ${codigo[0]} not found` }, { status: 404 });
    }

    const ruta = rutaId ? await RutaDespacho.findById(rutaId) : null;

    if(ruta) {
        if(ruta.cargaItemIds.includes(item._id!)) {
            return NextResponse.json({ ok: false, item, error: `El cilindro con código ${codigo[0]} ya ha sido agregado a la ruta de despacho.` }, { status: 400 });
        }
    }


    const ventas = await Venta.find(rutaId ? { _id: { $in: ruta!.ventaIds }} : { _id: ventaId });
    const detalles = await DetalleVenta.countDocuments({ 
        ventaId: { $in: ventas.map(v => v._id) },
        subcategoriaCatalogoId: item.subcategoriaCatalogoId
    });

    if(detalles === 0) {
        return NextResponse.json({ ok: false, item, error: `El cilindro con código ${codigo[0]} no pertenece a la ruta de despacho.` }, { status: 400 });
    }
    
    await RutaDespacho.updateMany(
        { _id: rutaId },
        { $push: { cargaItemIds: item._id } }
    );

    return NextResponse.json({ ok: true, item, message: `Cilindro con código ${codigo[0]} agregado a la ruta de despacho.` }, { status: 200 });
}
