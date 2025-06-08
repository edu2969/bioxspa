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
        
        // Helper function to enrich prices with category/subcategory names
        async function enrichPricesWithNames(prices) {
            const subcatIds = [...new Set(prices.map(p => p.subcategoriaCatalogoId))];
            const subcategories = await SubcategoriaCatalogo.find({ _id: { $in: subcatIds } })
                .select("nombre categoriaCatalogoId").lean();
            
            const catIds = [...new Set(subcategories.map(s => s.categoriaCatalogoId))];
            const categories = await CategoriaCatalogo.find({ _id: { $in: catIds } })
                .select("nombre").lean();
            
            const subcatMap = Object.fromEntries(subcategories.map(s => [s._id.toString(), s]));
            const catMap = Object.fromEntries(categories.map(c => [c._id.toString(), c]));
            
            return prices.map(precio => {
                const subcategoria = subcatMap[precio.subcategoriaCatalogoId.toString()];
                if (subcategoria) {
                    const categoria = catMap[subcategoria.categoriaCatalogoId.toString()];
                    if (categoria) {
                        precio.nombre = `${categoria.nombre} - ${subcategoria.nombre}`;
                    }
                }
                return precio;
            });
        }

        // Optional clienteId support for backward compatibility
        if (clienteId) {
            const cliente = await Cliente.findById(clienteId).select("nombre rut tipoPrecio");
            if (!cliente) {
                return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
            }

            const preciosList = await Precio.find({ clienteId }).select("-__v -createdAt -updatedAt").lean();
            const enrichedPrices = await enrichPricesWithNames(preciosList);

            return NextResponse.json({
                ok: true,
                precios: {
                    tipoPrecio: cliente.tipoPrecio,
                    nombre: cliente.nombre,
                    rut: cliente.rut,
                    precios: enrichedPrices
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
            }).lean();
            
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
                    const enrichedPrices = await enrichPricesWithNames(preciosPorCliente[clienteId]);
                    resultados.push({
                        clienteId: cliente._id,
                        nombre: cliente.nombre,
                        rut: cliente.rut,
                        tipoPrecio: cliente.tipoPrecio,
                        precios: enrichedPrices
                    });
                }
            }
            
            return NextResponse.json({ ok: true, clientes: resultados });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}