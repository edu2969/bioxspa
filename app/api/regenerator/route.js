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

export async function GET(request) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    const { searchParams } = new URL(request.url);
    const rv = searchParams.get("rv");
    const mv = searchParams.get("mv");
    const bi = searchParams.get("bi");

    if (rv === "true") {
        console.log("Starting migration...");
        await resetVentas();
        console.log("Migration completed successfully");
    }

    if (mv === "true") {
        console.log("Starting migration ventas...");
        await migrateVentas();
        console.log("Migration ventas completed successfully");
    }

    if(bi === "true") {
        console.log("Starting migration generateBIDeudas...");
        await generateBIDeudas();
        console.log("Migration generateBIDeudas completed successfully");
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
        fecha: { $gte: new Date('2025-01-01') }
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

