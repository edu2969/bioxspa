import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Precio from "@/models/precio";
import Cliente from "@/models/cliente";

export async function GET(req, props) {
    const params = await props.params;
    const { item } = params;
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const usuarioId = searchParams.get("usuarioId");
    
    console.log("PARAMS", params);
    console.log("SEARCH PARAMS", searchParams);

    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    const query = { subcategoriaCatalogoId: item[0] };
    if (clienteId) {
        console.log(`Filtering by clienteId: ${clienteId}`);
        query.clienteId = clienteId;
    }
    if (usuarioId) {
        console.log(`Filtering by usuarioId: ${usuarioId}`);
        query.userId = usuarioId;
    }
    console.log("Fetching price...");
    const precio = await Precio.findOne(query).populate('subcategoriaCatalogoId').lean();

    console.log("PRECIO", query, precio);

    if (!precio) {
        const cliente = clienteId ? await Cliente.findById(clienteId).select('tipoPrecio').lean() : null;
        if (cliente) {
            console.log(`Searching for clients with the same price type: ${cliente.tipoPrecio}`);
            const similarClients = await Cliente.find({ tipoPrecio: cliente.tipoPrecio }).select('_id').lean();
            const similarClientIds = similarClients.map(c => c._id);

            console.log(`Found ${similarClientIds.length} clients with the same price type`);
            const similarPrice = await Precio.findOne({
                'subcategoriaCatalogoId': item[0],
                'clienteId': { $in: similarClientIds },
            }).sort({ createdAt: -1 }).populate('subcategoriaCatalogoId').populate('clienteId').lean();

            if (similarPrice) {
                console.log("Returning the most recent similar price");
                return NextResponse.json({ ...similarPrice, sugerido: true });
            }
        }
        return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    console.log("Returning price");
    return NextResponse.json(precio);
}
