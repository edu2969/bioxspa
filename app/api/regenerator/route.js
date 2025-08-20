import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import DetalleVenta from "@/models/detalleVenta";
import Xenta from "@/models/xenta";
import Cliente from "@/models/cliente";
import DocumentoTributario from "@/models/documentoTributario";
import User from "@/models/user";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import BIDeuda from "@/models/biDeuda";
import Sucursal from "@/models/sucursal";
import XetalleVenta from "@/models/xetalleVenta";
import Xroducto from "@/models/xroducto";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";

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

    if (q === "mv") {
        console.log("Starting migration ventas...");
        await migrateVentas();
        console.log("Migration ventas completed successfully");
    }

    if(q === "bi") {
        console.log("Starting migration generateBIDeudas...");
        await generateBIDeudas();
        console.log("Migration generateBIDeudas completed successfully");
    }

    if(q === "fv") {
        console.log("Starting fixing Ventas...");
        await fixingVentas();
        console.log("Fixing Ventas completed successfully");
    }

    if(q === "mdv") {
        console.log("Starting migrateDetalleVentas...");
        await migrateDetalleVentas();
        console.log("Migration migrateDetalleVentas completed successfully");
    }

    if(q === "cdv") {
        console.log("Starting cleanDetalleVentas...");
        await cleanDetalleVentas();
        console.log("CleanDetalleVentas completed successfully");
    }

    if(q === "cdv2") {
        console.log("Starting completeDetalleVentas...");
        await completeDetalleVentas();
        console.log("CompleteDetalleVentas completed successfully");
    }

    if (q === "lv") {
        console.log("Starting limpiarVentas...");
        await limpiarVentas();
        console.log("LimpiarVentas completed successfully");
    }

    return NextResponse.json({ message: "Success migrate and improve" });
}

const resetVentas = async () => {
    await Venta.deleteMany({});
    await RutaDespacho.deleteMany({});
    await DetalleVenta.deleteMany({});
}

const migrateVentas = async () => {
    const xentas = await Xenta.find({});
    const total = xentas.length;
    let processed = 0;

    for (const xenta of xentas) {
        // Buscar cliente por temporalId
        const cliente = await Cliente.findOne({ temporalId: xenta.clientes_id });
        if (!cliente) {
            processed++;
            continue;
        }

        // Buscar documento tributario por temporalId
        const documentoTributario = await DocumentoTributario.findOne({ temporalId: xenta.documentotributario_id });
        if (!documentoTributario) {
            processed++;
            continue;
        }

        // Buscar vendedor por temporalId
        let vendedor = null;
        if (xenta.vendedor) {
            vendedor = await User.findOne({ temporalId: xenta.vendedor });
        }

        // Tomar la primera dirección de despacho del cliente
        let direccionDespachoId = null;
        if (cliente.direccionesDespacho && cliente.direccionesDespacho.length > 0) {
            direccionDespachoId = cliente.direccionesDespacho[0].direccionId;
        }

        // Calcular estado de la venta desde string
        let estadoStr = (xenta.estado || "").toLowerCase();
        let estadoVenta = TIPO_ESTADO_VENTA.borrador; // default

        if (estadoStr === "entregado") {
            estadoVenta = TIPO_ESTADO_VENTA.entregado;
        } else if (estadoStr === "ot") {
            estadoVenta = TIPO_ESTADO_VENTA.ot;
        } else if (estadoStr === "cotizacion") {
            estadoVenta = TIPO_ESTADO_VENTA.cotizacion;
        } else if (estadoStr === "borrador") {
            estadoVenta = TIPO_ESTADO_VENTA.borrador;
        }

        // Datos de la venta
        const ventaData = {
            temporalId: xenta.id,
            clienteId: cliente._id,
            codigo: xenta.codigo,
            vendedorId: vendedor ? vendedor._id : null,
            fecha: new Date(xenta.fecha),
            estado: estadoVenta,
            porCobrar: xenta.porcobrar?.toLowerCase() === "si",
            valorNeto: Number(xenta.valor_neto),
            valorExento: Number(xenta.valor_exento),
            valorIva: Number(xenta.valor_iva),
            valorBruto: Number(xenta.valor_bruto),
            valorTotal: Number(xenta.valor_total),
            numeroDocumento: xenta.numdoc,
            numeroVale: xenta.num_vale,
            documentoTributarioId: documentoTributario._id,
            direccionDespachoId,
            tasaImpuesto: Number(xenta.tasaimp),
            tieneOT: xenta.ot?.toLowerCase() === "si",
            tieneArriendo: xenta.arriendo?.toLowerCase() === "si",
            controlEnvase: xenta.control_envase,
            medioDespacho: xenta.medio_despacho,
            numeroTraslado: xenta.numerotraslado,
            cantidadConsultasSII: Number(xenta.cant_consultas_sii),
            cantidadReenviosSII: Number(xenta.cant_reenvios_sii) || 0,
            comentario: xenta.comentario || "",
        };

        // Actualizar si existe, crear si no
        await Venta.findOneAndUpdate(
            { temporalId: xenta.id },
            ventaData,
            { upsert: true, new: true }
        );

        processed++;
        if (processed % 1000 === 0 || processed === total) {
            const percent = ((processed / total) * 100).toFixed(2);
            console.log(`Avance: ${processed}/${total} (${percent}%)`);
        }
    }
}

