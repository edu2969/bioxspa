import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import XategoriaProducto from "@/models/xategoriaProducto";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import XubcategoriaProducto from "@/models/xubcategoriaProducto";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import Xroducto from "@/models/xroducto";
import ProductoCliente from "@/models/productoclientes";
import Precio from "@/models/precio";
import Xliente from "@/models/xliente";
import Xser from "../../../models/xser";
import Cliente from "@/models/cliente";
import RegistroComision from "@/models/registro_comision";
import Comision from "@/models/comision";
import User from "@/models/user";
import UserClienteComision from "@/models/userclientecomision";
import HistorialAumentoPrecio from "@/models/historialAumentoPrecio";
import Trabajador from "../../../models/trabajador";
import { TIPO_COMISION, TIPO_PRECIO, TIPO_UNIDAD_COMISION, USER_ROLE } from "@/app/utils/constants";

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

    /*console.log("Converting items array...");
    await itemsArryConvert();
    console.log("Items array converted");*/

    /*console.log("Building precios collection...");
    await buildPreciosCollection();
    console.log("Precios collection built");*/

    /*console.log("Migrating users...");
    await migrateUsers();
    console.log("Users migrated");

    console.log("Completing clientes...");
    await completeClientes();
    console.log("clientes completed");
    
    */

    console.log("Updating user comisiones...");
    await updateUserComisiones();
    console.log("User comisiones updated");

    console.log("Migrating comisiones...");
    await migrateComisions();
    console.log("Comisiones migrated");

    console.log("Creating extra comisiones...");
    await crearComisionesExtras();
    console.log("Extra comisiones created");

    return NextResponse.json({ message: "Success migrate and improve" });
}

const crearComisionesExtras = async () => {
    const trabajadores = await Trabajador.find();
    console.log(`Found ${trabajadores.length} trabajadores`);

    for (const trabajador of trabajadores) {
        const user = await User.findOne({ temporalId: trabajador.users_id });
        if (!user) {
            console.log(`User not found for trabajador ${trabajador._id}`);
            continue;
        }

        if (trabajador.comision_retirado) {
            const retiroComision = new Comision({
                userId: user._id,
                clienteId: null,
                sucursalId: null,
                dependenciaId: null,
                fechaDesde: trabajador.fecha_ingreso,
                fechaHasta: null,
                tipo: TIPO_COMISION.retiro,
                valor: parseFloat(trabajador.comision_retirado),
                unidad: TIPO_UNIDAD_COMISION.monto
            });
            await retiroComision.save();
            console.log(`Created retiro comision for trabajador ${trabajador._id}`);
        }

        if (trabajador.comision_vendido) {
            const entregaComision = new Comision({
                userId: user._id,
                clienteId: null,
                sucursalId: null,
                dependenciaId: null,
                fechaDesde: trabajador.fecha_ingreso,
                fechaHasta: null,
                tipo: TIPO_COMISION.entrega,
                valor: parseFloat(trabajador.comision_vendido),
                unidad: TIPO_UNIDAD_COMISION.monto
            });
            await entregaComision.save();
            console.log(`Created entrega comision for trabajador ${trabajador._id}`);
        }
    }
}


const completeClientes = async () => {
    const xlientes = await Xliente.find();
    console.log(`Found ${xlientes.length} xlientes`);

    for (const xliente of xlientes) {
        const cliente = await Cliente.findOne({ rut: xliente.rut });
        if (!cliente) {
            const newCliente = new Cliente({
                temporalId: xliente.id,
                creadorId: null,
                nombre: xliente.nombre,
                rut: xliente.rut,
                direccionId: null,
                giro: xliente.giro,
                telefono: xliente.telefono,
                email: xliente.email,
                emailIntercambio: xliente.email_intercambio,
                envioFactura: xliente.envio_factura === 'true',
                envioReporte: xliente.envio_reporte === 'true',
                seguimiento: xliente.seguimiento === 'true',
                ordenCompra: xliente.orden_compra === 'true',
                reporteDeuda: xliente.reporte_deuda === 'true',
                arriendo: xliente.arriendo === 'true',
                dias_de_pago: parseInt(xliente.dias_de_pago) || 1,
                notificacion: xliente.notificacion === 'true',
                credito: xliente.credito === 'true',
                urlWeb: xliente.web,
                comentario: xliente.comentario,
                contacto: xliente.contacto,
                tipoPrecio: parseInt(xliente.tipoprecio === "Mayorista" ? TIPO_PRECIO.mayorista : TIPO_PRECIO.minorista),
                documentoTributarioId: null,
                activo: xliente.activo === 'true',
                cilindrosMin: xliente.cilindrosminimo,
                cilindrosMax: parseInt(xliente.limite_cilindros) || 9999,
                enQuiebra: xliente.quiebra === 'true',
                mesesAumento: xliente.mesesaumento ? xliente.mesesaumento.split(',').map(Number) : null,
                createdAt: xliente.created_at,
                updatedAt: xliente.updated_at,
            });
            await newCliente.save();
            console.log(`Created new Cliente for xliente ${xliente.id}`);
        } else {
            cliente.temporalId = xliente.id;
            await cliente.save();
            console.log(`Updated Cliente ${cliente._id} with temporalId ${xliente.id}`);
        }
    }
}

