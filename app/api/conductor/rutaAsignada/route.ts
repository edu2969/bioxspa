import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import RutaDespacho from '@/models/rutaDespacho';
import Direccion from '@/models/direccion';
import User from '@/models/user';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/utils/authOptions';
import { USER_ROLE, TIPO_ESTADO_RUTA_DESPACHO } from '@/app/utils/constants';
import { IRutaDespacho } from '@/types/rutaDespacho';
import { IUser } from '@/types/user';
import { IRutaConductorView } from '@/types/types';
import { IDireccion } from '@/types/direccion';

export async function GET() {
    try {
        console.log("GET request received for ruta asignada.");
        
        await connectMongoDB();
        console.log("MongoDB connected.");

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log(`Fetching user with ID: ${userId}`);
        
        // Verificar que el usuario existe y es conductor
        const user = await User.findById(userId).lean<IUser>();
        if (!user) {
            console.warn(`User not found for ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        if (user.role !== USER_ROLE.conductor) {
            console.warn(`User ${userId} is not a conductor. Role: ${user.role}`);
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }

        console.log(`Fetching active rutaDespacho for conductor: ${userId}`);
        
        // Buscar ruta de despacho activa para el conductor con población de datos
        const rutaDespacho = await RutaDespacho.findOne({
            choferId: userId,
            estado: { 
                $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion, 
                $lte: TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado 
            }
        })
        .populate({
            path: 'ruta.direccionDestinoId',
            model: 'Direccion'
        })
        .populate({
            path: 'ventaIds',
            model: 'Venta',
            populate: {
                path: 'clienteId',
                model: 'Cliente',
                populate: {
                    path: 'direccionId',
                    model: 'Direccion'
                }
            }
        })
        .lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.log(`No active rutaDespacho found for conductor: ${userId}`);
            return NextResponse.json({ 
                ok: true, 
                rutaId: null,
                message: "No hay ruta activa asignada" 
            });
        }

        console.log(`Found active rutaDespacho ID: ${rutaDespacho._id} with estado: ${rutaDespacho.estado}`);
        
        // Determinar la venta actual basada en la última dirección de la ruta
        let ventaActual = null;
        
        if (rutaDespacho.ventaIds && rutaDespacho.ventaIds.length > 0) {
            if (rutaDespacho.ventaIds.length === 1) {
                // Si solo hay una venta, es la actual
                ventaActual = rutaDespacho.ventaIds[0];
            } else if (rutaDespacho.ruta && rutaDespacho.ruta.length > 0) {
                // Si hay múltiples ventas, buscar la que corresponde a la última dirección de la ruta
                const ultimaDireccionId = rutaDespacho.ruta[rutaDespacho.ruta.length - 1]?.direccionDestinoId?._id;
                
                if (ultimaDireccionId) {
                    ventaActual = rutaDespacho.ventaIds.find(venta => 
                        venta.direccionDespachoId && String(venta.direccionDespachoId._id) === String(ultimaDireccionId)
                    );
                }
                
                // Si no se encuentra por dirección de despacho, usar la primera venta como fallback
                if (!ventaActual) {
                    ventaActual = rutaDespacho.ventaIds[0];
                }
            } else {
                // Si no hay ruta definida, usar la primera venta
                ventaActual = rutaDespacho.ventaIds[0];
            }
        }

        if (!ventaActual) {
            console.log(`No venta found for rutaDespacho: ${rutaDespacho._id}`);
            return NextResponse.json({ 
                ok: true, 
                rutaId: String(rutaDespacho._id),
                estado: rutaDespacho.estado,
                message: "No hay venta asignada en la ruta" 
            });
        }

        // Obtener información de la dirección de despacho
        let direccionDespacho: IDireccion | null = null;
        if (ventaActual.direccionDespachoId) {
            direccionDespacho = await Direccion.findById(ventaActual.direccionDespachoId).lean<IDireccion>();
        }

        // Si no hay dirección de despacho específica, usar la dirección principal del cliente
        const cliente = ventaActual.clienteId;
        let direccionPrincipal = null;
        if (cliente?.direccionId) {
            direccionPrincipal = await Direccion.findById(cliente.direccionId).lean<IDireccion>();
        }

        // Construir la respuesta según IRutaConductorView
        const rutaConductorView: IRutaConductorView = {
            _id: String(rutaDespacho._id),
            cliente: {
                nombre: cliente?.nombre || 'Cliente no encontrado',
                direccion: direccionPrincipal?.nombre || direccionPrincipal?.direccionOriginal || 'Dirección no disponible',
                telefono: cliente?.telefono || '',
                direccionDespacho: direccionDespacho?.nombre || direccionDespacho?.direccionOriginal || direccionPrincipal?.nombre || direccionPrincipal?.direccionOriginal || 'Dirección de despacho no disponible'
            },
            comentario: ventaActual.comentario || undefined,
            quienRecibe: ventaActual.entregasEnLocal && ventaActual.entregasEnLocal.length > 0 
                ? ventaActual.entregasEnLocal[ventaActual.entregasEnLocal.length - 1].nombreRecibe || undefined
                : undefined,
            rutRecibe: ventaActual.entregasEnLocal && ventaActual.entregasEnLocal.length > 0 
                ? ventaActual.entregasEnLocal[ventaActual.entregasEnLocal.length - 1].rutRecibe || undefined
                : undefined
        };
        
        return NextResponse.json({ 
            ok: true, 
            ruta: rutaConductorView
        });

    } catch (error) {
        console.error('Error al obtener ruta asignada:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}