import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import RutaDespacho from '@/models/rutaDespacho';
import User from '@/models/user';
import Direccion from '@/models/direccion';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/utils/authOptions';
import { USER_ROLE, TIPO_ESTADO_RUTA_DESPACHO } from '@/app/utils/constants';
import { IRutaEnTransito } from '@/types/types';
import { IUser } from '@/types/user';
import { IRutaDespacho } from '@/types/rutaDespacho';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');

        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }

        await connectMongoDB();

        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = await User.findById(userId).lean<IUser>();
        
        if (!user) {
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }

        if (![USER_ROLE.conductor, USER_ROLE.cobranza, USER_ROLE.encargado, USER_ROLE.responsable].includes(user.role)) {
            return NextResponse.json({ ok: false, error: "Access denied. User is not a conductor" }, { status: 403 });
        }

        const rutaDespacho = await RutaDespacho.findById(rutaId)
            .populate({
                path: 'choferId',
                model: 'User',
                select: 'name'
            })
            .populate({
                path: 'ruta.direccionDestinoId',
                model: 'Direccion',
                select: '_id nombre'
            })
            .lean<IRutaDespacho>();

        console.log("RUTA DESPACHO ENCONTRADA:", rutaDespacho);

        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "Ruta not found" }, { status: 404 });
        }

        // Obtener la dirección destino actual (última en la ruta)
        let direccionDestino = '';
        if (rutaDespacho.ruta && rutaDespacho.ruta.length > 0) {
            const ultimaDireccion = rutaDespacho.ruta[rutaDespacho.ruta.length - 1]?.direccionDestinoId;
            if (ultimaDireccion) {
                direccionDestino = ultimaDireccion.nombre || '';
            }
        }

        const rutaEnTransito: IRutaEnTransito = {
            rutaId: String(rutaDespacho._id),
            direccionDestino,
            nombreChofer: rutaDespacho.choferId ? rutaDespacho.choferId.name : 'Desconocido'
        };

        return NextResponse.json({
            ok: true,
            rutaEnTransito
        });

    } catch (error) {
        console.error('Error al obtener ruta en tránsito:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}