const generateBIDeudas = async () => {
    // Obtener los documentos tributarios que tienen venta: true
    const documentosVenta = await DocumentoTributario.find({ venta: true });
    const documentoVentaIds = documentosVenta.map(doc => doc._id);

    // Buscar ventas entregadas, por cobrar, y con documentoTributarioId de venta
    const ventas = await Venta.find({
        estado: TIPO_ESTADO_VENTA.entregado,
        porCobrar: true,
        documentoTributarioId: { $in: documentoVentaIds },
        valorTotal: { $gt: 0 },
        fecha: { $gte: new Date('2024-01-01') }
    });

    const sucursales = await Sucursal.find({});
    const sucursalMap = {};
    sucursales.forEach(s => { sucursalMap[s._id.toString()] = s; });

    const acumulados = {};

    for (const venta of ventas) {
        const clienteId = venta.clienteId ? venta.clienteId.toString() : "";
        const sucursalId = venta.sucursalId ? venta.sucursalId.toString() : "";
        const fecha = venta.fecha;
        const monto = venta.valorTotal;

        // Helper to get period keys
        const getPeriodKey = (date, type) => {
            const d = new Date(date);
            if (type === 'D') {
                return d.toISOString().slice(0, 10); // YYYY-MM-DD
            } else if (type === 'S') {
                const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
                const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                return `${d.getFullYear()}-W${week}`;
            } else if (type === 'M') {
                return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            } else if (type === 'A') {
                return `${d.getFullYear()}`;
            }
            return '';
        };

        for (const periodo of ['D', 'S', 'M', 'A']) {
            const periodKey = getPeriodKey(fecha, periodo);

            // 1. Acumulado por cliente y sucursal
            const key1 = `${clienteId}_${sucursalId}_${periodKey}_${periodo}`;
            if (!acumulados[key1]) {
                acumulados[key1] = {
                    sucursalId: sucursalId || undefined,
                    clienteId: clienteId || undefined,
                    monto: 0,
                    fecha: fecha,
                    periodo: periodo,
                    lastVentaId: venta._id,
                    ventasPorCobrar: 0
                };
            }
            acumulados[key1].monto += monto;
            acumulados[key1].ventasPorCobrar += 1;
            if (fecha > acumulados[key1].fecha) {
                acumulados[key1].fecha = fecha;
                acumulados[key1].lastVentaId = venta._id;
            }

            // 2. Acumulado de todos los clientes (clienteId vacío)
            const key2 = `_${sucursalId}_${periodKey}_${periodo}`;
            if (!acumulados[key2]) {
                acumulados[key2] = {
                    sucursalId: sucursalId || undefined,
                    clienteId: undefined,
                    monto: 0,
                    fecha: fecha,
                    periodo: periodo,
                    lastVentaId: venta._id,
                    ventasPorCobrar: 0
                };
            }
            acumulados[key2].monto += monto;
            acumulados[key2].ventasPorCobrar += 1;
            if (fecha > acumulados[key2].fecha) {
                acumulados[key2].fecha = fecha;
                acumulados[key2].lastVentaId = venta._id;
            }

            // 3. Acumulado de todas las sucursales (sucursalId vacío)
            const key3 = `${clienteId}__${periodKey}_${periodo}`;
            if (!acumulados[key3]) {
                acumulados[key3] = {
                    sucursalId: undefined,
                    clienteId: clienteId || undefined,
                    monto: 0,
                    fecha: fecha,
                    periodo: periodo,
                    lastVentaId: venta._id,
                    ventasPorCobrar: 0
                };
            }
            acumulados[key3].monto += monto;
            acumulados[key3].ventasPorCobrar += 1;
            if (fecha > acumulados[key3].fecha) {
                acumulados[key3].fecha = fecha;
                acumulados[key3].lastVentaId = venta._id;
            }

            // 4. Acumulado global (clienteId y sucursalId vacíos)
            const key4 = `__${periodKey}_${periodo}`;
            if (!acumulados[key4]) {
                acumulados[key4] = {
                    sucursalId: undefined,
                    clienteId: undefined,
                    monto: 0,
                    fecha: fecha,
                    periodo: periodo,
                    lastVentaId: venta._id,
                    ventasPorCobrar: 0
                };
            }
            acumulados[key4].monto += monto;
            acumulados[key4].ventasPorCobrar += 1;
            if (fecha > acumulados[key4].fecha) {
                acumulados[key4].fecha = fecha;
                acumulados[key4].lastVentaId = venta._id;
            }
        }
    }

    // Guarda los acumulados en BIDeuda
    const docs = Object.values(acumulados);
    for (const doc of docs) {
        await BIDeuda.findOneAndUpdate(
            {
                sucursalId: doc.sucursalId || null,
                clienteId: doc.clienteId || null,
                periodo: doc.periodo,
                fecha: doc.fecha
            },
            doc,
            { upsert: true, new: true }
        );
    }
}

