import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import DetalleVenta from "@/models/detalleVenta";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import XubcategoriaProducto from "@/models/xubcategoriaProducto";
import XategoriaProducto from "@/models/xategoriaProducto";

export async function GET(request) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (q === "rv") {
        console.log("Starting migration...");
        await resetVentas();
        console.log("Migration completed successfully");
    }   
    
    if (q === "ms") {
        console.log("Starting product migration and improvement...");
        await mejorarSubcategorias();
        console.log("Product migration and improvement completed successfully");
    }

    if (q === "cc") {
        console.log("Starting category completion...");
        await completarCategorias();
        console.log("Category completion completed successfully");
    }
    
    return NextResponse.json({ message: "Success migrate and improve" });
}

const resetVentas = async () => {
    await Venta.deleteMany({});
    await RutaDespacho.deleteMany({});
    await DetalleVenta.deleteMany({});
}

const mejorarSubcategorias = async () => {
    const items = await ItemCatalogo.find({});
        
        for (const item of items) {
            try {
                // Get the subcategoria from the item
                const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId);
                
                if (subcategoria && subcategoria.temporalId) {
                    // Find the corresponding xubcategoriaProducto using temporalId
                    const xubcategoria = await XubcategoriaProducto.findOne({ id: subcategoria.temporalId });
                    
                    if (xubcategoria && xubcategoria.categoria_id) {
                        // Find the categoria using the categoria_id as temporalId
                        const categoria = await CategoriaCatalogo.findOne({ temporalId: xubcategoria.categoria_id });
                        
                        if (categoria) {
                            // Update the subcategoria with the categoriaCatalogoId
                            await SubcategoriaCatalogo.findByIdAndUpdate(
                                subcategoria._id,
                                { categoriaCatalogoId: categoria._id }
                            );
                            
                            console.log(`Updated subcategoria ${subcategoria._id} with categoria ${categoria._id}`);
                        } else {
                            console.warn(`Categoria not found for temporalId: ${xubcategoria.categoria_id}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing item ${item._id}:`, error);
            }
        }
}

const completarCategorias = async () => {
    const categorias = await CategoriaCatalogo.find({});

    for (const categoria of categorias) {
        try {
            // Find the corresponding XategoriaProducto by name
            const xategoria = await XategoriaProducto.findOne({ nombre: categoria.nombre });
            
            if (xategoria) {
                // Update the categoria with the temporalId from XategoriaProducto
                await CategoriaCatalogo.findByIdAndUpdate(
                    categoria._id,
                    { temporalId: xategoria.id }
                );
                
                console.log(`Updated categoria ${categoria._id} with temporalId ${xategoria.id}`);
            } else {
                console.warn(`XategoriaProducto not found for categoria: ${categoria.nombre}`);
            }
        } catch (error) {
            console.error(`Error processing categoria ${categoria._id}:`, error);
        }
    }
}