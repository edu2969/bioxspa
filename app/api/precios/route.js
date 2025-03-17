import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Precio from "@/models/precio";
import { USER_ROLE } from "@/app/utils/constants";
import Cliente from "@/models/cliente";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching users...");
    const users = await User.find({ role: { $ne: USER_ROLE.neo }}).lean();
    console.log(`Fetched ${users.length} users`);

    console.log("Mapping users with precios...");
    const usersWithPrecios = await Promise.all(users.map(async user => {
        const precios = await Precio.find({ userId: user._id }).lean();
        const preciosWithDetails = await Promise.all(precios.map(async precio => {
            const cliente = await Cliente.findById(precio.clienteId).lean();
            const itemCatalogo = await ItemCatalogo.findById(precio.itemCatalogoId).lean();
            const subcategoriaCatalogo = itemCatalogo ? await SubcategoriaCatalogo.findById(itemCatalogo.subcategoriaCatalogoId).lean() : null;
            const categoriaCatalogo = subcategoriaCatalogo ? await CategoriaCatalogo.findById(subcategoriaCatalogo.categoriaCatalogoId).lean() : null;

            return { 
                ...precio, 
                cliente: cliente ? { nombre: cliente.nombre, _id: cliente._id, rut: cliente.rut } : null,
                categoriaItemNombre: categoriaCatalogo ? categoriaCatalogo.nombre : null,
                subcategoriaItemNombre: subcategoriaCatalogo ? subcategoriaCatalogo.nombre : null
            };
        }));
        return { ...user, precios: preciosWithDetails };
    }));

    console.log("Returning users with precios");
    return NextResponse.json(usersWithPrecios);
}

export async function POST(req) {
    const body = await req.json();
    await connectMongoDB();

    const precioData = {
        itemCatalogoId: body.itemCatalogoId,
        usuarioId: body.usuarioId,
        dependenciaId: body.dependenciaId || null,
        sucursalId: body.sucursalId || null,
        valorBruto: body.valorBruto,
        impuesto: body.impuesto,
        moneda: body.moneda,
        valor: body.valor,
        fechaDesde: new Date(body.fechaDesde),
        fechaHasta: body.fechaHasta ? new Date(body.fechaHasta) : null,
        historial: body.historial || []
    };

    const precioUpdated = await Precio.findOneAndUpdate(
        { usuarioId: body.usuarioId, itemCatalogoId: body.itemCatalogoId },
        precioData,
        { new: true, upsert: true }
    );

    if (!precioUpdated) {
        return NextResponse.json({ error: "Error updating precio" }, { status: 404 });
    }

    return NextResponse.json(precioUpdated);
}