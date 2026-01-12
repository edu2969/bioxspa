import { NextRequest, NextResponse } from 'next/server';
import RutaDespacho from '@/models/rutaDespacho';
import Venta from '@/models/venta';
import DetalleVenta from '@/models/detalleVenta';
import SubcategoriaCatalogo from '@/models/subcategoriaCatalogo';
import CategoriaCatalogo from '@/models/categoriaCatalogo';
import { connectMongoDB } from '@/lib/mongodb';
import { IVentaEnTransito } from '@/types/types';
import { IRutaDespacho } from '@/types/rutaDespacho';

export async function GET(request: NextRequest) {
    try {
        await connectMongoDB();
        
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ error: 'rutaId is required' }, { status: 400 });
        }
        
        const ruta = await RutaDespacho.findById(rutaId).select('ventaIds').lean<IRutaDespacho>();
        
        if (!ruta || !ruta.ventaIds?.length) {
            return NextResponse.json({ error: 'Ruta not found or no ventas' }, { status: 404 });
        }

        // Obtener las ventas usando los ventaIds de la ruta
        const ventas = await Venta.find({ _id: { $in: ruta.ventaIds } })
            .populate({
                path: 'clienteId',
                select: 'nombre telefono'
            })
            .lean();

        // Obtener los detalles para cada venta con las poblaciones necesarias
        const ventasConDetalles = await Promise.all(
            ventas.map(async (venta: any) => {
                const detalles = await DetalleVenta.find({ ventaId: venta._id })
                    .populate({
                        path: 'subcategoriaCatalogoId',
                        model: SubcategoriaCatalogo,
                        select: 'cantidad unidad sinSifon categoriaCatalogoId',
                        populate: {
                            path: 'categoriaCatalogoId',
                            model: CategoriaCatalogo,
                            select: 'elemento esIndustrial esMedicinal'
                        }
                    })
                    .lean();
                
                return {
                    ...venta,
                    detalles
                };
            })
        );
        
        const ventasEnTransito: IVentaEnTransito[] = ventasConDetalles.map((venta: any) => ({
            ventaId: String(venta._id),
            tipo: venta.tipo,
            estado: venta.estado,
            fecha: venta.fecha,
            nombreCliente: venta.clienteId?.nombre || '',
            telefonoCliente: venta.clienteId?.telefono || '',
            comentario: venta.comentario,
            detalles: venta.detalles.map((detalle: any) => ({
                multiplicador: detalle.cantidad,
                cantidad: detalle.subcategoriaCatalogoId?.cantidad || 0,
                elemento: detalle.subcategoriaCatalogoId?.categoriaCatalogoId?.elemento || '',
                unidad: detalle.subcategoriaCatalogoId?.unidad || '',
                esIndustrial: detalle.subcategoriaCatalogoId?.categoriaCatalogoId?.esIndustrial || false,
                esMedicinal: detalle.subcategoriaCatalogoId?.categoriaCatalogoId?.esMedicinal || false,
                sinSifon: detalle.subcategoriaCatalogoId?.sinSifon || false
            }))
        }));
        
        return NextResponse.json({ ok: true, ventasEnTransito });
        
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}