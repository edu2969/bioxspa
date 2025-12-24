import mongoose, { Types } from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import Cliente from "@/models/cliente";
import Cargo from "@/models/cargo";
import { TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CHECKLIST } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import Checklist from "@/models/checklist";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import { IUser } from "@/types/user";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { ISucursal } from "@/types/sucursal";
import { ICliente } from "@/types/cliente";
import { IVenta } from "@/types/venta";
import { IDetalleVenta } from "@/types/detalleVenta";
import Precio from "@/models/precio";
import { IPrecio } from "@/types/precio";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

interface IConductoresResponse {
    _id: string;
    nombre: string;
    pedidos: {
        _id: string;
        tipo: number;
        estado: number;
        fecha: Date;
        nombreCliente: string;
        rutCliente: string;
        comentario: string;
        items: {
            _id: string;
            ventaId: string;
            subcategoriaCatalogoId: string;
            cantidad: number;
            precio: number;
            nombre: string;
        }[];
    }[];
    checklist: boolean;
}

export async function GET(request: Request) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");
    
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return new Response(JSON.stringify({ ok: false, error: "sucursalId is required" }), { status: 400 });
    }

    const choferesEnRuta = await RutaDespacho.find({
        estado: {
            $gte: TIPO_ESTADO_RUTA_DESPACHO.en_ruta,
            $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado
        }
    }).lean();
    const choferesIds = choferesEnRuta.map((ruta) => ruta.choferId);    

    const qry: {        
        tipo: number;
        userId?: { $nin: Types.ObjectId[] };
        $or: Array<{ sucursalId: Types.ObjectId } | { dependenciaId: { $in: Types.ObjectId[] } }>;
    } = {
        tipo: TIPO_CARGO.conductor,
        $or: []
    };
    if (choferesIds.length > 0) {
        qry.userId = { $nin: choferesIds };
    }

    const sucursal = await Sucursal.findById(sucursalId).lean<ISucursal>();
    if (!sucursal) {
        return new Response(JSON.stringify({ ok: false, error: "Sucursal no encontrada" }), { status: 400 });
    }
    const dependencias = sucursal ? await Dependencia.find({ sucursalId: sucursal._id }).lean() : [];
    if (dependencias.length == 0) {
        return new Response(JSON.stringify({ ok: false, error: "No se encontraron dependencias para la sucursal" }), { status: 400 });
    }
    qry.$or = [
        { sucursalId: new Types.ObjectId(sucursal._id) },
        { dependenciaId: { $in: dependencias.map(d => new Types.ObjectId(String(d._id))) } }
    ];
    const cargosChoferes = await Cargo.find(qry).lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conductores = await Promise.all(
        cargosChoferes.map(async (cargo) => {
            const user = await User.findById(cargo.userId).lean<IUser>();

            if(!user) {
                return new Response(JSON.stringify({ ok: false, error: `No se encontró el usuario para el cargo ${cargo._id}` }), { status: 400 });
            }

            // Find the rutaDespacho where the user is the chofer
            const rutaDespacho = await RutaDespacho.findOne({
                choferId: user._id,
                estado: {
                    $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                    $lt: TIPO_ESTADO_RUTA_DESPACHO.en_ruta
                }
            }).lean<IRutaDespacho>();

            let pedidos: IConductoresResponse["pedidos"] = [];

            if (rutaDespacho) {
                const ventas = await Venta.find({ _id: { $in: rutaDespacho.ventaIds } }).lean<IVenta[]>();
                pedidos = await Promise.all(
                    ventas.map(async (venta) => {
                        const cliente = await Cliente.findById(venta.clienteId).lean<ICliente | null>();
                        const nombreCliente = cliente?.nombre || "Desconocido";
                        const rutCliente = cliente?.rut || "Desconocido";

                        const detalleItems = await DetalleVenta.find({ ventaId: venta._id })
                            .populate({
                                path: "subcategoriaCatalogoId",
                                populate: { path: "categoriaCatalogoId" }
                            })
                            .lean<IDetalleVenta[]>();
                            
                        const items = await Promise.all(
                            detalleItems.map(async (item: IDetalleVenta) => {
                                const precioDoc = await Precio.findOne({
                                    subcategoriaCatalogoId: item.subcategoriaCatalogoId?._id,
                                    clienteId: venta.clienteId?._id
                                }).lean<IPrecio>();                                
                                return {
                                    _id: item._id?.toString() ?? "",
                                    ventaId: item.ventaId?.toString() ?? "",
                                    subcategoriaCatalogoId: (item.subcategoriaCatalogoId 
                                        && typeof item.subcategoriaCatalogoId === "object" 
                                        && "_id" in item.subcategoriaCatalogoId)
                                        ? String((item.subcategoriaCatalogoId as ISubcategoriaCatalogo)._id)
                                        : item.subcategoriaCatalogoId?.toString() ?? "",
                                    cantidad: item.cantidad,
                                    precio: precioDoc ? precioDoc.valor : 0,
                                    nombre: (item.subcategoriaCatalogoId?.nombre ?? "") +
                                        (item.subcategoriaCatalogoId?.categoriaCatalogoId?.nombre ?? "")
                                };
                            })
                        );

                        return {
                            _id: venta._id.toString(),
                            tipo: venta.tipo,
                            estado: venta.estado,
                            fecha: venta.fecha ?? new Date(0),
                            nombreCliente: nombreCliente,
                            rutCliente: rutCliente,
                            comentario: venta.comentario || "",
                            items
                        };
                    })
                );
            }

            // Check if checklist exists for today
            const checklistExists = await Checklist.findOne({
                userId: user._id,
                tipo: TIPO_CHECKLIST.vehiculo,
                fecha: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                },
                passed: true
            }).lean();

            return {
                _id: user._id,
                nombre: user.name,
                pedidos,
                checklist: !!checklistExists
            };
        })
    );

    return new Response(JSON.stringify({
        conductores
    }));
}