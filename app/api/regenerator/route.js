import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    /*console.log("Calling fixOwners...");
    await fixOwners();
    console.log("fixOwners completed.");*/

    //await createBICilindro();
    //console.log("BICilindro created successfully.");

    /*console.log("Calling fixItemCatalogo...");
    await fixItemCatalogo();
    console.log("fixItemCatalogo completed.");*/

    console.log("Calling cleanVentas...");
    await cleanVentas();
    console.log("cleanVentas completed.");

    return NextResponse.json({ message: "Success migrate and improve" });
}

/*
const fixItemCatalogo = async () => {
    const estadoMap = {
        "1": ESTADO_ITEM_CATALOGO.lleno,
        "2": ESTADO_ITEM_CATALOGO.vacio,
        "3": ESTADO_ITEM_CATALOGO.no_aplica,
        "4": ESTADO_ITEM_CATALOGO.en_llenado,
        "5": ESTADO_ITEM_CATALOGO.en_mantenimiento,
        "6": ESTADO_ITEM_CATALOGO.no_aplica
    };

    const resumen = {
        totalHistorial: 0,
        productoNoEncontrado: 0,
        itemNoEncontrado: 0,
        estadoNoValido: 0,
        actualizados: 0,
        porEstado: {}
    };

    const historial = await HistorialGas.find({});
    for (const h of historial) {
        resumen.totalHistorial += 1;
        const producto = await Producto.findOne({ id: h.productos_id });
        if (!producto || !producto.codigo) {
            resumen.productoNoEncontrado += 1;
            console.log(`Producto no encontrado para historial id=${h._id}, productos_id=${h.productos_id}`);
            continue;
        }

        const item = await ItemCatalogo.findOne({ codigo: producto.codigo, tipo: TIPO_ITEM_CATALOGO.cilindro });
        if (!item) {
            resumen.itemNoEncontrado += 1;
            console.log(`ItemCatalogo no encontrado para producto codigo=${producto.codigo}`);
            continue;
        }

        const nuevoEstado = estadoMap[h.estado_id];
        if (nuevoEstado === undefined) {
            resumen.estadoNoValido += 1;
            console.log(`Estado no válido para historial id=${h._id}, estado_id=${h.estado_id}`);
            continue;
        }

        item.estado = nuevoEstado;
        await item.save();
        resumen.actualizados += 1;
        resumen.porEstado[nuevoEstado] = (resumen.porEstado[nuevoEstado] || 0) + 1;
        console.log(`Actualizado itemCatalogo codigo=${item.codigo} a estado=${nuevoEstado}`);
    }

    console.log("Resumen de fixItemCatalogo:");
    console.log(`Total historial procesados: ${resumen.totalHistorial}`);
    console.log(`Productos no encontrados: ${resumen.productoNoEncontrado}`);
    console.log(`Items no encontrados: ${resumen.itemNoEncontrado}`);
    console.log(`Estados no válidos: ${resumen.estadoNoValido}`);
    console.log(`Items actualizados: ${resumen.actualizados}`);
    console.log("Actualizados por estado:", resumen.porEstado);
}*/