const fixingVentas = async () => {
    // Solo buscar ventas que tengan numeroVale o cumplan las condiciones de saldo
    const ventas = await Venta.find({
        $or: [
            { numeroVale: { $exists: true, $ne: null } },
            {
                estado: TIPO_ESTADO_VENTA.entregado,
                porCobrar: true,
                valorTotal: { $gt: 0 }
            }
        ]
    });

    for (const venta of ventas) {
        let update = {};

        // Si tiene numeroVale, copiar a numeroDocumento
        if (venta.numeroVale) {
            update.numeroDocumento = venta.numeroVale;
        }

        // Si está entregado, porCobrar true y valorTotal > 0, copiar valorTotal a saldo
        if (
            venta.estado === TIPO_ESTADO_VENTA.entregado &&
            venta.porCobrar === true &&
            venta.valorTotal > 0
        ) {
            update.saldo = venta.valorTotal;
        }

        // Eliminar numeroVale
        update.$unset = { numeroVale: "" };

        // Solo actualizar si hay cambios
        if (Object.keys(update).length > 0) {
            await Venta.updateOne({ _id: venta._id }, update);
        }
    }
}

const migrateDetalleVentas = async () => {
    const ventas = await Venta.find({
        fecha: { 
            $gte: new Date('2024-01-01'),
            $lt: new Date('2025-01-01')
        }
    });
    const totalVentas = ventas.length;
    let processedVentas = 0;

    for (const venta of ventas) {
        const xdetalles = await XetalleVenta.find({ codigo: venta.codigo });

        for (const xdetalle of xdetalles) {
            // Buscar el itemCatalogo por cod_cilindro
            let itemCatalogoId = null;
            if (xdetalle.cod_cilindro) {
                const itemCatalogo = await ItemCatalogo.findOne({ codigo: xdetalle.cod_cilindro });
                if (itemCatalogo) {
                    itemCatalogoId = itemCatalogo._id;
                }
            }
            // Crear el detalleVenta correspondiente, ajustando conversión de tipo numérico/texto
            const detalleVentaData = {
                temporalId: xdetalle.id,                
                ventaId: venta._id,
                itemCatalogoId,
                codigo: xdetalle.codigo || "",
                codigoProducto: xdetalle.codigoproducto || "",
                codigoCilindro: xdetalle.cod_cilindro || null,
                tipo: xdetalle.tipo === "retiro" ? 2 : 1,
                cantidad: typeof xdetalle.cantidad === "string" ? Number(xdetalle.cantidad) : (xdetalle.cantidad || 0),
                especifico: typeof xdetalle.especifico === "string" ? Number(xdetalle.especifico) : (xdetalle.especifico || 0),
                neto: typeof xdetalle.neto === "string" ? Number(xdetalle.neto) : (xdetalle.neto || 0),
                iva: typeof xdetalle.iva === "string" ? Number(xdetalle.iva) : (xdetalle.iva || 0),
                total: typeof xdetalle.total === "string" ? Number(xdetalle.total) : (xdetalle.total || 0)
            };

            console.log("LEÍDO", xdetalle);

            await DetalleVenta.findOneAndUpdate(
                { temporalId: xdetalle.id, ventaId: venta._id },
                detalleVentaData,
                { upsert: true, new: true }
            );
        }

        processedVentas++;
        if (processedVentas % 100 === 0 || processedVentas === totalVentas) {
            const percent = ((processedVentas / totalVentas) * 100).toFixed(2);
            console.log(`Avance DetalleVenta: ${processedVentas}/${totalVentas} (${percent}%)`);
        }
    }
}

