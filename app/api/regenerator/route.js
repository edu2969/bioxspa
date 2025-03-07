import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import XategoriaProducto from "@/models/xategoriaProducto";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import XubcategoriaProducto from "@/models/xubcategoriaProducto";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import Xroducto from "@/models/xroducto";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    /*console.log("Migrating subcategories v1.4...");
    await migrateSubcategorias();
    console.log("Subcategories migrated");

    console.log("Improving subcategories v1.1...");
    await improveSubcategorias();
    console.log("Subcategories improved");*/

    /*console.log("Migrating items categoria...");
    await migrateItemsCategoria();
    console.log("Items categoria migrated");*/

    return NextResponse.json({ message: "Success migrate and improve" });
}

const migrateItemsCategoria = async () => {
    const xroductos = await Xroducto.find();
    console.log(`Found ${xroductos.length} xroductos`);

    for (const xroducto of xroductos) {
        const subcategoriaCatalogo = await SubcategoriaCatalogo.findOne({ temporalId: xroducto.subcategoria_id });
        if (!subcategoriaCatalogo) {
            console.log(`SubcategoriaCatalogo not found for xroducto ${xroducto._id}`);
            continue;
        }

        const newItem = new ItemCatalogo({
            temporalId: xroducto.id,
            codigo: xroducto.codigo,
            subcategoriaCatalogoId: subcategoriaCatalogo._id,
            nombre: xroducto.nombre,
            descripcion: xroducto.descripcion,
            descripcionCorta: xroducto.breve,
            fichaTecnica: xroducto.fichatecnica,
            urlFichaTecnica: xroducto.fichatecnica,
            urlImagen: xroducto.url,
            garantiaAnual: parseInt(xroducto.garantia) || 0,
            destacado: xroducto.destacado === 'true',
            stockMinimo: parseInt(xroducto.stockminimo) || 0,
            stockActual: parseInt(xroducto.stock_producto) || 0,
            visible: xroducto.visible === 'true',
            url: xroducto.url,
            createdAt: xroducto.created_at,
            updatedAt: xroducto.updated_at
        });

        await newItem.save();
        console.log(`Migrated xroducto ${xroducto.nombre} to item ${newItem._id}`);
    }
}

const migrateSubcategorias = async () => {
    const xubcategorias = await XubcategoriaProducto.find();
    console.log(`Found ${xubcategorias.length} xubcategorias`);

    for (const xubcategoria of xubcategorias) {
        const xategoriaProducto = await XategoriaProducto.findOne({ id: xubcategoria.categoria_id });
        if (!xategoriaProducto) {
            console.log(`CategoriaProducto not found for xubcategoria ${xubcategoria._id}`);
            continue;
        }

        const categoriaCatalogo = await CategoriaCatalogo.findOne({ nombre: xategoriaProducto.nombre });
        if (!categoriaCatalogo) {
            console.log(`CategoriaCatalogo not found for xategoriaProducto ${xategoriaProducto._id}`);
            continue;
        }

        const newSubcategoria = new SubcategoriaCatalogo({
            temporalId: xubcategoria.id,
            nombre: xubcategoria.nombre,
            categoriaCatalogoId: categoriaCatalogo._id,
            urlImagen: xubcategoria.url,
            createdAt: xubcategoria.created_at,
            updatedAt: xubcategoria.updated_at
        });

        await newSubcategoria.save();
        console.log(`Migrated xubcategoria ${xubcategoria.nombre} to subcategoria ${newSubcategoria._id}`);
    }
}


const improveSubcategorias = async () => {
    const subcategorias = await SubcategoriaCatalogo.find();
    console.log(`Found ${subcategorias.length} subcategories`);

    for (const subcategoria of subcategorias) {
        const nombreLower = subcategoria.nombre.toLowerCase();
        const nombreParts = nombreLower.split(" ");

        let cantidad = null;
        let unidad = null;
        let nombreGas = null;
        let sinSifon = false;

        for (let i = 0; i < nombreParts.length; i++) {
            if (nombreParts[i] === "m3" || nombreParts[i] === "kgs") {
                unidad = nombreParts[i];
                if (i > 0 && !isNaN(parseFloat(nombreParts[i - 1].replace(",", ".")))) {
                    cantidad = parseFloat(nombreParts[i - 1].replace(",", "."));
                }                
            } 
            if (nombreParts[i] === "de") {
                nombreGas = nombreParts.slice(0, i).join(" ");
            } 
            if (nombreParts[i] === "sifon") {
                if (i > 0 && nombreParts[i - 1] === "sin") {
                    sinSifon = true;
                } else if (i > 0 && nombreParts[i - 1] === "con") {
                    sinSifon = false;
                }
            }
        }

        if (cantidad != null) {
            subcategoria.cantidad = cantidad;
        }
        if (unidad != null) {
            subcategoria.unidad = unidad;
        }
        if (nombreGas != null) {
            subcategoria.nombreGas = nombreGas;
        }
        if (sinSifon != null) {
            subcategoria.sinSifon = sinSifon;
        }
        await subcategoria.save();
    }
};