/*const fixOwners = async () => {
    const productos = await Producto.find({});
    const resumen = {
        BIOX_TA: 0,
        BIOX_CH: 0,
        AL: 0,
        TP: 0,
        sinPropietario: 0,
        sinCliente: 0,
        sinDireccion: 0,
        total: 0
    };

    for (const producto of productos) {
        resumen.total += 1;
        if (!producto.propiedad) {
            console.log(`Producto sin propiedad: codigo=${producto.codigo}`);
            resumen.sinPropietario += 1;
            continue;
        }

        let ownerId = null;
        let direccionId = null;
        let tipo = null;

        if (producto.propiedad === "BIOX TA") {
            ownerId = new mongoose.Types.ObjectId("67c5f6c229b5503c0db933ff");
            tipo = "BIOX_TA";
        } else if (producto.propiedad === "BIOX CH") {
            ownerId = new mongoose.Types.ObjectId("67c5f67029b5503c0db92f96");
            tipo = "BIOX_CH";
        } else if (producto.propiedad === "BIOX LA") {
            ownerId = new mongoose.Types.ObjectId("67c5f67029b5503c0db92f96");
            tipo = "AL";
        } else if (producto.propiedad === "A.L.") {
            ownerId = new mongoose.Types.ObjectId("67c5f67029b5503c0db92f96");
            tipo = "AL";
        } else if (producto.propiedad === "T.P.") {
            if (!producto.rut) {
                console.log(`Producto T.P. sin RUT: codigo=${producto.codigo}`);
                resumen.sinCliente += 1;
                continue;
            }
            const cliente = await Cliente.findOne({ rut: producto.rut });
            if (!cliente) {
                console.log(`No se encontró cliente para RUT ${producto.rut} (codigo=${producto.codigo})`);
                resumen.sinCliente += 1;
                continue;
            }
            ownerId = cliente._id;
            tipo = "TP";
            if (cliente.direccionDespachoIds && cliente.direccionDespachoIds.length > 0) {
                direccionId = cliente.direccionDespachoIds[0];
            } else {
                console.log(`Cliente ${cliente._id} no tiene direcciones de despacho (codigo=${producto.codigo})`);
                resumen.sinDireccion += 1;
                continue;
            }
        } else {
            console.log(`Producto con propiedad desconocida: ${producto.propiedad} (codigo=${producto.codigo})`);
            resumen.sinPropietario += 1;
            continue;
        }

        // Buscar el itemCatalogo correspondiente
        const item = await ItemCatalogo.findOne({ codigo: producto.codigo });
        if (!item) {
            console.log(`No se encontró itemCatalogo para producto codigo=${producto.codigo}`);
            continue;
        }

        // Actualizar ownerId y direccionId si corresponde
        if (ownerId) item.ownerId = ownerId;
        if (direccionId) item.direccionId = direccionId;

        await item.save();

        if (tipo) resumen[tipo] += 1;
    }

    console.log("Resumen de cilindros por propietario:");
    console.log(`BIOX TA: ${resumen.BIOX_TA}`);
    console.log(`BIOX CH: ${resumen.BIOX_CH}`);
    console.log(`A.L.: ${resumen.AL}`);
    console.log(`T.P.: ${resumen.TP}`);
    console.log(`Sin propietario: ${resumen.sinPropietario}`);
    console.log(`Sin cliente: ${resumen.sinCliente}`);
    console.log(`Sin direccion: ${resumen.sinDireccion}`);
    console.log(`Total procesados: ${resumen.total}`);
}

const createBICilindro = async () => {
    await BICilindro.deleteMany({});
    const items = await ItemCatalogo.find({ tipo: TIPO_ITEM_CATALOGO.cilindro });

    const biCilindroMap = new Map();

    for (const item of items) {
        if (!item.ownerId || !item.direccionId) continue;

        const key = `${item.ownerId}_${item.direccionId}`;
        if (!biCilindroMap.has(key)) {
            biCilindroMap.set(key, {
                clienteId: item.ownerId,
                direccionId: item.direccionId,
                vacios: 0,
                llenos: 0,
                categorias: new Map()
            });
        }

        const biCilindro = biCilindroMap.get(key);

        // Find categoriaCatalogoId from subcategoriaCatalogoId
        const subcat = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId);
        if (!subcat) continue;
        const categoriaCatalogoId = subcat.categoriaCatalogoId.toString();

        if (!biCilindro.categorias.has(categoriaCatalogoId)) {
            biCilindro.categorias.set(categoriaCatalogoId, {
                categoriaCatalogoId: subcat.categoriaCatalogoId,
                vacios: 0,
                llenos: 0,
                subcategorias: new Map()
            });
        }

        const categoria = biCilindro.categorias.get(categoriaCatalogoId);

        // Subcategoria
        const subcatId = item.subcategoriaCatalogoId.toString();
        if (!categoria.subcategorias.has(subcatId)) {
            categoria.subcategorias.set(subcatId, {
                subcategoriaCatalogoId: item.subcategoriaCatalogoId,
                vacios: 0,
                llenos: 0
            });
        }

        // Cada itemCatalogo representa un cilindro lleno
        categoria.llenos += 1;
        categoria.subcategorias.get(subcatId).llenos += 1;
        biCilindro.llenos += 1;
    }

    // Guardar en la base de datos
    for (const [, biCilindro] of biCilindroMap) {
        const categoriasArr = [];
        for (const [, categoria] of biCilindro.categorias) {
            const subcategoriasArr = [];
            for (const [, subcat] of categoria.subcategorias) {
                subcategoriasArr.push({
                    subcategoriaCatalogoId: subcat.subcategoriaCatalogoId,
                    vacios: 0,
                    llenos: subcat.llenos
                });
            }
            categoriasArr.push({
                categoriaCatalogoId: categoria.categoriaCatalogoId,
                vacios: 0,
                llenos: categoria.llenos,
                subcategorias: subcategoriasArr
            });
        }
        await BICilindro.create({
            clienteId: biCilindro.clienteId,
            direccionId: biCilindro.direccionId,
            vacios: 0,
            llenos: biCilindro.llenos,
            categorias: categoriasArr
        });
    }
}*/

const cleanVentas = async () => {
    // Borra todas las rutas de despacho
    await RutaDespacho.deleteMany({});
    // Borra todos los detalles de venta
    await DetalleVenta.deleteMany({});
    // Borra todas las ventas
    await Venta.deleteMany({});
}