const migrateComisions = async () => {
    const userClienteComisiones = await UserClienteComision.find();
    console.log(`Found ${userClienteComisiones.length} userClienteComisiones`);

    for (const userClienteComision of userClienteComisiones) {
        const cliente = await Cliente.findOne({ temporalId: userClienteComision.clientes_id });
        if (!cliente) {
            console.log(`Cliente not found for xliente ${userClienteComision.clientes_id}`);
            continue;
        }

        const user = await User.findOne({ temporalId: userClienteComision.users_id });
        if (!user) {
            console.log(`User not found for userClienteComision ${userClienteComision.users_id}`);
            continue;
        }

        const newComision = new Comision({
            userId: user._id,
            clienteId: cliente._id,
            sucursalId: null,
            dependenciaId: null,
            fechaDesde: userClienteComision.desde,
            fechaHasta: userClienteComision.hasta,
            tipo: TIPO_COMISION.nuevoCliente,
            valor: userClienteComision.comision,
            unidad: TIPO_UNIDAD_COMISION.porcentaje
        });

        const xser = await Xser.findOne({ id: userClienteComision.users_id });
        if (!xser) {
            console.log(`Xser not found for id ${userClienteComision.users_id}`);
            continue;
        }

        if (xser.comi_retiro !== "0") {
            const retiroComision = new Comision({
            userId: user._id,
            clienteId: cliente._id,
            sucursalId: null,
            dependenciaId: null,
            fechaDesde: userClienteComision.desde,
            fechaHasta: userClienteComision.hasta,
            tipo: TIPO_COMISION.retiro,
            valor: parseFloat(xser.comi_retiro),
            unidad: TIPO_UNIDAD_COMISION.monto
            });
            await retiroComision.save();
            console.log(`Created retiro comision for user ${user._id}`);
        }

        if (xser.comi_entrega !== "0") {
            const entregaComision = new Comision({
            userId: user._id,
            clienteId: cliente._id,
            sucursalId: null,
            dependenciaId: null,
            fechaDesde: userClienteComision.desde,
            fechaHasta: userClienteComision.hasta,
            tipo: TIPO_COMISION.entrega,
            valor: parseFloat(xser.comi_entrega),
            unidad: TIPO_UNIDAD_COMISION.monto
            });
            await entregaComision.save();
            console.log(`Created entrega comision for user ${user._id}`);
        }

        if (xser.comi_punto_vta !== "0") {
            const puntoVentaComision = new Comision({
            userId: user._id,
            clienteId: cliente._id,
            sucursalId: null,
            dependenciaId: null,
            fechaDesde: userClienteComision.desde,
            fechaHasta: userClienteComision.hasta,
            tipo: TIPO_COMISION.puntoVenta,
            valor: parseFloat(xser.comi_punto_vta),
            unidad: TIPO_UNIDAD_COMISION.porcentaje
            });
            await puntoVentaComision.save();
            console.log(`Created punto de venta comision for user ${user._id}`);
        }

        await newComision.save();
        console.log(`Migrated userClienteComision ${userClienteComision._id} to comision ${newComision._id}`);
    }
}

const updateUserComisiones = async () => {
    const registrosComision = await RegistroComision.find();

    const totalRegistros = registrosComision.length;
    let processedRegistros = 0;

    for (const registro of registrosComision) {
        const tc = registro.tipo_comision;
        const tipoComision = tc === "0" ? 0 : tc === "Chofer" ?
            TIPO_COMISION.chofer : tc === "Punto de venta" ?
                TIPO_COMISION.puntoVenta : TIPO_COMISION.nuevoCliente;
        if (tipoComision == 0) {
            console.log(`Ignoring registroComision ${registro.id} with tipo_comision ${registro.tipo_comision}`);
            continue;
        }

        const xliente = await Xliente.findOne({ id: registro.clientes_id });
        if (!xliente) {
            console.log(`Xliente not found for registroComision ${registro.id} clienteId ${registro.clientes_id}`);
            continue;
        }

        const cliente = await Cliente.findOne({ rut: xliente.rut });
        if (!cliente) {
            console.log(`Cliente not found for xliente ${xliente._id}`);
            continue;
        }

        const xser = await Xser.findOne({ id: registro.users_id });
        if (!xser) {
            console.log(`Xser not found for registroComision ${registro.id} users_id ${registro.users_id}`);
            continue;
        }

        const user = await User.findOne({ email: xser.email });
        if (!user) {
            console.log(`User not found for xser ${xser._id}`);
            continue;
        }

        const newComision = new Comision({
            userId: user._id,
            clienteId: cliente._id,
            sucursalId: null,
            dependenciaId: null,
            fechaDesde: registro.created_at,
            fechaHasta: registro.updated_at,
            tipo: tipoComision,
            valor: parseFloat(registro.porcentaje_comision || registro.valor_comision),
            unidad: registro.porcentaje_comision ? TIPO_UNIDAD_COMISION.porcentaje : TIPO_UNIDAD_COMISION.monto
        });

        await newComision.save();

        processedRegistros++;
        const progress = ((processedRegistros / totalRegistros) * 100).toFixed(2);
        console.log(`Progress: ${progress}% (${processedRegistros}/${totalRegistros})`);
    }
}

