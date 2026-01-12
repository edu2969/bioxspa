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
import { IRutaConductorView, ITramoView } from '@/types/types';
import mongoose from 'mongoose';
import Venta from '@/models/venta';
import Cliente from '@/models/cliente';

export async function GET() {
    try {
        console.log("GET request received for ruta asignada.");

        await connectMongoDB();
        console.log("MongoDB connected.");

        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }

        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }

        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }

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
                select: 'clienteId direccionDespachoId',
                populate: [{
                    path: 'clienteId',
                    model: 'Cliente',
                    select: 'nombre telefono'
                }, {
                    path: 'direccionDespachoId',
                    model: 'Direccion',
                    select: 'nombre'
                }]
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

        // Construir la respuesta según IRutaConductorView
        const rutaConductorView: IRutaConductorView = {
            _id: String(rutaDespacho._id),
            tramos: rutaDespacho.ruta.map((ruta): ITramoView => {
                const ventaActual = rutaDespacho.ventaIds.find(venta => 
                    String(venta.direccionDespachoId._id) === String(ruta.direccionDestinoId?._id)
                );

                return {
                    tipo: ventaActual?.tipo || 0,
                    cliente: {
                        nombre: ventaActual?.clienteId?.nombre || 'Cliente no encontrado',
                        telefono: ventaActual?.clienteId?.telefono || '',
                        direccion: ventaActual?.direccionDespachoId || { _id: '', nombre: '', latitud: 0, longitud: 0 }
                    },
                    comentario: ventaActual?.comentario || undefined,
                    quienRecibe: ventaActual?.entregasEnLocal && ventaActual?.entregasEnLocal.length > 0
                        ? ventaActual.entregasEnLocal[ventaActual.entregasEnLocal.length - 1].nombreRecibe || undefined
                        : undefined,
                    rutRecibe: ventaActual?.entregasEnLocal && ventaActual?.entregasEnLocal.length > 0
                        ? ventaActual.entregasEnLocal[ventaActual.entregasEnLocal.length - 1].rutRecibe || undefined
                        : undefined,
                    fechaArribo: ruta.fechaArribo || null
                }
            }),
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