const cleanDetalleVentas = async () => {
    const xdetalles = await XetalleVenta.find({ deleted_at: { $ne: null } });
    const total = xdetalles.length;
    let processed = 0;

    for (let i = 0; i < total; i += 1000) {
        const batch = xdetalles.slice(i, i + 1000);
        const ids = batch.map(xdetalle => xdetalle.id);
        await DetalleVenta.deleteMany({ temporalId: { $in: ids } });
        processed += batch.length;
        const percent = ((processed / total) * 100).toFixed(2);
        console.log(`Avance cleanDetalleVentas: ${processed}/${total} (${percent}%)`);
    }
}

const completeDetalleVentas = async () => {
    const ventas = await Venta.find({
        fecha: { 
            $gte: new Date('2024-06-01'),
            $lt: new Date('2025-01-01')
         }
    });
    const totalVentas = ventas.length;
    let processed = 0;

    console.log("A procesar", totalVentas, "ventas");

    for (const venta of ventas) {
        const detalles = await DetalleVenta.find({ ventaId: venta._id });
        let updates = [];

        for (const detalle of detalles) {
            let subcategoriaCatalogoId = null;

            // Buscar el producto por codigoProducto
            const xproducto = await Xroducto.findOne({ id: detalle.codigoProducto });
            if (xproducto && xproducto.subcategoria_id) {
                // Buscar la subcategoriaCatalogo por temporalId igual al subcategoria_id del producto
                const subcatCatalogo = await SubcategoriaCatalogo.findOne({ temporalId: xproducto.subcategoria_id });
                if (subcatCatalogo) {
                    subcategoriaCatalogoId = subcatCatalogo._id;
                } else {
                    console.log(`SubcategoriaCatalogo no encontrada para temporalId: ${xproducto.subcategoria_id}`);
                }
            }

            if (subcategoriaCatalogoId) {
                updates.push({
                    updateOne: {
                        filter: { _id: detalle._id },
                        update: { subcategoriaCatalogoId: subcategoriaCatalogoId }
                    }
                });
            }
        }

        if (updates.length > 0) {
            await DetalleVenta.bulkWrite(updates);
        }

        processed++;
        if (processed % 1000 === 0 || processed === totalVentas) {
            const percent = ((processed / totalVentas) * 100).toFixed(2);
            console.log(`Avance completeDetalleVentas: ${processed}/${totalVentas} (${percent}%)`);
        }
    }
}

const limpiarVentas = async () => {
    const xentasEliminadas = await Xenta.find({ deleted_at: { $ne: null } });
    const total = xentasEliminadas.length;
    let processed = 0;

    for (let i = 0; i < total; i += 1000) {
        const batch = xentasEliminadas.slice(i, i + 1000);
        const temporalIds = batch.map(xenta => xenta.id);

        // Buscar ventas por temporalId
        const ventas = await Venta.find({ temporalId: { $in: temporalIds } });
        const ventaIds = ventas.map(venta => venta._id);

        // Eliminar ventas
        await Venta.deleteMany({ _id: { $in: ventaIds } });

        // Eliminar detalleVentas en cascada
        await DetalleVenta.deleteMany({ ventaId: { $in: ventaIds } });

        processed += batch.length;
        const percent = ((processed / total) * 100).toFixed(2);
        console.log(`Avance limpiarVentas: ${processed}/${total} (${percent}%)`);
    }
}
