import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_RUTA_DESPACHO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import Direccion from "@/models/direccion";
import ItemCatalogo from "@/models/itemCatalogo";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import { IHistorialVentaView } from "@/types/types";
import { IVenta } from "@/types/venta";
import { IRutaDespacho } from "@/types/rutaDespacho";

const getEstadoVentaNombre = (estado: number): string => {
    const estadosMap: Record<number, string> = {
        [TIPO_ESTADO_VENTA.borrador]: "Borrador",
        [TIPO_ESTADO_VENTA.por_asignar]: "Por asignar",
        [TIPO_ESTADO_VENTA.cotizacion]: "Cotización",
        [TIPO_ESTADO_VENTA.ot]: "Orden de trabajo",
        [TIPO_ESTADO_VENTA.preparacion]: "Preparación",
        [TIPO_ESTADO_VENTA.reparto]: "En reparto",
        [TIPO_ESTADO_VENTA.entregado]: "Entregado",
        [TIPO_ESTADO_VENTA.rechazado]: "Rechazado",
        [TIPO_ESTADO_VENTA.anulado]: "Anulado",
        [TIPO_ESTADO_VENTA.pagado]: "Pagado",
        [TIPO_ESTADO_VENTA.cerrado]: "Cerrado"
    };
    return estadosMap[estado] || `Estado ${estado}`;
};

const getEstadoRutaNombre = (estado: number): string => {
    const estadosMap: Record<number, string> = {
        [TIPO_ESTADO_RUTA_DESPACHO.preparacion]: "Preparación",
        [TIPO_ESTADO_RUTA_DESPACHO.orden_cargada]: "Orden cargada",
        [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada]: "Orden confirmada",
        [TIPO_ESTADO_RUTA_DESPACHO.checklist_vehiculo]: "Checklist vehículo",
        [TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino]: "Selección destino",
        [TIPO_ESTADO_RUTA_DESPACHO.en_ruta]: "En ruta",
        [TIPO_ESTADO_RUTA_DESPACHO.descarga]: "Descarga",
        [TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada]: "Descarga confirmada",
        [TIPO_ESTADO_RUTA_DESPACHO.carga]: "Carga",
        [TIPO_ESTADO_RUTA_DESPACHO.carga_confirmada]: "Carga confirmada",
        [TIPO_ESTADO_RUTA_DESPACHO.retirado]: "Retirado",
        [TIPO_ESTADO_RUTA_DESPACHO.regreso]: "Regreso",
        [TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado]: "Regreso confirmado",
        [TIPO_ESTADO_RUTA_DESPACHO.terminado]: "Terminado",
        [TIPO_ESTADO_RUTA_DESPACHO.cancelado]: "Cancelado",
        [TIPO_ESTADO_RUTA_DESPACHO.a_reasignar]: "A reasignar",
        [TIPO_ESTADO_RUTA_DESPACHO.anulado]: "Anulado"
    };
    return estadosMap[estado] || `Estado ${estado}`;
};

const calcularDuracion = (fechaActual: Date, fechaSiguiente?: Date): number => {
    const diff = fechaSiguiente ? 
        fechaSiguiente.getTime() - fechaActual.getTime() : 
        Date.now() - fechaActual.getTime();
    
    return Math.round(diff / 1000);
};

export async function GET(request: NextRequest) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    if (!mongoose.models.ItemCatalogo) {
        mongoose.model("ItemCatalogo", ItemCatalogo.schema);
    }
    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.Vehiculo) {
        mongoose.model("Vehiculo", Vehiculo.schema);
    }

    const { searchParams } = new URL(request.url);
    const ventaId = searchParams.get("ventaId");
    if (!ventaId) {
        return NextResponse.json({ error: "Falta el parámetro 'ventaId'" }, { status: 400 });
    }
    
    const venta = await Venta.findById(ventaId).lean<IVenta>();
    if (!venta) {
        return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    
    const rutaDespacho = await RutaDespacho.findOne({ ventas: ventaId }).lean<IRutaDespacho>();
    
    const historialVenta: IHistorialVentaView[] = venta.historialEstados?.map((he, index) => {
        const fechaSiguiente = index < (venta.historialEstados?.length || 0) - 1 ? 
            venta.historialEstados?.[index + 1]?.fecha : undefined;
        
        return {
            estado: he.estado,
            fecha: he.fecha,
            duracion: calcularDuracion(he.fecha, fechaSiguiente),
            titulo: getEstadoVentaNombre(he.estado),
            subtitulo: "Estado de venta",
            descripcion: '??'
        };
    }) || [];

    const historialRuta: IHistorialVentaView[] = rutaDespacho?.historialEstado?.map((he, index) => {
        const fechaSiguiente = index < (rutaDespacho.historialEstado?.length || 0) - 1 ? 
            rutaDespacho.historialEstado?.[index + 1]?.fecha : undefined;
            
        return {
            estado: he.estado,
            fecha: he.fecha,
            duracion: calcularDuracion(he.fecha, fechaSiguiente),
            titulo: getEstadoRutaNombre(he.estado),
            subtitulo: "Estado de ruta",
            descripcion: getEstadoRutaNombre(he.estado)
        };
    }) || [];

    const historial = [...historialVenta, ...historialRuta]
        .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    
    return NextResponse.json({ historial });
}
        