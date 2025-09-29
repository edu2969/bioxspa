import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import Precio from "@/models/precio";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

export async function GET(req) {
    try {
        await connectMongoDB();
        const { searchParams } = new URL(req.url);
        const searchText = searchParams.get("search") || "";
        const clienteId = searchParams.get("clienteId"); // Keep this for backward compatibility
        
        // Optional clienteId support for backward compatibility
        if (clienteId) {
            const cliente = await Cliente.findById(clienteId).select("nombre rut tipoPrecio");
            if (!cliente) {
                return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
            }

            const preciosList = await Precio.find({ clienteId }).select("-__v -createdAt -updatedAt")
            .populate({ 
                path: "subcategoriaCatalogoId", 
                select: "nombre cantidad unidad sinSifon categoriaCatalogoId", 
                populate: { 
                    path: "categoriaCatalogoId", 
                    select: "nombre tipo gas elemento esIndustrial esMedicial" } })            
            .lean();

            return NextResponse.json({
                ok: true,
                precios: {
                    tipoPrecio: cliente.tipoPrecio,
                    nombre: cliente.nombre,
                    rut: cliente.rut,
                    precios: preciosList
                }
            });
        } 
        // Main flow - search using the provided text
        else {
            if (!searchText) {
                return NextResponse.json({ error: "Search parameter is required" }, { status: 400 });
            }
            
            const searchRegex = new RegExp(searchText, 'i');
            
            // Find matching clients by name or rut
            const matchingClientes = await Cliente.find({
                $or: [{ nombre: searchRegex }, { rut: searchRegex }]
            }).select("_id nombre rut tipoPrecio").lean();
            
            // Find matching categories and subcategories
            const matchingCategorias = await CategoriaCatalogo.find({ nombre: searchRegex }).select("_id").lean();
            const matchingSubcategorias = await SubcategoriaCatalogo.find({
                $or: [
                    { nombre: searchRegex },
                    { categoriaCatalogoId: { $in: matchingCategorias.map(c => c._id) } }
                ]
            }).select("_id").lean();
            
            // Find all prices matching either clients or subcategories
            const precios = await Precio.find({
                $or: [
                    { clienteId: { $in: matchingClientes.map(c => c._id) } },
                    { subcategoriaCatalogoId: { $in: matchingSubcategorias.map(s => s._id) } }
                ]
            }).populate({ 
                path: "subcategoriaCatalogoId", 
                select: "nombre cantidad unidad sinSifon categoriaCatalogoId", 
                populate: { 
                    path: "categoriaCatalogoId", 
                    select: "nombre tipo gas elemento esIndustrial esMedicial" } })            
            .lean();
            
            // Get unique client IDs from the prices
            const clienteIds = [...new Set(precios.map(p => p.clienteId.toString()))];
            
            // Get details for all relevant clients
            const clientes = await Cliente.find({
                _id: { $in: clienteIds }
            }).select("_id nombre rut tipoPrecio").lean();
            
            // Group prices by client ID
            const preciosPorCliente = {};
            precios.forEach(precio => {
                const clienteId = precio.clienteId.toString();
                if (!preciosPorCliente[clienteId]) preciosPorCliente[clienteId] = [];
                preciosPorCliente[clienteId].push(precio);
            });
            
            // Build the result array
            const resultados = [];
            
            for (const cliente of clientes) {
                const clienteId = cliente._id.toString();
                if (preciosPorCliente[clienteId]) {
                    resultados.push({
                        clienteId: cliente._id,
                        nombre: cliente.nombre,
                        rut: cliente.rut,
                        tipoPrecio: cliente.tipoPrecio,
                        precios: preciosPorCliente[clienteId]
                    });
                }
            }
            
            return NextResponse.json({ ok: true, clientes: resultados });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}