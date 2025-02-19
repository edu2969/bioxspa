import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Sucursal from "@/models/sucursal";
import Venta from "@/models/venta";
import BiPrincipal from "@/models/biPrincipal";
import Cliente from "@/models/cliente";
import dayjs from "dayjs";
import DetalleVenta from "@/models/detalleVenta";

export async function GET(req) {
    console.log("Building BI-Principal v1.34...");
    const startTime = dayjs();
    await connectMongoDB();

    const ventas = await Venta.find({ fecha: { $gt: dayjs().month(0).year(2024).toDate() }}).lean();
    const clienteIds = ventas.map(venta => venta.clientes_id);
    const clientes = await Cliente.find({ id: { $in: clienteIds }}).lean();
    const sucursalIds = ventas.map(venta => venta.sucursales_id);
    const sucursales = await Sucursal.find({ id : { $in: sucursalIds }}).lean();
    const clienteMap = new Map(clientes.map(cliente => [cliente.id, cliente._id]));
    const sucursalMap = new Map(sucursales.map(sucursal => [`${sucursal.id}`, sucursal._id]));

    const biregs = [];
    ventas.forEach((venta, index) => {
        const { sucursales_id, clientes_id, valor_total, fecha, arriendo, porcobrar } = venta;
        const detalles = DetalleVenta.find({ ventas_id: venta.id }).lean();
        process.stdout.write(`Processing ${index + 1}/${ventas.length} --- ${sucursales_id}           \r`);
        if (valor_total > 0) {
            ["M", "A"].forEach(periodo => {
                const periodName = periodo === "M" ? "month" : "date";
                const clienteId = clienteMap.get(clientes_id);
                const sucursalId = sucursalMap.get(sucursales_id);
                const startOfPeriod = dayjs(fecha).startOf(periodName).toDate();
                const existingIndex = biregs.findIndex(b => b.sucursalId === sucursalId 
                    && b.clienteId === clienteId && b.periodo === periodo 
                    && b.fecha.getTime() === startOfPeriod.getTime());
                if (existingIndex === -1) {
                    biregs.push({
                        sucursalId: sucursalId,
                        clienteId: clienteId,
                        fecha: startOfPeriod,
                        periodo: periodo,
                        montoAdeudado: (porcobrar ?? "no").toLowerCase() == "si" ? valor_total : 0,
                        montoVendido: valor_total,
                        montoArrendado: (arriendo ?? "no").toLowerCase() == "si" ? valor_total : 0,
                        m3Vendidos: 0,
                        m3Arrendados: 0,
                        m3PorEnvasar: 0,
                        cantidadCilindrosPrestados: 0,
                        cantidadCilindrosCliente: 0,
                        estado: 0,
                    });
                } else {
                    biregs[existingIndex].montoVendido += valor_total;
                    biregs[existingIndex].montoAdeudado += (porcobrar ?? "no").toLowerCase() == "si" ? valor_total : 0;
                    // TODO falta calcular el resto de los atributos de la vista principal
                }
            });
        }
    });

    console.log("BUILDED", biregs.length, "regs");

    /*for(var i=0; i<10; i++) {
        console.log((i + 1) + ".", JSON.stringify(biregs[i]));
    }

    return NextResponse.json({ message: 'BI-Ventas generado correctamente' });*/

    try {
        await BiPrincipal.insertMany(biregs);
        const endTime = dayjs();
        console.log('BI-Principal generado correctamente el ' + endTime.format("DD/MM HH:mm") + ' en ' + endTime.diff(startTime, 'millisecond') + 'ms');
        return NextResponse.json({ message: 'BI-Principal generado correctamente el ' + endTime.format("DD/MM HH:mm") + ' en ' + endTime.diff(startTime, 'millisecond') + 'ms' });
    } catch (error) {
        return NextResponse.json({ message: 'Error al resumir la vista principal', error: error.message });
    }


}