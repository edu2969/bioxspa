import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Precio from "@/models/precio";
import Cliente from "@/models/cliente";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching clients...");
    const clients = await Cliente.find().lean();
    console.log(`Fetched ${clients.length} clients`);

    console.log("Mapping clients with precios...");
    const clientsWithPrecios = await Promise.all(clients.map(async client => {
        const precios = await Precio.find({ clienteId: client._id }).sort({ createdAt: -1 }).lean();
        const preciosWithDetails = await Promise.all(precios.map(async precio => {
            // Asegúrate de importar el modelo SubcategoriaCatalogo arriba:
            // import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
            const subcategoria = await SubcategoriaCatalogo.findById(precio.subcategoriaCatalogoId).lean();
            return {
                valor: precio.valor,
                fechaDesde: precio.fechaDesde,
                subcategoriaCatalogoId: precio.subcategoriaCatalogoId,
                categoriaId: subcategoria ? subcategoria.categoriaCatalogoId : null
            };
        }));
        return { 
            cliente: { 
                nombre: client.nombre, 
                _id: client._id, 
                rut: client.rut 
            },
            precios: preciosWithDetails 
        };
    }));

    console.log("Returning clients with precios");
    return NextResponse.json(clientsWithPrecios);
}

export async function POST(req) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    const body = await req.json();
    console.log("Received body:", body);

    // Extraer datos del payload
    const {
        precioId,
        subcategoriaCatalogoId,
        valor,
        clienteId
    } = body;

    // Validación básica
    if (!subcategoriaCatalogoId || !clienteId) {
        console.warn("Missing subcategoriaCatalogoId or clienteId");
        return NextResponse.json({ error: "subcategoriaCatalogoId y clienteId son requeridos" }, { status: 400 });
    }

    // Buscar si existe el precio (por _id si es update, o por clienteId+subcategoriaCatalogoId si es nuevo)
    let precio;
    if (precioId) {
        console.log(`Looking for Precio by precioId: ${precioId}`);
        precio = await Precio.findById(precioId);
    } else {        
        console.log(`Looking for Precio by clienteId: ${clienteId} and subcategoriaCatalogoId: ${subcategoriaCatalogoId}`);
        precio = await Precio.findOne({ clienteId, subcategoriaCatalogoId });
        if(precio) {
            console.warn("Precio already exists for this clienteId and subcategoriaCatalogoId, updating instead of creating a new one");
            return NextResponse.json({ error: "Ya existe un precio para este cliente y subcategoría" });
        }
    }

    if (precio) {
        console.log("Precio found, updating historial and fields");
        // Actualizar historial
        if (!Array.isArray(precio.historial)) precio.historial = [];
        const valorAnterior = precio.valor || 0;
        const varianza = valorAnterior !== 0 ? ((valor - valorAnterior) / valorAnterior) * 100 : 0;
        precio.historial.push({
            valor: valorAnterior,
            fecha: precio.fechaDesde,
            varianza
        });

        // Actualizar campos
        precio.categoriaId = categoriaId;
        precio.subcategoriaCatalogoId = subcategoriaCatalogoId;
        precio.valor = valor;
        precio.clienteId = clienteId;
        precio.fechaDesde = new Date();
        await precio.save();
        console.log("Precio updated:", precio);
        return NextResponse.json({ ok: true, precio });
    } else {
        console.log("Precio not found, creating new Precio");
        // Crear nuevo precio
        const nuevoPrecio = await Precio.create({
            clienteId,
            subcategoriaCatalogoId,
            valor,
            fechaDesde: new Date(),
            historial: [],
        });
        console.log("Nuevo Precio created:", nuevoPrecio);
        return NextResponse.json({ ok: true, precio: nuevoPrecio });
    }
}