const buildPreciosCollection = async () => {
    const historialAumentoPrecios = await HistorialAumentoPrecio.find();
    console.log(`Found ${historialAumentoPrecios.length} historialAumentoPrecios`);

    for (const historial of historialAumentoPrecios) {
        const user = await User.findOne({ temporalId: historial.users_id });
        if (!user) {
            console.log(`User not found for historial ${historial._id}`);
            continue;
        }

        const productoCliente = await ProductoCliente.findOne({ id: historial.productos_clientes_id });
        if (!productoCliente) {
            console.log(`ProductoCliente not found for historial ${historial._id}`);
            continue;
        }

        const subcategoria = await SubcategoriaCatalogo.findOne({ temporalId: productoCliente.subcategoria_id });
        if (!subcategoria) {
            console.log(`SubcategoriaCatalogo not found for productoCliente ${productoCliente._id}`);
            continue;
        }

        const itemCatalogo = await ItemCatalogo.findOne({ subcategoriaCatalogoId: subcategoria._id });
        if (!itemCatalogo) {
            console.log(`ItemCatalogo not found for subcategoria ${subcategoria._id}`);
            continue;
        }

        const cliente = await Cliente.findOne({ temporalId: productoCliente.clientes_id });
        if (!cliente) {
            console.log(`Cliente not found for productoCliente ${productoCliente._id}`);
            continue;
        }

        const existingPrecio = await Precio.findOne({ itemCatalogoId: itemCatalogo._id, userId: user._id, clienteId: cliente._id });
        if (existingPrecio) {
            existingPrecio.historial.push({
                valor: historial.valor_anterior,
                fechaDesde: existingPrecio.fechaDesde,
                fechaHasta: existingPrecio.fechaHasta,
                varianza: ((historial.valor_nuevo - historial.valor_anterior) / historial.valor_anterior) * 100
            });
            existingPrecio.valor = historial.valor_nuevo;
            existingPrecio.varianza = ((historial.valor_nuevo - historial.valor_anterior) / historial.valor_anterior) * 100;
            existingPrecio.fechaDesde = historial.created_at;
            existingPrecio.fechaHasta = historial.updated_at;
            await existingPrecio.save();
            console.log(`Updated Precio ${existingPrecio._id} with new historial`);
        } else {
            const newPrecio = new Precio({                
                itemCatalogoId: itemCatalogo._id,
                userId: user._id,
                clienteId: cliente._id,
                valorBruto: historial.valor_nuevo,
                impuesto: 0, // Assuming no impuesto data available
                moneda: "CLP", // Assuming default currency
                varianza: ((historial.valor_nuevo - historial.valor_anterior) / historial.valor_anterior) * 100,
                valor: historial.valor_nuevo,
                fechaDesde: historial.created_at,
                fechaHasta: historial.updated_at,
                historial: []
            });
            await newPrecio.save();
            console.log(`Created new Precio ${newPrecio._id}`);
        }
    }
}

const itemsArryConvert = async () => {
    const items = await ItemCatalogo.find();
    console.log(`Found ${items.length} items`);
    for (const item of items) {
        if (item.subcategoriaCatalogoId) {
            item.subcategoriaCatalogoIds = [item.subcategoriaCatalogoId];
            await item.save();
            console.log(`Updated item ${item._id} with subcategoriaCatalogoIds`);
        }
    }
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

const migrateUsers = async () => {
    const xsers = await Xser.find();
    console.log(`Found ${xsers.length} xsers`);

    for (const xser of xsers) {
        const existingUser = await User.findOne({ email: xser.email });
        if (!existingUser) {
            const newUser = new User({
                temporalId: xser.id,
                name: xser.nombre || "DESCONOCIDO",
                email: xser.email,
                password: xser.password,
                personaId: null,
                role: USER_ROLE.conductor,
                active: xser.activo === 'si',
                createdAt: xser.created_at,
                updatedAt: xser.updated_at,
            });
            await newUser.save();
            console.log(`Created new User for xser ${xser.id}`);
        } else {
            existingUser.temporalId = xser.id;
            existingUser.name = xser.nombre;
            existingUser.password = xser.password;
            existingUser.role = USER_ROLE.conductor;
            existingUser.active = xser.activo === 'si';
            existingUser.updatedAt = xser.updated_at;
            await existingUser.save();
            console.log(`Updated User ${existingUser._id} with temporalId ${xser.id}`);
        }
    }
}